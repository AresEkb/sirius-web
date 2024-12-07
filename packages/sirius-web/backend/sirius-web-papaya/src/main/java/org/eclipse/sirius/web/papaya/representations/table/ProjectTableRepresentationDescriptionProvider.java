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
package org.eclipse.sirius.web.papaya.representations.table;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;

import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.edit.provider.ComposedAdapterFactory;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IEditingContextRepresentationDescriptionProvider;
import org.eclipse.sirius.components.core.api.IIdentityService;
import org.eclipse.sirius.components.core.api.ILabelService;
import org.eclipse.sirius.components.core.api.IObjectSearchService;
import org.eclipse.sirius.components.papaya.PapayaFactory;
import org.eclipse.sirius.components.papaya.spec.ProjectSpec;
import org.eclipse.sirius.components.representations.IRepresentationDescription;
import org.eclipse.sirius.components.representations.VariableManager;
import org.eclipse.sirius.components.tables.descriptions.CellDescription;
import org.eclipse.sirius.components.tables.descriptions.ColumnDescription;
import org.eclipse.sirius.components.tables.descriptions.LineDescription;
import org.eclipse.sirius.components.tables.descriptions.TableDescription;
import org.springframework.stereotype.Service;

/**
 * This class is used to provide the description of a table on Papaya project element.
 *
 * @author Jerome Gout
 */
@Service
public class ProjectTableRepresentationDescriptionProvider implements IEditingContextRepresentationDescriptionProvider {

    public static final String TABLE_DESCRIPTION_ID = "papaya_project_table_description";

    public static final String CELL_DESCRIPTION_ID = "papaya_project_cell_description";

    private final IIdentityService identityService;

    private final IObjectSearchService objectSearchService;

    private final ILabelService labelService;

    private final ComposedAdapterFactory composedAdapterFactory;

    public ProjectTableRepresentationDescriptionProvider(IIdentityService identityService, IObjectSearchService objectSearchService, ILabelService labelService, ComposedAdapterFactory composedAdapterFactory) {
        this.identityService = Objects.requireNonNull(identityService);
        this.objectSearchService = Objects.requireNonNull(objectSearchService);
        this.labelService = Objects.requireNonNull(labelService);
        this.composedAdapterFactory = Objects.requireNonNull(composedAdapterFactory);
    }

    @Override
    public List<IRepresentationDescription> getRepresentationDescriptions(IEditingContext editingContext) {
        var cellDescription = CellDescription.newCellDescription(CELL_DESCRIPTION_ID)
                .targetObjectIdProvider(new TableTargetObjectIdProvider(this.identityService))
                .targetObjectKindProvider(new TableTargetObjectKindProvider(this.identityService))
                .cellTypeProvider(new CellTypeProvider())
                .cellValueProvider(new CellValueProvider(this.identityService))
                .cellOptionsIdProvider(new CellOptionIdProvider(this.identityService, this.labelService))
                .cellOptionsLabelProvider(new CellOptionLabelProvider(this.labelService))
                .cellOptionsProvider(new CellOptionsProvider(this.composedAdapterFactory))
                .newCellValueHandler(new CellNewValueHandler(this.objectSearchService))
                .build();

        var lineDescription = LineDescription.newLineDescription(UUID.nameUUIDFromBytes("Table - Line".getBytes()))
                .targetObjectIdProvider(new TableTargetObjectIdProvider(this.identityService))
                .targetObjectKindProvider(new TableTargetObjectKindProvider(this.identityService))
                .semanticElementsProvider(this::getSemanticElements)
                .build();

        var tableDescription = TableDescription.newTableDescription(TABLE_DESCRIPTION_ID)
                .label("Papaya project table")
                .labelProvider(new TableLabelProvider(this.labelService))
                .canCreatePredicate(this::canCreate)
                .lineDescriptions(List.of(lineDescription))
                .columnDescriptions(this.getColumnDescriptions())
                .targetObjectIdProvider(new TableTargetObjectIdProvider(this.identityService))
                .targetObjectKindProvider(new TableTargetObjectKindProvider(this.identityService))
                .cellDescription(cellDescription)
                .build();

        return List.of(tableDescription);
    }

    private boolean canCreate(VariableManager variableManager) {
        return variableManager.get(VariableManager.SELF, Object.class)
                .filter(ProjectSpec.class::isInstance)
                .isPresent();
    }

