/*******************************************************************************
 * Copyright (c) 2019, 2026 Obeo and others.
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
import java.util.UUID;

import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramInput;

/**
 * The input for the "drop on diagram" mutation.
 *
 * <p>
 * The optional {@code variables} field carries values entered by the user in the dialog that was opened before this
 * mutation was sent. The frontend first issues the {@code DiagramDescription.dropDialog} query to ask whether a dialog
 * is required; if it is, the frontend opens the dialog, collects the values and includes them here. The values are
 * passed to the drop handler through the variable manager. When no dialog was opened (or the diagram has no dialog
 * provider), the list is empty.
 * </p>
 *
 * @author hmarchadour
 */
public record DropOnDiagramInput(UUID id, String editingContextId, String representationId, String diagramTargetElementId, List<String> objectIds, double startingPositionX, double startingPositionY,
        List<ToolVariable> variables) implements IDiagramInput {

    public DropOnDiagramInput {
        if (variables == null) {
            variables = List.of();
        }
    }

    public DropOnDiagramInput(UUID id, String editingContextId, String representationId, String diagramTargetElementId, List<String> objectIds, double startingPositionX, double startingPositionY) {
        this(id, editingContextId, representationId, diagramTargetElementId, objectIds, startingPositionX, startingPositionY, List.of());
    }
}
