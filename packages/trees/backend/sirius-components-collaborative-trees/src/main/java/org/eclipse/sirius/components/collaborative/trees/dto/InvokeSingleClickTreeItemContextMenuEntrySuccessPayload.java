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
package org.eclipse.sirius.components.collaborative.trees.dto;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.representations.Message;
import org.eclipse.sirius.components.representations.WorkbenchSelection;

/**
 * The payload of the "Invoke single click tree item context menu entry" mutation returned on success. In addition to
 * the messages, it carries an optional new selection and the identifiers of the tree items to expand, so an executor
 * can ask the frontend to reveal and select the tree items it created.
 *
 * @author dnikiforov
 */
public record InvokeSingleClickTreeItemContextMenuEntrySuccessPayload(UUID id, WorkbenchSelection newSelection, List<String> treeItemIdsToExpand, List<Message> messages) implements IPayload {

    /**
     * The key under which an executor stores, in the {@code Success} parameters, the identifiers of the tree items to
     * expand.
     */
    public static final String TREE_ITEM_IDS_TO_EXPAND = "treeItemIdsToExpand";

    public InvokeSingleClickTreeItemContextMenuEntrySuccessPayload {
        Objects.requireNonNull(id);
        Objects.requireNonNull(treeItemIdsToExpand);
        Objects.requireNonNull(messages);
    }
}
