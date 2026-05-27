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
 * A typed name/value pair used as initial state for the dialog opened before a drop on a diagram is executed.
 *
 * <p>
 * The {@code type} matches the values of the GraphQL {@code ToolVariableType} enum (currently {@code STRING},
 * {@code OBJECT_ID}, {@code OBJECT_ID_ARRAY}). It is a plain string at this level to avoid a dependency from
 * {@code sirius-components-diagrams} on {@code sirius-components-collaborative-diagrams}.
 * </p>
 *
 * @param name
 *         The variable name. Must not be {@code null}.
 * @param value
 *         The variable value, serialized as a string (for {@code OBJECT_ID_ARRAY} use a JSON array of ids). Must not be {@code null}.
 * @param type
 *         The variable type identifier. Must not be {@code null}.
 *
 * @author dnikiforov
 */
@PublicApi
public record DropDialogVariable(String name, String value, String type) {

    public DropDialogVariable {
        Objects.requireNonNull(name);
        Objects.requireNonNull(value);
        Objects.requireNonNull(type);
    }
}
