/*******************************************************************************
 * Copyright (c) 2024, 2026 Obeo.
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
package org.eclipse.sirius.components.collaborative.trees.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.trees.api.ISingleClickTreeItemContextMenuEntryExecutor;
import org.eclipse.sirius.components.collaborative.trees.dto.InvokeSingleClickTreeItemContextMenuEntryInput;
import org.eclipse.sirius.components.collaborative.trees.dto.InvokeSingleClickTreeItemContextMenuEntrySuccessPayload;
import org.eclipse.sirius.components.collaborative.trees.services.api.ICollaborativeTreeMessageService;
import org.eclipse.sirius.components.collaborative.trees.services.api.ITreeQueryService;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.representations.Success;
import org.eclipse.sirius.components.representations.WorkbenchSelection;
import org.eclipse.sirius.components.trees.Tree;
import org.eclipse.sirius.components.trees.TreeItem;
import org.eclipse.sirius.components.trees.description.TreeDescription;
import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import reactor.core.publisher.Sinks;

/**
 * Tests how a context menu action returns the new selection and the tree items to expand.
 *
 * @author dnikiforov
 */
public class InvokeSingleClickTreeItemContextMenuEntryEventHandlerTests {

    @Test
    public void testReturnsSelectionAndOnlyValidIdsToExpand() {
        var input = new InvokeSingleClickTreeItemContextMenuEntryInput(UUID.randomUUID(), "context", "tree", "item", "entry");
        IEditingContext editingContext = input::editingContextId;
        var tree = mock(Tree.class);
        var treeDescription = mock(TreeDescription.class);
        var treeItem = mock(TreeItem.class);
        var treeQueries = mock(ITreeQueryService.class);
        when(treeQueries.findTreeItem(tree, input.treeItemId())).thenReturn(Optional.of(treeItem));

        var selection = new WorkbenchSelection(List.of());
        String parentToExpand = "parent";
        String childToExpand = "child";
        var parameters = Map.<String, Object>of(Success.NEW_SELECTION, selection,
                InvokeSingleClickTreeItemContextMenuEntrySuccessPayload.TREE_ITEM_IDS_TO_EXPAND, List.of(parentToExpand, 42, childToExpand));
        var executor = mock(ISingleClickTreeItemContextMenuEntryExecutor.class);
        when(executor.canExecute(editingContext, treeDescription, input.menuEntryId(), input)).thenReturn(true);
        when(executor.execute(editingContext, treeDescription, tree, treeItem, input.menuEntryId(), input)).thenReturn(new Success(ChangeKind.NOTHING, parameters));

        var messages = mock(ICollaborativeTreeMessageService.class);
        when(messages.invalidInput(input.getClass().getSimpleName(), input.getClass().getSimpleName())).thenReturn("Invalid input");
        var handler = new InvokeSingleClickTreeItemContextMenuEntryEventHandler(messages, treeQueries, new SimpleMeterRegistry(), List.of(executor));
        Sinks.One<IPayload> payload = Sinks.one();
        Sinks.Many<ChangeDescription> changes = Sinks.many().unicast().onBackpressureBuffer();

        handler.handle(payload, changes, editingContext, treeDescription, tree, input);

        assertThat(payload.asMono().block(Duration.ofSeconds(5))).isInstanceOfSatisfying(InvokeSingleClickTreeItemContextMenuEntrySuccessPayload.class, success -> {
            assertThat(success.id()).isEqualTo(input.id());
            assertThat(success.newSelection()).isEqualTo(selection);
            assertThat(success.treeItemIdsToExpand()).containsExactly(parentToExpand, childToExpand);
        });
    }
}
