/*******************************************************************************
 * Copyright (c) 2023, 2025 Obeo.
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
package org.eclipse.sirius.components.view.emf.gantt;

import java.util.Objects;

import org.eclipse.emf.ecore.EObject;
import org.eclipse.sirius.components.core.api.IIdentityService;
import org.eclipse.sirius.components.view.gantt.GanttDescription;
import org.eclipse.sirius.components.view.gantt.TaskDescription;
import org.springframework.stereotype.Service;

/**
 * descriptionID for GanttDescription.
 *
 * @author lfasani
 */
@Service
@SuppressWarnings("checkstyle:MultipleStringLiterals")
public class GanttIdProvider implements IGanttIdProvider {

    private final IIdentityService identityService;

    public GanttIdProvider(IIdentityService identityService) {
        this.identityService = Objects.requireNonNull(identityService);
    }

    @Override
    public String getId(GanttDescription ganttDescription) {
        String sourceId = this.getSourceIdFromElementDescription(ganttDescription);
        String sourceElementId = this.identityService.getId(ganttDescription);
        return GANTT_DESCRIPTION_KIND + "&" + SOURCE_KIND + "=" + VIEW_SOURCE_KIND + "&" + SOURCE_ID + "=" + sourceId + "&" + SOURCE_ELEMENT_ID + "=" + sourceElementId;
    }

    @Override
    public String getId(TaskDescription taskDescription) {
        String sourceId = this.getSourceIdFromElementDescription(taskDescription);
        String sourceElementId = this.identityService.getId(taskDescription);
        return TASK_DESCRIPTION_KIND + "?" + SOURCE_KIND + "=" + VIEW_SOURCE_KIND + "&" + SOURCE_ID + "=" + sourceId + "&" + SOURCE_ELEMENT_ID + "=" + sourceElementId;
    }

    private String getSourceIdFromElementDescription(EObject elementDescription) {
        return elementDescription.eResource().getURI().toString().split("///")[1];
    }
}
