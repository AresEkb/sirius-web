/*******************************************************************************
 * Copyright (c) 2024, 2025 Obeo.
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
package org.eclipse.sirius.web.papaya.services;

import java.util.Objects;

import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IEditingContextProcessor;
import org.eclipse.sirius.components.papaya.PapayaPackage;
import org.eclipse.sirius.web.application.editingcontext.EditingContext;
import org.eclipse.sirius.web.domain.boundedcontexts.project.Nature;
import org.eclipse.sirius.web.domain.boundedcontexts.project.services.api.IProjectSearchService;
import org.eclipse.sirius.web.papaya.services.api.IPapayaViewProvider;
import org.springframework.stereotype.Service;

/**
 * Used to initialize the editing context of a papaya project.
 *
 * @author sbegaudeau
 */
@Service
public class PapayaEditingContextInitializer implements IEditingContextProcessor {

    private final IProjectSearchService projectSearchService;

    private final IPapayaViewProvider papayaViewProvider;

    public PapayaEditingContextInitializer(IProjectSearchService projectSearchService, IPapayaViewProvider papayaViewProvider) {
        this.projectSearchService = Objects.requireNonNull(projectSearchService);
        this.papayaViewProvider = Objects.requireNonNull(papayaViewProvider);
    }

    @Override
    public void preProcess(IEditingContext editingContext) {
        var isPapayaProject = this.projectSearchService.findById(editingContext.getId())
                .filter(project -> project.getNatures().stream()
                        .map(Nature::name)
                        .anyMatch(PapayaProjectTemplateProvider.PAPAYA_NATURE::equals))
                .isPresent();

        if (isPapayaProject && editingContext instanceof EditingContext emfEditingContext) {
            var packageRegistry = emfEditingContext.getDomain().getResourceSet().getPackageRegistry();
            packageRegistry.put(PapayaPackage.eNS_URI, PapayaPackage.eINSTANCE);

            emfEditingContext.getViews().add(this.papayaViewProvider.create());
        }
    }
}
