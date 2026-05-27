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
package org.eclipse.sirius.components.collaborative.diagrams.dto;

import java.util.List;
import java.util.UUID;

import org.eclipse.sirius.components.collaborative.diagrams.api.IDiagramInput;

/**
 * Query input asking whether a dialog must be opened before executing a drop on a diagram.
 *
 * @author dnikiforov
 */
public record GetDropOnDiagramDialogInput(UUID id, String editingContextId, String representationId, String diagramTargetElementId, List<String> objectIds) implements IDiagramInput {
}
