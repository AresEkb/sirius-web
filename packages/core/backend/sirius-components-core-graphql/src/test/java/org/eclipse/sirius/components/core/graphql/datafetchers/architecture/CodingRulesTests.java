/*******************************************************************************
 * Copyright (c) 2021, 2024 Obeo.
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
package org.eclipse.sirius.components.core.graphql.datafetchers.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;

import org.eclipse.sirius.components.tests.architecture.AbstractCodingRulesTests;
import org.junit.jupiter.api.Test;

/**
 * Coding rules tests.
 *
 * @author arichard
 */
public class CodingRulesTests extends AbstractCodingRulesTests {

    @Override
    protected String getProjectRootPackage() {
        return ArchitectureConstants.SIRIUS_COMPONENTS_CORE_GRAPHQL_ON_ROOT_PACKAGE;
    }

    @Override
    protected JavaClasses getClasses() {
        return ArchitectureConstants.CLASSES;
    }

    @Test
    @Override
    public void noClassesShouldUseEMF() {
        super.noClassesShouldUseEMF();
    }

    @Test
    @Override
    public void noClassesShouldUseApacheCommons() {
        super.noClassesShouldUseApacheCommons();
    }
}
