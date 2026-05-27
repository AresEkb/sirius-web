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
package org.eclipse.sirius.components.diagrams.description;

import java.util.List;

import org.eclipse.sirius.components.annotations.PublicApi;

/**
 * Describes a dialog that must be opened before a drop on a diagram is executed.
 *
 * <p>
 * Returned by {@link DiagramDescription#getDropDialogProvider()} when the contributor wants to ask the user for
 * additional input (for example, the type of a relationship to create alongside the dropped element) before the
 * drop handler runs. The {@code dialogDescriptionId} is matched against the contributions registered on the frontend
 * to render a dialog. The {@code initialVariables} are passed to the dialog as its initial state, and the values
 * returned by the dialog are forwarded back to the drop handler in a second invocation of the drop mutation.
 * </p>
 *
 * @param dialogDescriptionId
 *         The identifier of the dialog contribution to render. Must not be {@code null}.
 * @param initialVariables
 *         The variables passed to the dialog as its initial state. Must not be {@code null}.
 *
 * @author dnikiforov
 */
@PublicApi
public record DropDialogDescriptor(String dialogDescriptionId, List<DropDialogVariable> initialVariables) {

    public DropDialogDescriptor {
        java.util.Objects.requireNonNull(dialogDescriptionId);
        java.util.Objects.requireNonNull(initialVariables);
    }
}
