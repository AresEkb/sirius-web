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
import { Edge, Node, NodeChange, NodeDimensionChange, NodePositionChange, useStoreApi } from '@xyflow/react';
import { useCallback } from 'react';
import { useStore } from '../../representation/useStore';
import { BorderNodePosition, EdgeData, NodeData } from '../DiagramRenderer.types';
import { getBorderNodeExtent } from '../layout/layoutBorderNodes';
import { borderNodeOffset } from '../layout/layoutParams';
import { ListNodeData } from '../node/ListNode.types';
import { isResizing, isMove, isResize, isResizeFinished } from '../node/nodeChangePredicates';
import { UseResizeChangeValue } from './useResizeChange.types';
import { DiagramNodeType } from '../node/NodeTypes.types';

const isListData = (node: Node): node is Node<ListNodeData> => node.type === 'listNode';

const getBorderWidth = (resizedNode: Node<NodeData>): number => {
  let borderLeftWidth: number = 1;
  if (resizedNode.data.style.borderWidth) {
    if (typeof resizedNode.data.style.borderWidth === 'number') {
      borderLeftWidth = resizedNode.data.style.borderWidth;
    } else {
      borderLeftWidth = parseFloat(resizedNode.data.style.borderWidth);
    }
  }
  return borderLeftWidth;
};

const applyResizeToListContain = (
  resizedNode: Node<NodeData>,
  nodes: Node<NodeData>[],
  change: NodeDimensionChange
): NodeChange<Node<NodeData>>[] => {
  const newChanges: NodeChange<Node<NodeData>>[] = [];
  if (isListData(resizedNode) && change.dimensions) {
    const borderWidth: number = getBorderWidth(resizedNode);
    const growableChildNodes = nodes.filter(
      (node) =>
        !node.data.isBorderNode &&
        !node.hidden &&
        node.parentId === resizedNode.id &&
        resizedNode.data.growableNodeIds.includes(node.data.descriptionId)
    );
    const heightDimensionChange = change.dimensions.height - (resizedNode.height ?? 0);
    const growableChildNodeId = growableChildNodes
      .filter((node) => {
        if (heightDimensionChange > 0) {
          return (node.height ?? 0) >= (node.data.minComputedHeight ?? 0);
        }
        return (node.height ?? 0) > (node.data.minComputedHeight ?? 0);
      })
      .map((node) => node.id);
    const heightToAddToEachGrowableNode =
      growableChildNodeId.length > 0 ? heightDimensionChange / growableChildNodeId.length : 0;
    let offsetYPosition = 0;
    nodes
      .filter((node) => !node.data.isBorderNode && !node.hidden)
      .forEach((node) => {
        if (node.parentId === resizedNode.id && change.dimensions?.width) {
          let heightToAdd = 0;
          if (growableChildNodeId.includes(node.id)) {
            if ((node.height ?? 0) + heightToAddToEachGrowableNode < (node.data.minComputedHeight ?? 0)) {
              heightToAdd = node.data.minComputedHeight! - node.height!;
            } else {
              heightToAdd = heightToAddToEachGrowableNode;
            }
          }
          const newDimensionChange: NodeChange<Node<NodeData>> = {
            id: node.id,
            type: 'dimensions',
            resizing: change.resizing,
            setAttributes: true,
            dimensions: {
              width: change.dimensions.width - borderWidth * 2,
              height: (node.height ?? 0) + heightToAdd,
            },
          };
          newChanges.push(newDimensionChange);
          newChanges.push({
            id: node.id,
            type: 'position',
            position: {
              x: node.position.x,
              y: node.position.y + offsetYPosition,
            },
          });
          offsetYPosition += heightToAdd;
          newChanges.push(...applyResizeToListContain(node, nodes, newDimensionChange));
        }
      });
  }
  return newChanges;
};

const applyMoveToListContain = (
  movedNode: Node<NodeData>,
  nodes: Node<NodeData>[],
  change: NodePositionChange
): NodeChange<Node<NodeData>> => {
  const parentNode = nodes.find((node) => node.id === movedNode.parentId);
  if (parentNode) {
    const borderWidth: number = getBorderWidth(parentNode);
    if (movedNode.id === change.id && change.position) {
      change = {
        ...change,
        position: { x: isListData(parentNode) ? borderWidth : movedNode.position.x, y: movedNode.position.y },
      };
    }
  }
  return change;
};

const applyMoveToBorderNodes = (resizedNode: Node<NodeData>, nodes: Node<NodeData>[], change: NodeDimensionChange) => {
  const newChanges: NodeChange<Node<NodeData>>[] = [];
  if (resizedNode.width && resizedNode.height && change.dimensions) {
    nodes
      .filter((node) => node.data.isBorderNode)
      .forEach((node) => {
        if (node.parentId === resizedNode.id) {
          node.extent = getBorderNodeExtent(
            {
              ...resizedNode,
              width: change.dimensions?.width ?? 0,
              height: change.dimensions?.height ?? 0,
            },
            node
          );
          if (node.data.borderNodePosition === BorderNodePosition.EAST) {
            const eastBorderNodePositionX = (change.dimensions?.width ?? 0) - borderNodeOffset;
            newChanges.push({
              id: node.id,
              type: 'position',
              position: { x: eastBorderNodePositionX, y: node.position.y },
            });
          } else if (node.data.borderNodePosition === BorderNodePosition.SOUTH) {
            const southBorderNodePositionY = (change.dimensions?.height ?? 0) - borderNodeOffset;
            newChanges.push({
              id: node.id,
              type: 'position',
              position: { x: node.position.x, y: southBorderNodePositionY },
            });
          } else {
            newChanges.push({
              id: node.id,
              type: 'position',
              position: { x: node.position.x, y: node.position.y },
            });
          }
        }
      });
  }
  return newChanges;
};

