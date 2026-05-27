/*******************************************************************************
 * Copyright (c) 2026 Obeo.
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
package org.eclipse.sirius.components.collaborative.diagrams.handlers;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.diagrams.DiagramContext;
import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramEventHandler;
import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramInput;
import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramQueryService;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogSuccessPayload;
import org.eclipse.sirius.components.collaborative.diagrams.messages.ICollaborativeDiagramMessageService;
import org.eclipse.sirius.components.collaborative.diagrams.variables.DiagramVariables;
import org.eclipse.sirius.components.core.api.ErrorPayload;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IObjectSearchService;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.core.api.IRepresentationDescriptionSearchService;
import org.eclipse.sirius.components.core.api.variables.CommonVariables;
import org.eclipse.sirius.components.diagrams.Diagram;
import org.eclipse.sirius.components.diagrams.Node;
import org.eclipse.sirius.components.diagrams.description.DiagramDescription;
import org.eclipse.sirius.components.diagrams.description.DropDialogDescriptor;
import org.eclipse.sirius.components.representations.VariableManager;
import org.springframework.stereotype.Service;

import reactor.core.publisher.Sinks.Many;
import reactor.core.publisher.Sinks.One;

/**
 * Resolves the optional dialog that must be opened before a drop on the diagram is executed.
 *
 * @author dnikiforov
 */
@Service
public class GetDropOnDiagramDialogEventHandler implements IDiagramEventHandler {

    private final IObjectSearchService objectSearchService;

    private final IDiagramQueryService diagramQueryService;

    private final IRepresentationDescriptionSearchService representationDescriptionSearchService;

    private final ICollaborativeDiagramMessageService messageService;

    public GetDropOnDiagramDialogEventHandler(IObjectSearchService objectSearchService, IDiagramQueryService diagramQueryService, IRepresentationDescriptionSearchService representationDescriptionSearchService,
            ICollaborativeDiagramMessageService messageService) {
        this.objectSearchService = Objects.requireNonNull(objectSearchService);
        this.diagramQueryService = Objects.requireNonNull(diagramQueryService);
        this.representationDescriptionSearchService = Objects.requireNonNull(representationDescriptionSearchService);
        this.messageService = Objects.requireNonNull(messageService);
    }

    @Override
    public boolean canHandle(IEditingContext editingContext, IDiagramInput diagramInput) {
        return diagramInput instanceof GetDropOnDiagramDialogInput;
    }

    @Override
    public void handle(One<IPayload> payloadSink, Many<ChangeDescription> changeDescriptionSink, IEditingContext editingContext, DiagramContext diagramContext, IDiagramInput diagramInput) {
        ChangeDescription changeDescription = new ChangeDescription(ChangeKind.NOTHING, diagramInput.representationId(), diagramInput);
        IPayload payload;

        if (diagramInput instanceof GetDropOnDiagramDialogInput input) {
            Diagram diagram = diagramContext.diagram();
            Optional<Node> targetNode = Optional.ofNullable(input.diagramTargetElementId())
                    .flatMap(id -> this.diagramQueryService.findNodeById(diagram, id));

            List<Object> droppedElements = input.objectIds().stream()
                    .map(objectId -> this.objectSearchService.getObject(editingContext, objectId))
                    .flatMap(Optional::stream)
                    .toList();

            Optional<DropDialogDescriptor> descriptor = this.representationDescriptionSearchService.findById(editingContext, diagram.getDescriptionId())
                    .filter(DiagramDescription.class::isInstance)
                    .map(DiagramDescription.class::cast)
                    .map(DiagramDescription::getDropDialogProvider)
                    .flatMap(provider -> {
                        VariableManager variableManager = new VariableManager();
                        variableManager.put(CommonVariables.EDITING_CONTEXT.name(), editingContext);
                        variableManager.put(DiagramVariables.DIAGRAM_CONTEXT.name(), diagramContext);
                        variableManager.put(DiagramVariables.SELECTED_NODE.name(), targetNode.orElse(null));
                        variableManager.put(DiagramVariables.DROPPED_ELEMENTS.name(), droppedElements);
                        return provider.apply(variableManager);
                    });

            payload = new GetDropOnDiagramDialogSuccessPayload(diagramInput.id(), descriptor);
        } else {
            String message = this.messageService.invalidInput(diagramInput.getClass().getSimpleName(), GetDropOnDiagramDialogInput.class.getSimpleName());
            payload = new ErrorPayload(diagramInput.id(), message);
        }

        payloadSink.tryEmitValue(payload);
        changeDescriptionSink.tryEmitNext(changeDescription);
    }
}
