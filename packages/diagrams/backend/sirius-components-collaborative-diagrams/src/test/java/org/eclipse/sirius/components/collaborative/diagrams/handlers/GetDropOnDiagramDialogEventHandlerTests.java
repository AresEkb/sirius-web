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

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.diagrams.DiagramContext;
import org.eclipse.sirius.components.collaborative.diagrams.DiagramQueryService;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogSuccessPayload;
import org.eclipse.sirius.components.collaborative.diagrams.messages.ICollaborativeDiagramMessageService;
import org.eclipse.sirius.components.collaborative.diagrams.variables.DiagramVariables;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IObjectSearchService;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.core.api.IRepresentationDescriptionSearchService;
import org.eclipse.sirius.components.diagrams.Diagram;
import org.eclipse.sirius.components.diagrams.DiagramStyle;
import org.eclipse.sirius.components.diagrams.description.DiagramDescription;
import org.eclipse.sirius.components.diagrams.description.DropDialogDescriptor;
import org.eclipse.sirius.components.diagrams.description.DropDialogVariable;
import org.eclipse.sirius.components.representations.IRepresentationDescription;
import org.junit.jupiter.api.Test;

import reactor.core.publisher.Sinks;
import reactor.core.publisher.Sinks.Many;
import reactor.core.publisher.Sinks.One;

/**
 * Test for {@link GetDropOnDiagramDialogEventHandler}.
 *
 * @author dnikiforov
 */
public class GetDropOnDiagramDialogEventHandlerTests {

    private static final String DIAGRAM_ID = "diagramId";

    private static final String DIAGRAM_DESCRIPTION_ID = UUID.randomUUID().toString();

    private static final String OBJECT_ID = "semanticObjectId";

    private static final String DIALOG_DESCRIPTION_ID = "test.dialog";

    @Test
    public void testReturnsDescriptorWhenProviderProvidesOne() {
        Object semanticObject = new Object();

        DropDialogDescriptor expectedDescriptor = new DropDialogDescriptor(DIALOG_DESCRIPTION_ID,
                List.of(new DropDialogVariable("targetContainerId", "container", "STRING")));

        DiagramDescription diagramDescription = this.buildDiagramDescription(variableManager -> {
            List<?> droppedElements = variableManager.get(DiagramVariables.DROPPED_ELEMENTS.name(), List.class).orElse(List.of());
            if (droppedElements.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(expectedDescriptor);
        });

        IPayload payload = this.invoke(diagramDescription, semanticObject, List.of(OBJECT_ID));

        assertThat(payload).isInstanceOf(GetDropOnDiagramDialogSuccessPayload.class);
        assertThat(((GetDropOnDiagramDialogSuccessPayload) payload).descriptor()).contains(expectedDescriptor);
    }

    @Test
    public void testReturnsEmptyWhenProviderReturnsEmpty() {
        Object semanticObject = new Object();
        DiagramDescription diagramDescription = this.buildDiagramDescription(variableManager -> Optional.empty());

        IPayload payload = this.invoke(diagramDescription, semanticObject, List.of(OBJECT_ID));

        assertThat(payload).isInstanceOf(GetDropOnDiagramDialogSuccessPayload.class);
        assertThat(((GetDropOnDiagramDialogSuccessPayload) payload).descriptor()).isEmpty();
    }

    private IPayload invoke(DiagramDescription diagramDescription, Object semanticObject, List<String> objectIds) {
        Diagram diagram = Diagram.newDiagram(DIAGRAM_ID)
                .descriptionId(DIAGRAM_DESCRIPTION_ID)
                .targetObjectId("diagramTargetObjectId")
                .nodes(List.of())
                .edges(List.of())
                .style(DiagramStyle.newDiagramStyle().build())
                .build();

        IRepresentationDescriptionSearchService searchService = new IRepresentationDescriptionSearchService.NoOp() {
            @Override
            public Optional<IRepresentationDescription> findById(IEditingContext editingContext, String id) {
                return Optional.of(diagramDescription);
            }
        };

        IObjectSearchService objectSearchService = new IObjectSearchService.NoOp() {
            @Override
            public Optional<Object> getObject(IEditingContext editingContext, String objectId) {
                if (objectIds.contains(objectId)) {
                    return Optional.of(semanticObject);
                }
                return Optional.empty();
            }
        };

        var handler = new GetDropOnDiagramDialogEventHandler(objectSearchService, new DiagramQueryService(), searchService, new ICollaborativeDiagramMessageService.NoOp());

        var input = new GetDropOnDiagramDialogInput(UUID.randomUUID(), "editingContextId", DIAGRAM_ID, null, objectIds);
        assertThat(handler.canHandle(null, input)).isTrue();

        One<IPayload> payloadSink = Sinks.one();
        Many<ChangeDescription> changeDescriptionSink = Sinks.many().unicast().onBackpressureBuffer();
        IEditingContext editingContext = () -> "editingContextId";
        handler.handle(payloadSink, changeDescriptionSink, editingContext, new DiagramContext(diagram), input);

        return payloadSink.asMono().block();
    }

    private DiagramDescription buildDiagramDescription(java.util.function.Function<org.eclipse.sirius.components.representations.VariableManager, Optional<DropDialogDescriptor>> dropDialogProvider) {
        return DiagramDescription.newDiagramDescription(DIAGRAM_DESCRIPTION_ID)
                .label("")
                .canCreatePredicate(variableManager -> true)
                .targetObjectIdProvider(variableManager -> "diagramTargetObjectId")
                .labelProvider(variableManager -> "Diagram")
                .nodeDescriptions(List.of())
                .edgeDescriptions(List.of())
                .dropHandler(variableManager -> new org.eclipse.sirius.components.representations.Failure(""))
                .dropDialogProvider(dropDialogProvider)
                .iconURLsProvider(variableManager -> List.of())
                .styleProvider(variableManager -> DiagramStyle.newDiagramStyle().build())
                .decoratorDescriptions(List.of())
                .layoutOption(org.eclipse.sirius.components.diagrams.description.DiagramLayoutOption.NONE)
                .build();
    }
}
