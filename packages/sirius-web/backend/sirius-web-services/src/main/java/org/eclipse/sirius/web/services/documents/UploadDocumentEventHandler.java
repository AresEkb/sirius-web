/*******************************************************************************
 * Copyright (c) 2019, 2024 Obeo.
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *     Obeo - initial API and implementation
 *******************************************************************************/
package org.eclipse.sirius.web.services.documents;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.StreamSupport;

import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.emf.edit.domain.AdapterFactoryEditingDomain;
import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.api.IEditingContextEventHandler;
import org.eclipse.sirius.components.collaborative.api.Monitoring;
import org.eclipse.sirius.components.core.api.ErrorPayload;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IInput;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.emf.ResourceMetadataAdapter;
import org.eclipse.sirius.components.emf.services.JSONResourceFactory;
import org.eclipse.sirius.components.emf.services.api.IEMFEditingContext;
import org.eclipse.sirius.components.graphql.api.UploadFile;
import org.eclipse.sirius.emfjson.resource.JsonResource;
import org.eclipse.sirius.web.services.api.document.Document;
import org.eclipse.sirius.web.services.api.document.IDocumentService;
import org.eclipse.sirius.web.services.api.document.UploadDocumentInput;
import org.eclipse.sirius.web.services.api.document.UploadDocumentSuccessPayload;
import org.eclipse.sirius.web.services.api.projects.Nature;
import org.eclipse.sirius.web.services.documents.api.IExternalResourceLoaderService;
import org.eclipse.sirius.web.services.documents.api.IUploadDocumentReportProvider;
import org.eclipse.sirius.web.services.messages.IServicesMessageService;
import org.eclipse.sirius.web.services.projects.api.IEditingContextMetadataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import reactor.core.publisher.Sinks.Many;
import reactor.core.publisher.Sinks.One;

/**
 * Event handler used to create a new document from a file upload.
 *
 * @author sbegaudeau
 */
@Service
public class UploadDocumentEventHandler implements IEditingContextEventHandler {

    private final Logger logger = LoggerFactory.getLogger(UploadDocumentEventHandler.class);

    private final IDocumentService documentService;

    private final IServicesMessageService messageService;

    private final IEditingContextMetadataProvider editingContextMetadataProvider;

    private final List<IExternalResourceLoaderService> externalResourceLoaderServices;

    private final List<IUploadDocumentReportProvider> uploadDocumentReportProviders;

    private final Counter counter;

    public UploadDocumentEventHandler(IDocumentService documentService, IServicesMessageService messageService, IEditingContextMetadataProvider editingContextMetadataProvider,
                                      List<IExternalResourceLoaderService> externalResourceLoaderServices, List<IUploadDocumentReportProvider> uploadDocumentReportProviders, MeterRegistry meterRegistry) {
        this.documentService = Objects.requireNonNull(documentService);
        this.messageService = Objects.requireNonNull(messageService);
        this.editingContextMetadataProvider = Objects.requireNonNull(editingContextMetadataProvider);
        this.externalResourceLoaderServices = Objects.requireNonNull(externalResourceLoaderServices);
        this.uploadDocumentReportProviders = Objects.requireNonNull(uploadDocumentReportProviders);
        this.counter = Counter.builder(Monitoring.EVENT_HANDLER)
                .tag(Monitoring.NAME, this.getClass().getSimpleName())
                .register(meterRegistry);
    }

    @Override
    public boolean canHandle(IEditingContext editingContext, IInput input) {
        return input instanceof UploadDocumentInput;
    }

