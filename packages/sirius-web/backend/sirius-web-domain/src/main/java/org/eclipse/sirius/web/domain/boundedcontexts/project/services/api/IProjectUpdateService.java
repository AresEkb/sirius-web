/*******************************************************************************
 * Copyright (c) 2024 Obeo.
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
package org.eclipse.sirius.web.domain.boundedcontexts.project.services.api;

import java.util.UUID;

import org.eclipse.sirius.web.domain.services.IResult;

/**
 * Used to update projects.
 *
 * @author sbegaudeau
 */
public interface IProjectUpdateService {
    IResult<Void> renameProject(UUID projectId, String newName);

    IResult<Void> addNature(UUID projectId, String natureName);

    IResult<Void> removeNature(UUID projectId, String natureName);
}
