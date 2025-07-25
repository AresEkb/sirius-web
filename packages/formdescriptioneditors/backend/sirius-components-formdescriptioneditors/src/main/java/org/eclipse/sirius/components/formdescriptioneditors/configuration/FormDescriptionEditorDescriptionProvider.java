/*******************************************************************************
 * Copyright (c) 2022, 2025 Obeo.
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
package org.eclipse.sirius.components.formdescriptioneditors.configuration;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Predicate;

import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IEditingContextRepresentationDescriptionProvider;
import org.eclipse.sirius.components.core.api.IIdentityService;
import org.eclipse.sirius.components.formdescriptioneditors.description.FormDescriptionEditorDescription;
import org.eclipse.sirius.components.representations.IRepresentationDescription;
import org.eclipse.sirius.components.representations.VariableManager;
import org.eclipse.sirius.components.view.form.FormPackage;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the spreadsheet representation description.
 *
 * @author arichard
 */
@Configuration
public class FormDescriptionEditorDescriptionProvider implements IEditingContextRepresentationDescriptionProvider {

    private final IIdentityService identityService;

    public FormDescriptionEditorDescriptionProvider(IIdentityService identityService) {
        this.identityService = Objects.requireNonNull(identityService);
    }

    @Override
    public List<IRepresentationDescription> getRepresentationDescriptions(IEditingContext editingContext) {
        UUID id = UUID.nameUUIDFromBytes("FormDescriptionEditor".getBytes());
        String label = "FormDescriptionEditor";

        Predicate<VariableManager> canCreatePredicate = variableManager -> variableManager.get(IRepresentationDescription.CLASS, Object.class)
                .filter(FormPackage.eINSTANCE.getFormDescription()::equals)
                .isPresent();
        Function<VariableManager, String> targetObjectIdProvider = variableManager -> variableManager.get(VariableManager.SELF, Object.class)
                .map(this.identityService::getId)
                .orElse(null);

        FormDescriptionEditorDescription formDescriptionEditorDescription = FormDescriptionEditorDescription.newFormDescriptionEditorDescription(id.toString())
                .label(label)
                .targetObjectIdProvider(targetObjectIdProvider)
                .canCreatePredicate(canCreatePredicate)
                .iconURLsProvider(variableManager -> List.of())
                .build();

        return List.of(formDescriptionEditorDescription);
    }
}