    @Override
    public void handle(One<IPayload> payloadSink, Many<ChangeDescription> changeDescriptionSink, IEditingContext editingContext, IInput input) {
        this.counter.increment();

        IPayload payload = new ErrorPayload(input.id(), this.messageService.unexpectedError());
        ChangeDescription changeDescription = new ChangeDescription(ChangeKind.NOTHING, editingContext.getId(), input);

        if (input instanceof UploadDocumentInput uploadDocumentInput) {

            String projectId = uploadDocumentInput.editingContextId();
            UploadFile file = uploadDocumentInput.file();

            Optional<AdapterFactoryEditingDomain> optionalEditingDomain = Optional.of(editingContext)
                    .filter(IEMFEditingContext.class::isInstance)
                    .map(IEMFEditingContext.class::cast)
                    .map(IEMFEditingContext::getDomain);

            String name = file.getName().trim();
            if (optionalEditingDomain.isPresent()) {
                AdapterFactoryEditingDomain adapterFactoryEditingDomain = optionalEditingDomain.get();

                Optional<String> contentOpt = this.getContent(adapterFactoryEditingDomain, file, uploadDocumentInput.checkProxies(), projectId);
                var optionalDocument = contentOpt.flatMap(content -> this.documentService.createDocument(projectId, name, content));

                if (optionalDocument.isPresent()) {
                    Document document = optionalDocument.get();
                    ResourceSet resourceSet = adapterFactoryEditingDomain.getResourceSet();
                    URI uri = new JSONResourceFactory().createResourceURI(document.getId().toString());

                    if (resourceSet.getResource(uri, false) == null) {

                        ResourceSet loadingResourceSet = new ResourceSetImpl();
                        loadingResourceSet.setPackageRegistry(resourceSet.getPackageRegistry());

                        JsonResource resource = new JSONResourceFactory().createResource(uri);
                        loadingResourceSet.getResources().add(resource);
                        try (var inputStream = new ByteArrayInputStream(document.getContent().getBytes())) {
                            resource.load(inputStream, null);
                        } catch (IOException exception) {
                            this.logger.warn(exception.getMessage(), exception);
                        }

                        resource.eAdapters().add(new ResourceMetadataAdapter(name));
                        resourceSet.getResources().add(resource);

                        String report = this.getReport(resource);
                        payload = new UploadDocumentSuccessPayload(input.id(), document, report);
                        changeDescription = new ChangeDescription(ChangeKind.SEMANTIC_CHANGE, editingContext.getId(), input);
                    }
                }
            }
        }

        payloadSink.tryEmitValue(payload);
        changeDescriptionSink.tryEmitNext(changeDescription);
    }

    private String getReport(Resource resource) {
        String report = null;
        var optionalReport = this.uploadDocumentReportProviders.stream()
                .filter(provider -> provider.canHandle(resource))
                .findFirst();
        if (optionalReport.isPresent()) {
            report = optionalReport.get().createReport(resource);
        }
        return report;
    }

