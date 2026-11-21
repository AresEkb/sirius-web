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
package org.eclipse.sirius.web.application.undo.services.recorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.diagrams.dto.DiagramLayoutDataInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.EdgeLayoutDataInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.LabelLayoutDataInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.LayoutDiagramInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.NodeLayoutDataInput;
import org.eclipse.sirius.components.collaborative.representations.change.IRepresentationChange;
import org.eclipse.sirius.components.diagrams.Diagram;
import org.eclipse.sirius.components.diagrams.layoutdata.DiagramLayoutData;
import org.eclipse.sirius.components.diagrams.layoutdata.NodeLayoutData;
import org.eclipse.sirius.components.diagrams.layoutdata.Position;
import org.eclipse.sirius.components.diagrams.layoutdata.Size;
import org.eclipse.sirius.web.application.editingcontext.EditingContext;
import org.eclipse.sirius.web.application.undo.services.changes.DiagramEdgeLayoutChange;
import org.eclipse.sirius.web.application.undo.services.changes.DiagramLabelLayoutChange;
import org.eclipse.sirius.web.application.undo.services.changes.DiagramNodeLayoutChange;
import org.junit.jupiter.api.Test;

/**
 * The first client layout of newly created views belongs to the creation step too.
 *
 * @author dnikiforov
 */
public class DiagramLayoutChangeRecorderTests {

    private static final String NODE_ID = "node";

    private static final String CONTEXT_ID = "context";

    private static final String DIAGRAM_ID = "diagram";

    @Test
    public void testInitialLayoutIsRecordedForRedoWithoutInventingUndoGeometry() {
        var editingContext = mock(EditingContext.class);
        Map<UUID, List<IRepresentationChange>> changes = new HashMap<>();
        when(editingContext.getInputId2RepresentationChanges()).thenReturn(changes);
        var diagram = mock(Diagram.class);
        when(diagram.getLayoutData()).thenReturn(new DiagramLayoutData(Map.of(), Map.of(), Map.of(), false));
        var node = new NodeLayoutDataInput(NODE_ID, new Position(400, 250), new Size(150, 70), false, true, List.of(), new Size(100, 50));
        var label = new LabelLayoutDataInput("label", new Position(410, 260), new Size(80, 20), false, false);
        var edge = new EdgeLayoutDataInput("edge", List.of(new Position(450, 280)), List.of(), List.of());
        var input = new LayoutDiagramInput(UUID.randomUUID(), CONTEXT_ID, DIAGRAM_ID, "refresh",
                new DiagramLayoutDataInput(List.of(node), List.of(edge), List.of(label), null));

        new DiagramLayoutChangeRecorder().accept(editingContext, diagram, List.of(), List.of(), List.of(),
                new ChangeDescription(ChangeKind.NOTHING, CONTEXT_ID, input));

        assertThat(changes.get(input.id())).hasSize(3);
        assertThat(changes.get(input.id()).get(0)).isInstanceOfSatisfying(DiagramNodeLayoutChange.class, change -> {
            assertThat(change.undoEvents()).isEmpty();
            assertThat(change.redoChanges()).hasSize(1);
            assertThat(change.redoChanges().get(0).nodeLayoutData().position()).isEqualTo(node.position());
            assertThat(change.redoChanges().get(0).nodeLayoutData().size()).isEqualTo(node.size());
        });
        assertThat(changes.get(input.id()).get(1)).isInstanceOfSatisfying(DiagramLabelLayoutChange.class, change -> {
            assertThat(change.undoChanges()).isEmpty();
            assertThat(change.redoChanges()).hasSize(1);
        });
        assertThat(changes.get(input.id()).get(2)).isInstanceOfSatisfying(DiagramEdgeLayoutChange.class, change -> {
            assertThat(change.undoChanges()).isEmpty();
            assertThat(change.redoChanges()).hasSize(1);
        });
    }
    @Test
    public void testExistingNodeLayoutKeepsBothDirectionsAndUnchangedLayoutAddsNothing() {
        var editingContext = mock(EditingContext.class);
        Map<UUID, List<IRepresentationChange>> changes = new HashMap<>();
        when(editingContext.getInputId2RepresentationChanges()).thenReturn(changes);
        var diagram = mock(Diagram.class);
        var previous = new NodeLayoutData(NODE_ID, new Position(100, 200), new Size(150, 70), false, true, List.of(), new Size(100, 50));
        when(diagram.getLayoutData()).thenReturn(new DiagramLayoutData(Map.of(NODE_ID, previous), Map.of(), Map.of(), false));
        var recorder = new DiagramLayoutChangeRecorder();
        var step = UUID.randomUUID();
        var unchanged = new NodeLayoutDataInput(NODE_ID, previous.position(), previous.size(), false, true, List.of(), previous.minComputedSize());
        var unchangedInput = new LayoutDiagramInput(step, CONTEXT_ID, DIAGRAM_ID, "refresh",
                new DiagramLayoutDataInput(List.of(unchanged), List.of(), List.of(), null));
        recorder.accept(editingContext, diagram, List.of(), List.of(), List.of(),
                new ChangeDescription(ChangeKind.NOTHING, CONTEXT_ID, unchangedInput));
        assertThat(changes).isEmpty();

        var moved = new NodeLayoutDataInput(NODE_ID, new Position(400, 250), new Size(180, 90), true, true, List.of(), previous.minComputedSize());
        var movedInput = new LayoutDiagramInput(step, CONTEXT_ID, DIAGRAM_ID, "layout",
                new DiagramLayoutDataInput(List.of(moved), List.of(), List.of(), null));
        recorder.accept(editingContext, diagram, List.of(), List.of(), List.of(),
                new ChangeDescription(ChangeKind.NOTHING, CONTEXT_ID, movedInput));
        assertThat(changes.get(step)).singleElement().isInstanceOfSatisfying(DiagramNodeLayoutChange.class, change -> {
            assertThat(change.undoEvents()).singleElement().satisfies(event -> assertThat(event.nodeLayoutData()).isEqualTo(previous));
            assertThat(change.redoChanges()).singleElement().satisfies(event -> {
                assertThat(event.nodeLayoutData().position()).isEqualTo(moved.position());
                assertThat(event.nodeLayoutData().size()).isEqualTo(moved.size());
            });
        });
        // A subsequent initial layout on the same input appends rather than discarding the earlier record.
        when(diagram.getLayoutData()).thenReturn(new DiagramLayoutData(Map.of(), Map.of(), Map.of(), false));
        recorder.accept(editingContext, diagram, List.of(), List.of(), List.of(),
                new ChangeDescription(ChangeKind.NOTHING, CONTEXT_ID, movedInput));
        assertThat(changes.get(step)).hasSize(2);
    }

}
