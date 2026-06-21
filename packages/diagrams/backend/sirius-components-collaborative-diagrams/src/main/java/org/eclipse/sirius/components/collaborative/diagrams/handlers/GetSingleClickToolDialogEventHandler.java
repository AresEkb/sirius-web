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

import java.util.Objects;
import java.util.Optional;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.diagrams.DiagramContext;
import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramEventHandler;
import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramInput;
import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramQueryService;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetSingleClickToolDialogInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetSingleClickToolDialogSuccessPayload;
import org.eclipse.sirius.components.collaborative.diagrams.messages.ICollaborativeDiagramMessageService;
import org.eclipse.sirius.components.collaborative.diagrams.variables.DiagramVariables;
import org.eclipse.sirius.components.core.api.ErrorPayload;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.core.api.IRepresentationDescriptionSearchService;
import org.eclipse.sirius.components.core.api.variables.CommonVariables;
import org.eclipse.sirius.components.diagrams.Diagram;
import org.eclipse.sirius.components.diagrams.Node;
import org.eclipse.sirius.components.diagrams.description.DiagramDescription;
import org.eclipse.sirius.components.diagrams.description.SingleClickToolDialogDescriptor;
import org.eclipse.sirius.components.representations.VariableManager;
import org.springframework.stereotype.Service;

import reactor.core.publisher.Sinks.Many;
import reactor.core.publisher.Sinks.One;

/**
 * Computes the optional dialog to open before a single click tool runs, by invoking the diagram description
 * {@code singleClickToolDialogProvider}.
 *
 * @author dnikiforov
 */
@Service
public class GetSingleClickToolDialogEventHandler implements IDiagramEventHandler {

    /** Name of the variable carrying the id of the tool whose dialog is being computed. */
    public static final String TOOL_ID = "toolId";

    private final IDiagramQueryService diagramQueryService;

    private final IRepresentationDescriptionSearchService representationDescriptionSearchService;

    private final ICollaborativeDiagramMessageService messageService;

    public GetSingleClickToolDialogEventHandler(IDiagramQueryService diagramQueryService, IRepresentationDescriptionSearchService representationDescriptionSearchService,
            ICollaborativeDiagramMessageService messageService) {
        this.diagramQueryService = Objects.requireNonNull(diagramQueryService);
        this.representationDescriptionSearchService = Objects.requireNonNull(representationDescriptionSearchService);
        this.messageService = Objects.requireNonNull(messageService);
    }

    @Override
    public boolean canHandle(IEditingContext editingContext, IDiagramInput diagramInput) {
        return diagramInput instanceof GetSingleClickToolDialogInput;
    }

    @Override
    public void handle(One<IPayload> payloadSink, Many<ChangeDescription> changeDescriptionSink, IEditingContext editingContext, DiagramContext diagramContext, IDiagramInput diagramInput) {
        ChangeDescription changeDescription = new ChangeDescription(ChangeKind.NOTHING, diagramInput.representationId(), diagramInput);
        IPayload payload;
        if (diagramInput instanceof GetSingleClickToolDialogInput input) {
            Diagram diagram = diagramContext.diagram();
            Optional<Node> targetNode = Optional.ofNullable(input.diagramTargetElementId())
                    .flatMap(id -> this.diagramQueryService.findNodeById(diagram, id));

            Optional<SingleClickToolDialogDescriptor> descriptor = this.representationDescriptionSearchService.findById(editingContext, diagram.getDescriptionId())
                    .filter(DiagramDescription.class::isInstance)
                    .map(DiagramDescription.class::cast)
                    .map(DiagramDescription::getSingleClickToolDialogProvider)
                    .flatMap(provider -> {
                        VariableManager variableManager = new VariableManager();
                        variableManager.put(CommonVariables.EDITING_CONTEXT.name(), editingContext);
                        variableManager.put(DiagramVariables.DIAGRAM_CONTEXT.name(), diagramContext);
                        variableManager.put(DiagramVariables.SELECTED_NODE.name(), targetNode.orElse(null));
                        variableManager.put(TOOL_ID, input.toolId());
                        return provider.apply(variableManager);
                    });
            payload = new GetSingleClickToolDialogSuccessPayload(diagramInput.id(), descriptor);
        } else {
            String message = this.messageService.invalidInput(diagramInput.getClass().getSimpleName(), GetSingleClickToolDialogInput.class.getSimpleName());
            payload = new ErrorPayload(diagramInput.id(), message);
        }
        payloadSink.tryEmitValue(payload);
        changeDescriptionSink.tryEmitNext(changeDescription);
    }
}
