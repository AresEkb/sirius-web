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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.diagrams.DiagramContext;
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
import org.junit.jupiter.api.Test;

import reactor.core.publisher.Sinks;

/**
 * Tests the dialog provider inputs and payload of {@link GetSingleClickToolDialogEventHandler}.
 *
 * @author dnikiforov
 */
public class GetSingleClickToolDialogEventHandlerTests {

    @Test
    public void testReturnsTheDialogForTheSelectedNodeAndTool() {
        String descriptionId = "description";
        var input = new GetSingleClickToolDialogInput(UUID.randomUUID(), "context", "diagram", "node", "tool");
        var diagram = mock(Diagram.class);
        when(diagram.getDescriptionId()).thenReturn(descriptionId);
        var context = new DiagramContext(diagram);
        IEditingContext editingContext = input::editingContextId;
        var node = mock(Node.class);
        var diagramQueries = mock(IDiagramQueryService.class);
        when(diagramQueries.findNodeById(diagram, input.diagramTargetElementId())).thenReturn(Optional.of(node));

        var descriptor = new SingleClickToolDialogDescriptor("dialog", List.of());
        var description = mock(DiagramDescription.class);
        when(description.getSingleClickToolDialogProvider()).thenReturn(variables -> {
            assertThat(variables.get(CommonVariables.EDITING_CONTEXT.name(), IEditingContext.class)).contains(editingContext);
            assertThat(variables.get(DiagramVariables.DIAGRAM_CONTEXT.name(), DiagramContext.class)).contains(context);
            assertThat(variables.get(DiagramVariables.SELECTED_NODE.name(), Node.class)).contains(node);
            assertThat(variables.get(GetSingleClickToolDialogEventHandler.TOOL_ID, String.class)).contains(input.toolId());
            return Optional.of(descriptor);
        });
        var descriptions = mock(IRepresentationDescriptionSearchService.class);
        when(descriptions.findById(editingContext, descriptionId)).thenReturn(Optional.of(description));
        var handler = new GetSingleClickToolDialogEventHandler(diagramQueries, descriptions, new ICollaborativeDiagramMessageService.NoOp());
        Sinks.One<IPayload> payload = Sinks.one();
        Sinks.Many<ChangeDescription> changes = Sinks.many().unicast().onBackpressureBuffer();

        assertThat(handler.canHandle(editingContext, input)).isTrue();
        handler.handle(payload, changes, editingContext, context, input);

        assertThat(payload.asMono().block(Duration.ofSeconds(5))).isEqualTo(new GetSingleClickToolDialogSuccessPayload(input.id(), Optional.of(descriptor)));
        assertThat(changes.asFlux().next().block(Duration.ofSeconds(5))).extracting(ChangeDescription::getKind).isEqualTo(ChangeKind.NOTHING);
    }

    @Test
    public void testRejectsUnrelatedInput() {
        var handler = new GetSingleClickToolDialogEventHandler(mock(IDiagramQueryService.class),
                new IRepresentationDescriptionSearchService.NoOp(), new ICollaborativeDiagramMessageService.NoOp());
        var input = mock(IDiagramInput.class);
        var inputId = UUID.randomUUID();
        when(input.id()).thenReturn(inputId);
        when(input.representationId()).thenReturn("unrelated-representation");
        IEditingContext editingContext = () -> "unrelated-context";
        Sinks.One<IPayload> payload = Sinks.one();
        Sinks.Many<ChangeDescription> changes = Sinks.many().unicast().onBackpressureBuffer();

        assertThat(handler.canHandle(editingContext, input)).isFalse();
        handler.handle(payload, changes, editingContext, new DiagramContext(mock(Diagram.class)), input);

        assertThat(payload.asMono().block(Duration.ofSeconds(5))).isInstanceOfSatisfying(ErrorPayload.class, error -> assertThat(error.id()).isEqualTo(inputId));
    }
}
