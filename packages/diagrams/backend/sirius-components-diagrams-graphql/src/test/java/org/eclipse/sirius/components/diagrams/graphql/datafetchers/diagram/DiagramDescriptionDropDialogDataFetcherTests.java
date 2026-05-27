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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetDropOnDiagramDialogSuccessPayload;
import org.eclipse.sirius.components.diagrams.description.DropDialogDescriptor;
import org.eclipse.sirius.components.graphql.api.IEditingContextDispatcher;
import org.eclipse.sirius.components.graphql.api.LocalContextConstants;
import org.junit.jupiter.api.Test;

import graphql.schema.DataFetchingEnvironment;
import reactor.core.publisher.Mono;

/**
 * Tests GraphQL dispatch and result mapping for {@link DiagramDescriptionDropDialogDataFetcher}.
 *
 * @author dnikiforov
 */
public class DiagramDescriptionDropDialogDataFetcherTests {

    @Test
    public void testReturnsTheDescriptorForTheRequestedTarget() throws Exception {
        String contextId = "context";
        String diagramId = "diagram";
        String targetId = "target";
        var environment = mock(DataFetchingEnvironment.class);
        when(environment.getLocalContext()).thenReturn(Map.of(LocalContextConstants.EDITING_CONTEXT_ID, contextId, LocalContextConstants.REPRESENTATION_ID, diagramId));
        when(environment.getArgument("diagramTargetElementId")).thenReturn(targetId);
        List<String> objectIds = List.of("object");
        when(environment.<List<String>>getArgumentOrDefault("objectIds", List.of())).thenReturn(objectIds);
        var descriptor = new DropDialogDescriptor("dialog", List.of());
        var dispatcher = mock(IEditingContextDispatcher.class);
        when(dispatcher.dispatchQuery(eq(contextId), any(GetDropOnDiagramDialogInput.class))).thenAnswer(invocation -> {
            GetDropOnDiagramDialogInput input = invocation.getArgument(1);
            assertThat(input.editingContextId()).isEqualTo(contextId);
            assertThat(input.representationId()).isEqualTo(diagramId);
            assertThat(input.diagramTargetElementId()).isEqualTo(targetId);
            assertThat(input.objectIds()).isEqualTo(objectIds);
            return Mono.just(new GetDropOnDiagramDialogSuccessPayload(input.id(), Optional.of(descriptor)));
        });

        var dataFetcher = new DiagramDescriptionDropDialogDataFetcher(dispatcher);
        assertThat(dataFetcher.get(environment).get(5, TimeUnit.SECONDS)).isEqualTo(descriptor);
    }
}
