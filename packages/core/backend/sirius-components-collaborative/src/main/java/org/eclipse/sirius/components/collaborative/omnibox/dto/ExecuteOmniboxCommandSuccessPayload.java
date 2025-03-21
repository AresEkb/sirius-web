/*******************************************************************************
 * Copyright (c) 2025 Obeo.
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
package org.eclipse.sirius.components.collaborative.omnibox.dto;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.representations.Message;
import org.eclipse.sirius.components.representations.WorkbenchSelection;

/**
 * Used to indicate that a command has been successfully executed.
 *
 * @author sbegaudeau
 */
public record ExecuteOmniboxCommandSuccessPayload(UUID id, WorkbenchSelection newSelection, List<Message> messages) implements IPayload {
    public ExecuteOmniboxCommandSuccessPayload {
        Objects.requireNonNull(id);
        Objects.requireNonNull(messages);
    }
}
