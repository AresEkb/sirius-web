/*******************************************************************************
 * Copyright (c) 2024 CEA LIST.
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
import { gql, OnDataOptions, useSubscription } from '@apollo/client';
import { useMultiToast } from '@eclipse-sirius/sirius-components-core';

import { useEffect, useState } from 'react';
import {
  UseTableSubscriptionValue,
  UseTableSubscriptionState,
  GQLTableEventPayload,
  GQLTableRefreshedEventPayload,
  GQLTableEventInput,
  GQLTableEventVariables,
  GQLTableEventData,
} from './useTableSubscription.types';

export const getTableEventSubscription = `
  subscription tableEvent($input: TableEventInput!) {
    tableEvent(input: $input) {
      __typename
      ... on TableRefreshedEventPayload {
        table {
          id
          columns {
            id
            label
            targetObjectId
            targetObjectKind 
          }
          lines {
            id
            targetObjectId
            targetObjectKind
            cells {
              __typename
              id
              targetObjectId
              targetObjectKind
              columnId
              ... on CheckboxCell {
                booleanValue: value
              }
              ... on SelectCell {
                value
                options {
                  id
                  label
                }
              }
              ... on MultiSelectCell {
                values
                options {
                  id
                  label
                }
              }
              ... on TextfieldCell {
                stringValue: value
              }
            }
          }
        }
      }
    }
  }
  `;

const isTableRefreshedEventPayload = (payload: GQLTableEventPayload): payload is GQLTableRefreshedEventPayload =>
  payload.__typename === 'TableRefreshedEventPayload';

export const useTableSubscription = (editingContextId: string, tableId: string): UseTableSubscriptionValue => {
  const [state, setState] = useState<UseTableSubscriptionState>({
    id: crypto.randomUUID(),
    table: null,
    complete: false,
  });

  const input: GQLTableEventInput = {
    id: state.id,
    editingContextId,
    representationId: `${tableId}`,
  };

  const variables: GQLTableEventVariables = { input };

  const onData = ({ data }: OnDataOptions<GQLTableEventData>) => {
    const { data: gqlTableData } = data;
    if (gqlTableData) {
      const { tableEvent: payload } = gqlTableData;
      if (isTableRefreshedEventPayload(payload)) {
        const { table } = payload;
        setState((prevState) => ({ ...prevState, table }));
      }
    }
  };

  const onComplete = () => setState((prevState) => ({ ...prevState, complete: true }));

  const { error, loading } = useSubscription<GQLTableEventData, GQLTableEventVariables>(
    gql(getTableEventSubscription),
    {
      variables,
      fetchPolicy: 'no-cache',
      onData,
      onComplete,
    }
  );

  const { addErrorMessage } = useMultiToast();
  useEffect(() => {
    if (error) {
      addErrorMessage('An unexpected error has occurred, please refresh the page');
    }
  }, [error]);

  return {
    loading,
    table: state.table,
    complete: state.complete,
  };
};
