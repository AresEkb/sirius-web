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

import java.util.Objects;

import org.eclipse.sirius.components.annotations.PublicApi;

/**
 * A single initial variable passed to the dialog opened before a single click tool is executed.
 *
 * @author dnikiforov
 */
@PublicApi
public record SingleClickToolDialogVariable(String name, String value, String type) {
    public SingleClickToolDialogVariable {
        Objects.requireNonNull(name);
        Objects.requireNonNull(value);
        Objects.requireNonNull(type);
    }
}