    private List<Object> getAllContents(EObject object) {
        var result = new ArrayList<>();
        var iterator = object.eAllContents();
        while (iterator.hasNext()) {
            result.add(iterator.next());
        }
        return result;
    }

    private List<Object> getSemanticElements(VariableManager variableManager) {
        return variableManager.get(VariableManager.SELF, ProjectSpec.class)
                .map(this::getAllContents)
                .orElse(List.of());
    }

    private List<ColumnDescription> getColumnDescriptions() {
        Map<EStructuralFeature, String> featureToDisplayName = this.getColumnsStructuralFeaturesDisplayName();

        ColumnDescription columnDescription = ColumnDescription.newColumnDescription(UUID.nameUUIDFromBytes("features".getBytes()))
                .semanticElementsProvider(this.getSemanticColumnElementsProvider(featureToDisplayName))
                .labelProvider(variableManager -> variableManager.get(VariableManager.SELF, EStructuralFeature.class).map(featureToDisplayName::get).orElse(""))
                .targetObjectIdProvider(new ColumnTargetObjectIdProvider())
                .targetObjectKindProvider(variableManager -> "")
                .build();
        return List.of(columnDescription);
    }

    private Function<VariableManager, List<Object>> getSemanticColumnElementsProvider(Map<EStructuralFeature, String> features) {
        return variableManager -> features.entrySet().stream()
                .sorted((entry1, entry2) -> {
                    int result = 0;
                    if ("Name".equals(entry1.getValue())) {
                        result = -1;
                    } else if ("Name".equals(entry2.getValue())) {
                        result = 1;
                    } else {
                        result = entry1.getValue().compareTo(entry2.getValue());
                    }
                    return result;
                })
                .map(Map.Entry::getKey)
                .map(Object.class::cast)
                .toList();
    }

    private Map<EStructuralFeature, String> getColumnsStructuralFeaturesDisplayName() {
        Map<EStructuralFeature, String> result = new HashMap<>();
        var objects = List.of(
                PapayaFactory.eINSTANCE.createAnnotation(),
                PapayaFactory.eINSTANCE.createAnnotationField(),
                PapayaFactory.eINSTANCE.createAttribute(),
                PapayaFactory.eINSTANCE.createClass(),
                PapayaFactory.eINSTANCE.createComponent(),
                PapayaFactory.eINSTANCE.createComponentExchange(),
                PapayaFactory.eINSTANCE.createComponentPort(),
                PapayaFactory.eINSTANCE.createConstructor(),
                PapayaFactory.eINSTANCE.createContribution(),
                PapayaFactory.eINSTANCE.createDataType(),
                PapayaFactory.eINSTANCE.createEnum(),
                PapayaFactory.eINSTANCE.createEnumLiteral(),
                PapayaFactory.eINSTANCE.createGenericType(),
                PapayaFactory.eINSTANCE.createInterface(),
                PapayaFactory.eINSTANCE.createIteration(),
                PapayaFactory.eINSTANCE.createOperation(),
                PapayaFactory.eINSTANCE.createPackage(),
                PapayaFactory.eINSTANCE.createParameter(),
                PapayaFactory.eINSTANCE.createProject(),
                PapayaFactory.eINSTANCE.createProvidedService(),
                PapayaFactory.eINSTANCE.createRecord(),
                PapayaFactory.eINSTANCE.createRecordComponent(),
                PapayaFactory.eINSTANCE.createRequiredService(),
                PapayaFactory.eINSTANCE.createTag(),
                PapayaFactory.eINSTANCE.createTask(),
                PapayaFactory.eINSTANCE.createTypeParameter()
        );

        var provider = new StructuralFeatureToDisplayNameProvider(new DisplayNameProvider(this.composedAdapterFactory));
        for (var eObject : objects) {
            this.addStructuralFeature(result, provider.getColumnsStructuralFeaturesDisplayName(eObject, eObject.eClass()));
        }
        return result;
    }

    private void addStructuralFeature(Map<EStructuralFeature, String> result, Map<EStructuralFeature, String> map) {
        map.forEach((key, value) -> {
            if (!result.containsKey(key)) {
                result.put(key, value);
            }
        });
    }
}
