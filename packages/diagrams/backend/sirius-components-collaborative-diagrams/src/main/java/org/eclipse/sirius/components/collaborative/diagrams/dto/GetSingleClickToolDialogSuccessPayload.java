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
import org.eclipse.sirius.components.diagrams.description.SingleClickToolDialogDescriptor;

/**
 * The payload returning the optional dialog descriptor to open before a single click tool is executed.
 *
 * @author dnikiforov
 */
public record GetSingleClickToolDialogSuccessPayload(UUID id, Optional<SingleClickToolDialogDescriptor> descriptor) implements IPayload {
    public GetSingleClickToolDialogSuccessPayload {
        Objects.requireNonNull(id);
        Objects.requireNonNull(descriptor);
    }
}
