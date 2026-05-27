/*******************************************************************************
 * Copyright (c) 2023, 2026 Obeo.
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
package org.eclipse.sirius.components.collaborative.diagrams.dto;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramInput;
import org.eclipse.sirius.components.diagrams.layoutdata.Position;

/**
 * The input for the "drop nodes" mutation.
 *
 * <p>
 * The optional {@code variables} field carries values entered by the user in the dialog that was opened before this
 * mutation was sent. The frontend first issues the {@code DiagramDescription.dropDialog} query to ask whether a dialog
 * is required; if it is, the frontend opens the dialog, collects the values and includes them here. The values are
 * passed to the drop node handler through the variable manager. When no dialog was opened (or the diagram has no
 * dialog provider), the list is empty.
 * </p>
 *
 * @author pcdavid
 */
public record DropNodesInput(UUID id, String editingContextId, String representationId, List<String> droppedElementIds, String targetElementId, List<Position> dropPositions, List<ToolVariable> variables) implements IDiagramInput {

    public DropNodesInput {
        Objects.requireNonNull(id);
        Objects.requireNonNull(editingContextId);
        Objects.requireNonNull(representationId);
        Objects.requireNonNull(droppedElementIds);
        droppedElementIds.stream().forEach(Objects::requireNonNull);
        // targetElementId *can* be null when dropping on the diagram's background
        if (variables == null) {
            variables = List.of();
        }
    }

    public DropNodesInput(UUID id, String editingContextId, String representationId, List<String> droppedElementIds, String targetElementId, List<Position> dropPositions) {
        this(id, editingContextId, representationId, droppedElementIds, targetElementId, dropPositions, List.of());
    }
}
