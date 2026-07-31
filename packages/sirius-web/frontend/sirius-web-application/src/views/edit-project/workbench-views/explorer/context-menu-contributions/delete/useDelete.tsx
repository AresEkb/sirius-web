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
import { gql, useMutation } from '@apollo/client';
import { useDeletionConfirmationDialog, useMultiToast, useSelection } from '@eclipse-sirius/sirius-components-core';
import { GQLTreeItem } from '@eclipse-sirius/sirius-components-trees';
import { useEffect, useRef } from 'react';
import {
  GQLDeleteTreeItemData,
  GQLDeleteTreeItemInput,
  GQLDeleteTreeItemPayload,
  GQLDeleteTreeItemVariables,
  GQLErrorPayload,
  UseDeleteValue,
} from './useDelete.types';

const deleteTreeItemMutation = gql`
  mutation deleteTreeItem($input: DeleteTreeItemInput!) {
    deleteTreeItem(input: $input) {
      __typename
      ... on ErrorPayload {
        message
      }
    }
  }
`;

const isErrorPayload = (payload: GQLDeleteTreeItemPayload): payload is GQLErrorPayload =>
  payload.__typename === 'ErrorPayload';

export const useDelete = (): UseDeleteValue => {
  const [deleteTreeItem, { data, error }] = useMutation<GQLDeleteTreeItemData, GQLDeleteTreeItemVariables>(
    deleteTreeItemMutation
  );
  const { showDeletionConfirmation } = useDeletionConfirmationDialog();
  const { selection, setSelection } = useSelection();
  /*
   * The menu closes as soon as the deletion is confirmed, so this hook's owner may be gone by the
   * time the mutation answers: what the selection holds is read from a ref, and the selection is
   * freed of the deleted item on the mutation's own promise rather than in an effect.
   */
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const handleDelete = (editingContextId: string, treeId: string, item: GQLTreeItem) => {
    if (item.deletable) {
      const input: GQLDeleteTreeItemInput = {
        id: crypto.randomUUID(),
        editingContextId,
        representationId: treeId,
        treeItemId: item.id,
      };
      showDeletionConfirmation(() => {
        deleteTreeItem({ variables: { input } }).then((result) => {
          const payload = result.data?.deleteTreeItem;
          if (payload && !isErrorPayload(payload)) {
            /*
             * A deleted object cannot be pointed at any more: it leaves the selection, so that no
             * view goes on offering the properties or the tools of an object which is gone.
             */
            const entries = selectionRef.current.entries;
            if (entries.some((entry) => entry.id === item.id)) {
              setSelection({ entries: entries.filter((entry) => entry.id !== item.id) });
            }
          }
        });
      });
    }
  };

  const { addErrorMessage } = useMultiToast();
  useEffect(() => {
    if (error) {
      addErrorMessage('An error has occurred while executing this action, please contact the server administrator');
    }
    if (data) {
      const { deleteTreeItem } = data;
      if (isErrorPayload(deleteTreeItem)) {
        addErrorMessage(deleteTreeItem.message);
      }
    }
  }, [error, data]);

  return {
    handleDelete,
  };
};
