/*******************************************************************************
 * Copyright (c) 2025, 2026 Obeo.
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
import {
  Edge,
  InternalNode,
  Node,
  NodeChange,
  NodeDimensionChange,
  Position,
  useStoreApi,
  XYPosition,
} from '@xyflow/react';
import { useCallback } from 'react';
import { EdgeData, NodeData } from '../DiagramRenderer.types';
import { DEFAULT_HANDLE_SIZE, HANDLE_OFFSET } from '../edge/EdgeLayout';
import { DiagramNodeType } from '../node/NodeTypes.types';
import { ConnectionHandle } from './ConnectionHandles.types';
import { UseHandleResizedChangeValue } from './useHandleResizedChange.types';

const getHandlePosition = (
  node: InternalNode<Node<NodeData>>,
  position: Position,
  x: number,
  y: number
): XYPosition => {
  let XYPosition: XYPosition = { x, y };
  if (node.height && node.width) {
    switch (position) {
      case Position.Bottom:
        XYPosition = {
          ...XYPosition,
          y: 0 - DEFAULT_HANDLE_SIZE,
        };
        break;
      case Position.Top:
        XYPosition = {
          ...XYPosition,
          y: 0,
        };
        break;
      case Position.Left:
        XYPosition = {
          ...XYPosition,
          x: 0,
        };
        break;
      case Position.Right:
        XYPosition = {
          ...XYPosition,
          x: 0 - DEFAULT_HANDLE_SIZE,
        };
        break;
    }
  }

  return XYPosition;
};

const isResize = (change: NodeChange<Node<NodeData>>): change is NodeDimensionChange => change.type === 'dimensions';

export const useHandleResizedChange = (): UseHandleResizedChangeValue => {
  const storeApi = useStoreApi<Node<NodeData>, Edge<EdgeData>>();
  const applyResizeHandleChange = useCallback(
    (
      changes: NodeChange<Node<NodeData>>[],
      nodes: Node<NodeData, DiagramNodeType>[]
    ): Node<NodeData, DiagramNodeType>[] => {
      const { nodeLookup } = storeApi.getState();
      const updatedConnectionHandles = new Map<string, ConnectionHandle[]>();
      const nodesById = new Map(nodes.map((node) => [node.id, node]));
      for (const change of changes) {
        if (!isResize(change) || typeof change.resizing !== 'boolean' || !change.dimensions) {
          continue;
        }
        const previous = nodeLookup.get(change.id);
        const next = nodesById.get(change.id);
        if (!previous?.width || !previous.height || !next) {
          continue;
        }
        const widthRatio = change.dimensions.width / previous.width;
        const heightRatio = change.dimensions.height / previous.height;
        if (widthRatio === 1 && heightRatio === 1) {
          continue;
        }
        updatedConnectionHandles.set(
          change.id,
          next.data.connectionHandles.map((handle) => ({
            ...handle,
            XYPosition: handle.XYPosition
              ? getHandlePosition(
                  previous,
                  handle.position,
                  (handle.XYPosition.x + HANDLE_OFFSET) * widthRatio - HANDLE_OFFSET,
                  (handle.XYPosition.y + HANDLE_OFFSET) * heightRatio - HANDLE_OFFSET
                )
              : handle.XYPosition,
          }))
        );
      }

      if (updatedConnectionHandles.size > 0) {
        return nodes.map((node) => {
          const updatedConnectionHandle = updatedConnectionHandles.get(node.id);
          if (updatedConnectionHandle) {
            return {
              ...node,
              data: {
                ...node.data,
                connectionHandles: updatedConnectionHandle,
              },
            };
          }
          return node;
        });
      }
      return nodes;
    },
    []
  );

  return { applyResizeHandleChange };
};
