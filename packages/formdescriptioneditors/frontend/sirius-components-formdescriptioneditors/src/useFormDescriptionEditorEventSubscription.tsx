/*******************************************************************************
 * Copyright (c) 2025 Obeo.
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

import { ApolloError, gql, OnDataOptions, useSubscription } from '@apollo/client';
import { useMultiToast } from '@eclipse-sirius/sirius-components-core';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { formDescriptionEditorEventSubscription } from './FormDescriptionEditorEventFragment';
import {
  GQLFormDescriptionEditorEventInput,
  GQLFormDescriptionEditorEventSubscription,
  GQLFormDescriptionEditorEventVariables,
  UseFormDescriptionEditorEventSubscriptionState,
  UseFormDescriptionEditorEventSubscriptionValue,
} from './useFormDescriptionEditorEventSubscription.types';

export const useFormDescriptionEditorEventSubscription = (
  editingContextId: string,
  formDescriptionEditorId: string
): UseFormDescriptionEditorEventSubscriptionValue => {
  const [state, setState] = useState<UseFormDescriptionEditorEventSubscriptionState>({
    id: crypto.randomUUID(),
    payload: null,
    complete: false,
  });

  const input: GQLFormDescriptionEditorEventInput = {
    id: state.id,
    editingContextId,
    formDescriptionEditorId,
  };

  const variables: GQLFormDescriptionEditorEventVariables = { input };

  const onComplete = () => setState((prevState) => ({ ...prevState, complete: true }));

  const onData = ({ data }: OnDataOptions<GQLFormDescriptionEditorEventSubscription>) => {
    flushSync(() => {
      if (data.data) {
        const { formDescriptionEditorEvent } = data.data;
        setState((prevState) => ({ ...prevState, payload: formDescriptionEditorEvent }));
      }
    });
  };

  const { addErrorMessage } = useMultiToast();
  const onError = ({ message }: ApolloError) => {
    addErrorMessage(message);
  };

  const { loading } = useSubscription<
    GQLFormDescriptionEditorEventSubscription,
    GQLFormDescriptionEditorEventVariables
  >(gql(formDescriptionEditorEventSubscription), {
    variables,
    fetchPolicy: 'no-cache',
    onData,
    onComplete,
    onError,
  });

  return {
    loading,
    payload: state.payload,
    complete: state.complete,
  };
};
