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

import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.eclipse.sirius.components.annotations.spring.graphql.QueryDataFetcher;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetSingleClickToolDialogInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetSingleClickToolDialogSuccessPayload;
import org.eclipse.sirius.components.diagrams.description.SingleClickToolDialogDescriptor;
import org.eclipse.sirius.components.graphql.api.IDataFetcherWithFieldCoordinates;
import org.eclipse.sirius.components.graphql.api.IEditingContextDispatcher;
import org.eclipse.sirius.components.graphql.api.LocalContextConstants;

import graphql.schema.DataFetchingEnvironment;
import reactor.core.publisher.Mono;

/**
 * Datafetcher for {@code DiagramDescription { singleClickToolDialog }}. Returns the optional dialog descriptor that must
 * be opened before a single click tool runs.
 *
 * @author dnikiforov
 */
@QueryDataFetcher(type = "DiagramDescription", field = "singleClickToolDialog")
public class DiagramDescriptionSingleClickToolDialogDataFetcher implements IDataFetcherWithFieldCoordinates<CompletableFuture<SingleClickToolDialogDescriptor>> {

    private static final String DIAGRAM_TARGET_ELEMENT_ID = "diagramTargetElementId";

    private static final String TOOL_ID = "toolId";

    private final IEditingContextDispatcher editingContextDispatcher;

    public DiagramDescriptionSingleClickToolDialogDataFetcher(IEditingContextDispatcher editingContextDispatcher) {
        this.editingContextDispatcher = Objects.requireNonNull(editingContextDispatcher);
    }

    @Override
    public CompletableFuture<SingleClickToolDialogDescriptor> get(DataFetchingEnvironment environment) throws Exception {
        Map<String, Object> localContext = environment.getLocalContext();
        String editingContextId = Optional.ofNullable(localContext.get(LocalContextConstants.EDITING_CONTEXT_ID)).map(Object::toString).orElse(null);
        String representationId = Optional.ofNullable(localContext.get(LocalContextConstants.REPRESENTATION_ID)).map(Object::toString).orElse(null);
        String diagramTargetElementId = environment.getArgument(DIAGRAM_TARGET_ELEMENT_ID);
        String toolId = environment.getArgument(TOOL_ID);
        if (editingContextId != null && representationId != null) {
            GetSingleClickToolDialogInput input = new GetSingleClickToolDialogInput(UUID.randomUUID(), editingContextId, representationId, diagramTargetElementId, toolId);
            return this.editingContextDispatcher.dispatchQuery(input.editingContextId(), input)
                    .filter(GetSingleClickToolDialogSuccessPayload.class::isInstance)
                    .map(GetSingleClickToolDialogSuccessPayload.class::cast)
                    .flatMap(payload -> Mono.justOrEmpty(payload.descriptor()))
                    .toFuture();
        }
        return Mono.<SingleClickToolDialogDescriptor>empty().toFuture();
    }
}