const applyMoveToListChild = (
  resizedNode: Node<NodeData>,
  nodes: Node<NodeData>[],
  _change: NodeDimensionChange,
  zoom: number
): NodeChange<Node<NodeData>>[] => {
  if (isListData(resizedNode)) {
    const insideLabel = resizedNode.data.insideLabel;
    if (insideLabel && insideLabel.isHeader && insideLabel.headerPosition === 'TOP') {
      const element = document.querySelector(`[data-id="${insideLabel.id}"]`);
      if (element) {
        const borderOffset = insideLabel.displayHeaderSeparator
          ? getBorderWidth(resizedNode) * 2
          : getBorderWidth(resizedNode);
        const newLabelHeight = element.getBoundingClientRect().height / zoom + borderOffset + resizedNode.data.topGap;
        return nodes
          .filter((node) => node.parentId === resizedNode.id && !node.hidden && !node.data.isBorderNode)
          .map((node, index, array) => {
            const previousSibling = array[index - 1];
            let newPositionY: number = newLabelHeight;
            if (previousSibling) {
              newPositionY = previousSibling.position.y + (previousSibling.height ?? 0);
            }
            return {
              id: node.id,
              type: 'position',
              position: { x: node.position.x, y: newPositionY },
            };
          });
      }
    }
  }
  return [];
};

/**
 * Snaps the size a resize is about to give a node to the grid.
 *
 * The resizer snaps the pointer, not the size: the new size is the size the node
 * started with plus a whole number of grid steps. A node whose size is not a
 * multiple of the step to begin with - the layout gives it one computed from its
 * border and its measured label - therefore keeps that remainder through every
 * resize, and the modeller sees sizes such as 102 where the grid promises 100.
 * Rounding the size itself puts the node back on the grid on the first resize.
 * The size is never rounded below one step, which would collapse the node.
 */
const snapDimensionsToGrid = (change: NodeDimensionChange, snapGrid: [number, number]): NodeDimensionChange => {
  if (!change.dimensions) {
    return change;
  }
  const [stepX, stepY] = snapGrid;
  const snap = (size: number, step: number): number =>
    step > 0 ? Math.max(step, Math.round(size / step) * step) : size;
  return {
    ...change,
    dimensions: {
      width: snap(change.dimensions.width, stepX),
      height: snap(change.dimensions.height, stepY),
    },
  };
};

export const useResizeChange = (): UseResizeChangeValue => {
  const { getNodes } = useStore();
  const store = useStoreApi<Node<NodeData>, Edge<EdgeData>>();

  const transformResizeListNodeChanges = useCallback(
    (changes: NodeChange<Node<NodeData>>[]): NodeChange<Node<NodeData>>[] => {
      const { transform, snapToGrid, snapGrid } = store.getState();
      const zoom = transform[2];
      const newResizeListContainChanges: NodeChange<Node<NodeData>>[] = [];
      const newBorderNodeMoveChanges: NodeChange<Node<NodeData>>[] = [];
      const updatedChanges: NodeChange<Node<NodeData>>[] = changes.map((change) => {
        // The size the resize gives the node is snapped before anything is derived from it, so that
        // the children and the border nodes laid out below follow the snapped size, not the raw one.
        const currentChange = snapToGrid && isResizing(change) ? snapDimensionsToGrid(change, snapGrid) : change;
        if (isResizing(currentChange)) {
          const resizedNode = getNodes().find((node) => currentChange.id === node.id);
          if (resizedNode) {
            newResizeListContainChanges.push(...applyResizeToListContain(resizedNode, getNodes(), currentChange));
            newBorderNodeMoveChanges.push(...applyMoveToBorderNodes(resizedNode, getNodes(), currentChange));
            newResizeListContainChanges.push(...applyMoveToListChild(resizedNode, getNodes(), currentChange, zoom));
          }
        }
        if (isMove(currentChange)) {
          const isCurrentMovedNodeNotResized = (node: Node<NodeData>) =>
            changes.filter((change) => isResize(change) && change.id === node.id).length === 0;

          const movedNode = getNodes()
            .filter((node) => !node.data.isBorderNode)
            .filter(isCurrentMovedNodeNotResized)
            .find((node) => currentChange.id === node.id);
          if (movedNode) {
            return applyMoveToListContain(movedNode, getNodes(), currentChange);
          }
          const borderNodeMoved = getNodes()
            .filter((node) => node.data.isBorderNode)
            .find((node) => currentChange.id === node.id);
          if (
            borderNodeMoved &&
            newBorderNodeMoveChanges.some(
              (borderNodeMoveChange) => isMove(borderNodeMoveChange) && borderNodeMoveChange.id === borderNodeMoved.id
            )
          ) {
            // We have already computed a new position for this border node
            currentChange.position = undefined;
          }
        }
        return currentChange;
      });
      return [...newBorderNodeMoveChanges, ...updatedChanges, ...newResizeListContainChanges];
    },
    [getNodes]
  );

  const applyResizeByUserState = (
    changes: NodeChange<Node<NodeData>>[],
    nodes: Node<NodeData, DiagramNodeType>[]
  ): Node<NodeData, DiagramNodeType>[] => {
    return nodes.map((node) => {
      if (changes.filter(isResizeFinished).find((dimensionChange) => dimensionChange.id === node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            resizedByUser: true,
          },
        };
      }
      return node;
    });
  };

  return { transformResizeListNodeChanges, applyResizeByUserState };
};
