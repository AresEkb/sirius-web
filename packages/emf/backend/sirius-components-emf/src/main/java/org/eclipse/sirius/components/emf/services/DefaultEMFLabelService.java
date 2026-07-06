/*******************************************************************************
 * Copyright (c) 2025, 2026 Obeo.
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
package org.eclipse.sirius.components.emf.services;

import java.net.URL;
import java.util.Collection;
import java.util.List;
import java.util.MissingResourceException;
import java.util.Objects;

import org.eclipse.emf.common.notify.AdapterFactory;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.edit.domain.AdapterFactoryEditingDomain;
import org.eclipse.emf.edit.provider.ComposedAdapterFactory;
import org.eclipse.emf.edit.provider.ComposedAdapterFactory.Descriptor;
import org.eclipse.emf.edit.provider.ComposedImage;
import org.eclipse.emf.edit.provider.IItemLabelProvider;
import org.eclipse.emf.edit.provider.ReflectiveItemProvider;
import org.eclipse.sirius.components.core.api.labels.StyledString;
import org.eclipse.sirius.components.emf.services.api.IDefaultEMFLabelService;
import org.eclipse.sirius.components.emf.services.api.IDefaultLabelFeatureProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * The default implementation used to manipulate the label of EMF objects.
 *
 * @author sbegaudeau
 */
@Service
public class DefaultEMFLabelService implements IDefaultEMFLabelService {

    private final List<Descriptor> composedAdapterFactoryDescriptors;

    private final IDefaultLabelFeatureProvider defaultLabelFeatureProvider;

    private final Logger logger = LoggerFactory.getLogger(DefaultEMFLabelService.class);

    public DefaultEMFLabelService(List<Descriptor> composedAdapterFactoryDescriptors, IDefaultLabelFeatureProvider defaultLabelFeatureProvider) {
        this.composedAdapterFactoryDescriptors = Objects.requireNonNull(composedAdapterFactoryDescriptors);
        this.defaultLabelFeatureProvider = Objects.requireNonNull(defaultLabelFeatureProvider);
    }

    @Override
    public StyledString getStyledLabel(EObject self) {
        var label = this.defaultLabelFeatureProvider.getDefaultLabelEAttribute(self)
                .map(self::eGet)
                .map(Object::toString)
                .orElse("");
        if (label.isBlank()) {
            label = self.eClass().getName();
        }
        return StyledString.of(label);
    }

    @Override
    public List<String> getImagePaths(EObject self) {
        if (AdapterFactoryEditingDomain.getEditingDomainFor(self) instanceof AdapterFactoryEditingDomain editingDomain) {
            return this.imagePaths(editingDomain.getAdapterFactory(), self);
        }
        // No editing domain (e.g. a transient object): fall back to a throwaway
        // factory, disposed straight away so its item providers do not stay
        // attached to the object.
        List<AdapterFactory> adapterFactories = this.composedAdapterFactoryDescriptors.stream()
                .map(Descriptor::createAdapterFactory)
                .toList();
        var composedAdapterFactory = new ComposedAdapterFactory(adapterFactories);
        try {
            return this.imagePaths(composedAdapterFactory, self);
        } finally {
            composedAdapterFactory.dispose();
        }
    }

    /**
     * Resolves the item-provider icon of the object through the given adapter
     * factory. Reusing the editing domain's own factory - rather than building
     * one per call - keeps this off the per-object allocation path that dominates
     * navigation over a large model.
     *
     * @param adapterFactory the adapter factory to resolve the item provider with
     * @param self the object to get the icon of
     * @return the icon paths, or the default icon when none applies
     */
    private List<String> imagePaths(AdapterFactory adapterFactory, EObject self) {
        var adapter = adapterFactory.adapt(self, IItemLabelProvider.class);
        if (adapter instanceof IItemLabelProvider labelProvider && !(adapter instanceof ReflectiveItemProvider)) {
            try {
                List<String> imageFullPath = this.findImagePath(labelProvider.getImage(self));
                if (imageFullPath != null) {
                    return imageFullPath.stream().map(this::getImageRelativePath).toList();
                }
            } catch (MissingResourceException exception) {
                this.logger.atWarn()
                        .setMessage("Missing icon for {}")
                        .addArgument(self)
                        .log();
            }
        }
        return List.of("/icons/svg/Default.svg");
    }

    private List<String> findImagePath(Object image) {
        List<String> imagePath = null;
        if (image instanceof URI uri) {
            imagePath = List.of(uri.toString());
        } else if (image instanceof URL url) {
            imagePath = List.of(url.toString());
        } else if (image instanceof ComposedImage composite) {
            imagePath = composite.getImages().stream()
                    .map(this::findImagePath)
                    .flatMap(Collection::stream)
                    .filter(Objects::nonNull)
                    .toList();
        }
        return imagePath;
    }

    private String getImageRelativePath(String imageFullPath) {
        String imageRelativePath = null;
        String[] uriSplit = imageFullPath.split("!");
        if (uriSplit.length > 1) {
            imageRelativePath = uriSplit[uriSplit.length - 1];
        } else {
            // in development mode, when the image is not contained in a jar
            uriSplit = imageFullPath.split("target/classes");
            if (uriSplit.length > 1) {
                imageRelativePath = uriSplit[uriSplit.length - 1];
            }
        }
        return imageRelativePath;
    }
}
