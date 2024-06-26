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
package org.eclipse.sirius.components.papaya.spec;

import java.util.List;
import java.util.stream.Stream;

import org.eclipse.emf.common.util.EList;
import org.eclipse.emf.ecore.util.EcoreEList;
import org.eclipse.sirius.components.papaya.Component;
import org.eclipse.sirius.components.papaya.PapayaPackage;
import org.eclipse.sirius.components.papaya.impl.ProjectImpl;

/**
 * Customization of the project implementation generated by EMF.
 *
 * @author sbegaudeau
 */
public class ProjectSpec extends ProjectImpl {

    @Override
    public EList<Component> getAllComponents() {
        List<Component> allComponents = this.getComponents().stream()
                .flatMap(childComponent -> Stream.concat(
                        Stream.of(childComponent),
                        childComponent.getAllComponents().stream()
                ))
                .toList();
        return new EcoreEList.UnmodifiableEList<>(this, PapayaPackage.Literals.PROJECT__ALL_COMPONENTS, allComponents.size(), allComponents.toArray());
    }
}
