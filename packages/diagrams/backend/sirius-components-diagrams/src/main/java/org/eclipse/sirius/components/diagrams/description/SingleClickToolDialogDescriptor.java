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
import java.util.Objects;

import org.eclipse.sirius.components.annotations.PublicApi;

/**
 * Describes the dialog to open before a single click tool is executed, along with the initial variables computed on the
 * server (such as the choices to present), mirroring the drop dialog mechanism for palette tools.
 *
 * @author dnikiforov
 */
@PublicApi
public record SingleClickToolDialogDescriptor(String dialogDescriptionId, List<SingleClickToolDialogVariable> initialVariables) {
    public SingleClickToolDialogDescriptor {
        Objects.requireNonNull(dialogDescriptionId);
        Objects.requireNonNull(initialVariables);
    }
}
