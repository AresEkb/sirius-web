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
package org.eclipse.sirius.components.diagrams.renderer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;

import org.eclipse.sirius.components.diagrams.Diagram;
import org.eclipse.sirius.components.diagrams.DiagramStyle;
import org.eclipse.sirius.components.diagrams.components.DiagramComponent;
import org.eclipse.sirius.components.diagrams.components.DiagramComponentProps;
import org.eclipse.sirius.components.diagrams.description.DiagramDescription;
import org.eclipse.sirius.components.diagrams.description.DiagramLayoutOption;
import org.eclipse.sirius.components.representations.Element;
import org.eclipse.sirius.components.representations.Failure;
import org.eclipse.sirius.components.representations.IOperationValidator;
import org.eclipse.sirius.components.representations.VariableManager;
import org.junit.jupiter.api.Test;

/**
 * Configuration snapshots must follow model refreshes and survive geometry-only copies.
 *
 * @author denis
 */
class PaletteConfigurationTests {

    private static final String VIEWPOINT = "viewpoint";

    private static final String ALL = "all";

    private static final String APPLICATION = "application";

    @Test
    void refreshesConfigurationAndPreservesItInCopies() {
        var variables = new VariableManager();
        variables.put(VIEWPOINT, ALL);
        var description = DiagramDescription.newDiagramDescription(this.description())
                .paletteConfigurationKeyProvider(manager -> manager.get(VIEWPOINT, String.class).orElseThrow())
                .build();
        // Description copies must retain the provider as well.
        description = DiagramDescription.newDiagramDescription(description).build();
        var initial = this.render(description, variables, Optional.empty());
        assertThat(initial.getPaletteConfigurationKey()).isEqualTo(ALL);
        variables.put(VIEWPOINT, APPLICATION);
        var refreshed = this.render(description, variables, Optional.of(initial));
        assertThat(refreshed.getPaletteConfigurationKey()).isEqualTo(APPLICATION);
        assertThat(Diagram.newDiagram(refreshed).build().getPaletteConfigurationKey()).isEqualTo(APPLICATION);
        variables.put(VIEWPOINT, ALL);
        assertThat(this.render(description, variables, Optional.of(refreshed)).getPaletteConfigurationKey()).isEqualTo(ALL);
    }

    @Test
    void unconfiguredDescriptionsHaveAStableEmptyKey() {
        assertThat(this.render(this.description(), new VariableManager(), Optional.empty()).getPaletteConfigurationKey()).isEmpty();
    }

    private DiagramDescription description() {
        return DiagramDescription.newDiagramDescription("description")
                .label("Diagram")
                .targetObjectIdProvider(variables -> "target")
                .labelProvider(variables -> "Diagram")
                .canCreatePredicate(variables -> true)
                .nodeDescriptions(List.of())
                .edgeDescriptions(List.of())
                .dropHandler(variables -> new Failure(""))
                .iconURLsProvider(variables -> List.of())
                .styleProvider(variables -> DiagramStyle.newDiagramStyle().build())
                .decoratorDescriptions(List.of())
                .layoutOption(DiagramLayoutOption.NONE)
                .build();
    }

    private Diagram render(DiagramDescription description, VariableManager variables, Optional<Diagram> previous) {
        var props = DiagramComponentProps.newDiagramComponentProps()
                .variableManager(variables)
                .diagramDescription(description)
                .allDiagramDescriptions(List.of(description))
                .viewCreationRequests(List.of())
                .viewDeletionRequests(List.of())
                .previousDiagram(previous)
                .operationValidator(new IOperationValidator.NoOp())
                .diagramEvents(List.of())
                .nodeAppearanceHandlers(List.of())
                .edgeAppearanceHandlers(List.of())
                .build();
        return new DiagramRenderer().render(new Element(DiagramComponent.class, props));
    }
}