    private Optional<String> getContent(AdapterFactoryEditingDomain adapterFactoryEditingDomain, UploadFile file, boolean checkProxies, String editingContextId) {
        var isStudioProjectNature = this.editingContextMetadataProvider.getMetadata(editingContextId).natures().stream().map(Nature::natureId)
                .anyMatch("siriusComponents://nature?kind=studio"::equals);
        String fileName = file.getName();
        Optional<String> content = Optional.empty();
        ResourceSet resourceSet = new ResourceSetImpl();
        resourceSet.setPackageRegistry(adapterFactoryEditingDomain.getResourceSet().getPackageRegistry());
        if (isStudioProjectNature) {
            this.loadStudioColorPalettes(resourceSet);
        }
        try (var inputStream = file.getInputStream()) {
            URI resourceURI = new JSONResourceFactory().createResourceURI(fileName);
            Optional<Resource> optionalInputResource = this.getResource(inputStream, resourceURI, resourceSet, adapterFactoryEditingDomain);
            if (optionalInputResource.isPresent()) {
                Resource inputResource = optionalInputResource.get();

                if (checkProxies && this.containsProxies(inputResource)) {
                    this.logger.warn("The resource {} contains unresolvable proxies and will not be uploaded.", fileName);
                } else {
                    JsonResource ouputResource = new JSONResourceFactory().createResourceFromPath(fileName);
                    resourceSet.getResources().add(ouputResource);
                    ouputResource.getContents().addAll(inputResource.getContents());

                    try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        Map<String, Object> saveOptions = new HashMap<>();
                        saveOptions.put(JsonResource.OPTION_ENCODING, JsonResource.ENCODING_UTF_8);
                        saveOptions.put(JsonResource.OPTION_SCHEMA_LOCATION, Boolean.TRUE);
                        saveOptions.put(JsonResource.OPTION_ID_MANAGER, new EObjectRandomIDManager());

                        ouputResource.save(outputStream, saveOptions);

                        content = Optional.of(outputStream.toString());
                    }
                }
            }
        } catch (IOException exception) {
            this.logger.warn(exception.getMessage(), exception);
        }
        return content;
    }

    private boolean containsProxies(Resource resource) {
        Iterable<EObject> iterable = () -> EcoreUtil.getAllProperContents(resource, false);
        return StreamSupport.stream(iterable.spliterator(), false)
            .anyMatch(eObject -> eObject.eClass().getEAllReferences().stream()
                    .filter(ref -> !ref.isContainment() && eObject.eIsSet(ref))
                    .anyMatch(ref -> {
                        boolean containsAProxy = false;
                        Object value = eObject.eGet(ref);
                        if (ref.isMany()) {
                            List<?> list = (List<?>) value;
                            containsAProxy = list.stream()
                                    .filter(EObject.class::isInstance)
                                    .map(EObject.class::cast)
                                    .anyMatch(EObject::eIsProxy);
                        } else if (value instanceof EObject eObjectValue) {
                            containsAProxy = eObjectValue.eIsProxy();
                        }
                        return containsAProxy;
                    }));
    }

    /**
     * Returns the {@link Resource} with the given {@link URI} or {@link Optional#empty()}.
     *
     * @param inputStream
     *            The {@link InputStream} used to determine which {@link Resource} to create
     * @param resourceURI
     *            The {@link URI} to use to create the {@link Resource}
     * @param resourceSet
     *            The {@link ResourceSet} used to store the loaded resource
     * @param adapterFactoryEditingDomain
     *            The {@link AdapterFactoryEditingDomain} used by the project.
     * @return a {@link Resource} or {@link Optional#empty()}
     */
    private Optional<Resource> getResource(InputStream inputStream, URI resourceURI, ResourceSet resourceSet, AdapterFactoryEditingDomain adapterFactoryEditingDomain) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            inputStream.transferTo(baos);
        } catch (IOException exception) {
            this.logger.warn(exception.getMessage(), exception);
        }
        return this.externalResourceLoaderServices.stream()
                .filter(loader -> loader.canHandle(new ByteArrayInputStream(baos.toByteArray()), resourceURI, resourceSet))
                .findFirst()
                .flatMap(loader -> loader.getResource(new ByteArrayInputStream(baos.toByteArray()), resourceURI, resourceSet, adapterFactoryEditingDomain));
    }

    private void loadStudioColorPalettes(ResourceSet resourceSet) {
        ClassPathResource classPathResource = new ClassPathResource("studioColorPalettes.json");
        URI uri = URI.createURI(IEMFEditingContext.RESOURCE_SCHEME + ":///" + UUID.nameUUIDFromBytes(classPathResource.getPath().getBytes()));
        Resource resource = new JSONResourceFactory().createResource(uri);
        try (var inputStream = new ByteArrayInputStream(classPathResource.getContentAsByteArray())) {
            resourceSet.getResources().add(resource);
            resource.load(inputStream, null);
            resource.eAdapters().add(new ResourceMetadataAdapter("studioColorPalettes"));
        } catch (IOException exception) {
            this.logger.warn("An error occured while loading document studioColorPalettes.json: {}.", exception.getMessage());
            resourceSet.getResources().remove(resource);
        }
    }

}
