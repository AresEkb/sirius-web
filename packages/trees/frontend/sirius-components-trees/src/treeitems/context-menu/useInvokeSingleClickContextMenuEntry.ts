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
import { useMultiToast } from '@eclipse-sirius/sirius-components-core';
import { useImpactAnalysisDialog } from '@eclipse-sirius/sirius-components-impactanalysis';
import { useEffect, useState } from 'react';
import { useInvokeImpactAnalysis } from './impact-analysis/useTreeImpactAnalysis';
import { GQLTreeItemContextMenuEntry } from './useContextMenuEntries.types';
import {
  GQLErrorPayload,
  GQLInvokeSingleClickTreeItemContextMenuEntryData,
  GQLInvokeSingleClickTreeItemContextMenuEntryInput,
  GQLInvokeSingleClickTreeItemContextMenuEntryPayload,
  GQLInvokeSingleClickTreeItemContextMenuEntrySuccessPayload,
  GQLInvokeSingleClickTreeItemContextMenuEntryVariables,
  UseInvokeSingleClickContextMenuEntryState,
  UseInvokeSingleClickContextMenuEntryValue,
} from './useInvokeSingleClickContextMenuEntry.types';

const invokeSingleClickTreeItemContextMenuEntryMutation = gql`
  mutation invokeSingleClickTreeItemContextMenuEntry($input: InvokeSingleClickTreeItemContextMenuEntryInput!) {
    invokeSingleClickTreeItemContextMenuEntry(input: $input) {
      __typename
      ... on ErrorPayload {
        message
      }
      ... on InvokeSingleClickTreeItemContextMenuEntrySuccessPayload {
        newSelection {
          entries {
            id
          }
        }
        treeItemIdsToExpand
      }
    }
  }
`;

const isErrorPayload = (payload: GQLInvokeSingleClickTreeItemContextMenuEntryPayload): payload is GQLErrorPayload =>
  payload.__typename === 'ErrorPayload';

const isSuccessPayload = (
  payload: GQLInvokeSingleClickTreeItemContextMenuEntryPayload
): payload is GQLInvokeSingleClickTreeItemContextMenuEntrySuccessPayload =>
  payload.__typename === 'InvokeSingleClickTreeItemContextMenuEntrySuccessPayload';

export const useInvokeSingleClickContextMenuEntry = (): UseInvokeSingleClickContextMenuEntryValue => {
  const { addMessages, addErrorMessage } = useMultiToast();

  const [state, setState] = useState<UseInvokeSingleClickContextMenuEntryState>({
    currentEntry: null,
    onEntryExecution: () => {},
  });

  const [invokeSingleClickTreeItemContextMenuEntry, { data, error }] = useMutation<
    GQLInvokeSingleClickTreeItemContextMenuEntryData,
    GQLInvokeSingleClickTreeItemContextMenuEntryVariables
  >(invokeSingleClickTreeItemContextMenuEntryMutation);

  useEffect(() => {
    if (error) {
      addErrorMessage('An error has occurred while executing this action, please contact the server administrator');
    }
    if (data) {
      const { invokeSingleClickTreeItemContextMenuEntry } = data;
      if (isErrorPayload(invokeSingleClickTreeItemContextMenuEntry)) {
        addMessages(invokeSingleClickTreeItemContextMenuEntry.messages);
      }
    }
  }, [error, data]);

  const invokeEntry = (
    editingContextId: string,
    treeId: string,
    treeItemId: string,
    menuEntryId: string,
    onClick: () => void,
    onSuccess?: (payload: GQLInvokeSingleClickTreeItemContextMenuEntrySuccessPayload) => void
  ) => {
    const input: GQLInvokeSingleClickTreeItemContextMenuEntryInput = {
      id: crypto.randomUUID(),
      editingContextId,
      representationId: treeId,
      treeItemId,
      menuEntryId,
    };
    invokeSingleClickTreeItemContextMenuEntry({ variables: { input } }).then((result) => {
      const payload = result.data?.invokeSingleClickTreeItemContextMenuEntry;
      if (payload && isSuccessPayload(payload) && onSuccess) {
        onSuccess(payload);
      }
    });
    onClick();
  };

  const { showImpactAnalysisDialog } = useImpactAnalysisDialog();

  const {
    getImpactAnalysisReport,
    loading: impactAnalysisReportLoading,
    impactAnalysisReport,
  } = useInvokeImpactAnalysis();

  useEffect(() => {
    if (state.currentEntry && (impactAnalysisReport || impactAnalysisReportLoading)) {
      showImpactAnalysisDialog(
        impactAnalysisReport,
        impactAnalysisReportLoading,
        state.currentEntry.label,
        state.onEntryExecution
      );
    }
  }, [impactAnalysisReportLoading, impactAnalysisReport]);

  const invokeSingleClickContextMenuEntry = (
    editingContextId: string,
    treeId: string,
    treeItemId: string,
    menuEntry: GQLTreeItemContextMenuEntry,
    onClick: () => void,
    onSuccess?: (payload: GQLInvokeSingleClickTreeItemContextMenuEntrySuccessPayload) => void
  ) => {
    if (menuEntry.withImpactAnalysis) {
      setState((prevState) => ({
        ...prevState,
        currentEntry: menuEntry,
        onEntryExecution: () => invokeEntry(editingContextId, treeId, treeItemId, menuEntry.id, onClick, onSuccess),
      }));
      getImpactAnalysisReport({
        variables: {
          editingContextId,
          representationId: treeId,
          treeItemId,
          menuEntryId: menuEntry.id,
        },
      });
    } else {
      invokeEntry(editingContextId, treeId, treeItemId, menuEntry.id, onClick, onSuccess);
      onClick();
    }
  };

  return { invokeSingleClickContextMenuEntry };
};
