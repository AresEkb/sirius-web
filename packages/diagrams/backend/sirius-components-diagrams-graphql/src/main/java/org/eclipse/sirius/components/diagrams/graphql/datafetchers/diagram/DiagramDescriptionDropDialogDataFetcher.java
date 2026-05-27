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
package org.eclipse.sirius.components.diagrams.graphql.datafetchers.diagram;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.eclipse.sirius.components.annotations.spring.graphql.QueryDataFetcher;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogSuccessPayload;
import org.eclipse.sirius.components.diagrams.description.DropDialogDescriptor;
import org.eclipse.sirius.components.graphql.api.IDataFetcherWithFieldCoordinates;
import org.eclipse.sirius.components.graphql.api.IEditingContextDispatcher;
import org.eclipse.sirius.components.graphql.api.LocalContextConstants;

import graphql.schema.DataFetchingEnvironment;
import reactor.core.publisher.Mono;

/**
 * Datafetcher for {@code DiagramDescription { dropDialog }}. Returns the optional dialog descriptor that must be
 * presented to the user before the drop is executed; returns {@code null} when no dialog is needed.
 *
 * @author dnikiforov
 */
@QueryDataFetcher(type = "DiagramDescription", field = "dropDialog")
public class DiagramDescriptionDropDialogDataFetcher implements IDataFetcherWithFieldCoordinates<CompletableFuture<DropDialogDescriptor>> {

    private static final String DIAGRAM_TARGET_ELEMENT_ID = "diagramTargetElementId";

    private static final String OBJECT_IDS = "objectIds";

    private final IEditingContextDispatcher editingContextDispatcher;

    public DiagramDescriptionDropDialogDataFetcher(IEditingContextDispatcher editingContextDispatcher) {
        this.editingContextDispatcher = Objects.requireNonNull(editingContextDispatcher);
    }

    @Override
    public CompletableFuture<DropDialogDescriptor> get(DataFetchingEnvironment environment) throws Exception {
        Map<String, Object> localContext = environment.getLocalContext();
        String editingContextId = Optional.ofNullable(localContext.get(LocalContextConstants.EDITING_CONTEXT_ID)).map(Object::toString).orElse(null);
        String representationId = Optional.ofNullable(localContext.get(LocalContextConstants.REPRESENTATION_ID)).map(Object::toString).orElse(null);
        String diagramTargetElementId = environment.getArgument(DIAGRAM_TARGET_ELEMENT_ID);
        List<String> objectIds = environment.getArgumentOrDefault(OBJECT_IDS, List.of());

        if (editingContextId != null && representationId != null) {
            GetDropOnDiagramDialogInput input = new GetDropOnDiagramDialogInput(UUID.randomUUID(), editingContextId, representationId, diagramTargetElementId, objectIds);

            return this.editingContextDispatcher.dispatchQuery(input.editingContextId(), input)
                    .filter(GetDropOnDiagramDialogSuccessPayload.class::isInstance)
                    .map(GetDropOnDiagramDialogSuccessPayload.class::cast)
                    .flatMap(payload -> Mono.justOrEmpty(payload.descriptor()))
                    .toFuture();
        }
        return Mono.<DropDialogDescriptor>empty().toFuture();
    }
}
