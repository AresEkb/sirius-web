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

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.diagrams.description.DropDialogDescriptor;

/**
 * Result of {@link GetDropOnDiagramDialogInput}. Carries the optional dialog descriptor: when present, the frontend
 * must open the matching dialog before re-issuing the drop mutation with the values returned by the dialog. When
 * absent, the drop may proceed immediately.
 *
 * @author dnikiforov
 */
public record GetDropOnDiagramDialogSuccessPayload(UUID id, Optional<DropDialogDescriptor> descriptor) implements IPayload {

    public GetDropOnDiagramDialogSuccessPayload {
        Objects.requireNonNull(id);
        Objects.requireNonNull(descriptor);
    }
}
