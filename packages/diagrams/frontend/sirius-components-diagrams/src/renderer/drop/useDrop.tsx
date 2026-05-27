/*******************************************************************************
 * Copyright (c) 2023, 2026 Obeo.
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
import { gql, useApolloClient, useMutation } from '@apollo/client';
import { DRAG_SOURCES_TYPE, useMultiToast } from '@eclipse-sirius/sirius-components-core';
import { Edge, Node, useReactFlow } from '@xyflow/react';
import { useCallback, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DiagramContext } from '../../contexts/DiagramContext';
import { DiagramContextValue } from '../../contexts/DiagramContext.types';
import { useDialog } from '../../dialog/useDialog';
import { ToolVariable } from '../../dialog/DialogContext.types';
import { EdgeData, NodeData } from '../DiagramRenderer.types';
import {
  GQLDropDialogDescriptor,
  GQLDropOnDiagramData,
  GQLDropOnDiagramInput,
  GQLDropOnDiagramPayload,
  GQLDropOnDiagramSuccessPayload,
  GQLDropOnDiagramVariables,
  GQLErrorPayload,
  GQLGetDropDialogData,
  GQLGetDropDialogVariables,
  UseDropValue,
} from './useDrop.types';

const dropOnDiagramMutation = gql`
  mutation dropOnDiagram($input: DropOnDiagramInput!) {
    dropOnDiagram(input: $input) {
      __typename
      ... on DropOnDiagramSuccessPayload {
        diagram {
          id
        }
        messages {
          body
          level
        }
      }
      ... on ErrorPayload {
        messages {
          body
          level
        }
      }
    }
  }
`;

const getDropDialogQuery = gql`
  query getDropDialog(
    $editingContextId: ID!
    $representationId: ID!
    $diagramTargetElementId: ID
    $objectIds: [String!]!
  ) {
    viewer {
      editingContext(editingContextId: $editingContextId) {
        representation(representationId: $representationId) {
          description {
            ... on DiagramDescription {
              dropDialog(diagramTargetElementId: $diagramTargetElementId, objectIds: $objectIds) {
                dialogDescriptionId
                initialVariables {
                  name
                  value
                  type
                }
              }
            }
          }
        }
      }
    }
  }
`;

const isErrorPayload = (payload: GQLDropOnDiagramPayload): payload is GQLErrorPayload =>
  payload.__typename === 'ErrorPayload';
const isSuccessPayload = (payload: GQLDropOnDiagramPayload): payload is GQLDropOnDiagramSuccessPayload =>
  payload.__typename === 'DropOnDiagramSuccessPayload';

export const useDrop = (): UseDropValue => {
  const { t } = useTranslation('sirius-components-diagrams', { keyPrefix: 'useDrop' });
  const { addErrorMessage, addMessages } = useMultiToast();
  const { diagramId, editingContextId, readOnly } = useContext<DiagramContextValue>(DiagramContext);
  const { showDialog } = useDialog();
  const apolloClient = useApolloClient();
  const [dropMutation, { data: droponDiagramElementData, error: droponDiagramError }] = useMutation<
    GQLDropOnDiagramData,
    GQLDropOnDiagramVariables
  >(dropOnDiagramMutation);

  useEffect(() => {
    if (droponDiagramError) {
      addErrorMessage(t('errors.unexpected'));
    }
    if (droponDiagramElementData) {
      const { dropOnDiagram } = droponDiagramElementData;
      if (isSuccessPayload(dropOnDiagram)) {
        addMessages(dropOnDiagram.messages);
      }
      if (isErrorPayload(dropOnDiagram)) {
        addMessages(dropOnDiagram.messages);
      }
    }
  }, [droponDiagramElementData, droponDiagramError]);
  const reactFlowInstance = useReactFlow<Node<NodeData>, Edge<EdgeData>>();

  const executeDrop = useCallback(
    (input: GQLDropOnDiagramInput) => {
      if (!readOnly) {
        dropMutation({ variables: { input } });
      }
    },
    [readOnly]
  );

  const fetchDropDialog = useCallback(
    async (diagramTargetElementId: string, objectIds: string[]): Promise<GQLDropDialogDescriptor | null> => {
      const { data } = await apolloClient.query<GQLGetDropDialogData, GQLGetDropDialogVariables>({
        query: getDropDialogQuery,
        variables: {
          editingContextId,
          representationId: diagramId,
          diagramTargetElementId,
          objectIds,
        },
        fetchPolicy: 'network-only',
      });
      return data.viewer.editingContext?.representation?.description?.dropDialog ?? null;
    },
    [apolloClient, editingContextId, diagramId]
  );

  const onDrop = useCallback(
    (event: React.DragEvent, diagramElementId?: string) => {
      event.preventDefault();
      event.stopPropagation();

      const data = event.dataTransfer.getData(DRAG_SOURCES_TYPE);

      // check if the dropped element is valid
      if (data === '') {
        return;
      }
      const dropPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const selectedIds: string[] = JSON.parse(data);
      const targetElementId = diagramElementId ? diagramElementId : diagramId;

      const buildInput = (variables: ToolVariable[]): GQLDropOnDiagramInput => ({
        id: crypto.randomUUID(),
        editingContextId,
        representationId: diagramId,
        objectIds: selectedIds,
        startingPositionX: dropPosition.x,
        startingPositionY: dropPosition.y,
        diagramTargetElementId: targetElementId,
        variables,
      });

      if (readOnly) {
        return;
      }

      fetchDropDialog(targetElementId, selectedIds)
        .then((descriptor) => {
          if (descriptor) {
            showDialog(
              descriptor.dialogDescriptionId,
              descriptor.initialVariables.map(({ name, value }) => ({ name, value })),
              (returnedVariables) => executeDrop(buildInput(returnedVariables)),
              () => {
                /* Cancel — do nothing. */
              }
            );
          } else {
            executeDrop(buildInput([]));
          }
        })
        .catch(() => {
          addErrorMessage(t('errors.unexpected'));
        });
    },
    [reactFlowInstance, readOnly, diagramId, editingContextId, fetchDropDialog, executeDrop, showDialog]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  return { onDrop, onDragOver };
};
