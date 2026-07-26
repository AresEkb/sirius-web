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
import {
  Dimensions,
  Edge,
  Node,
  NodeChange,
  NodeDimensionChange,
  NodePositionChange,
  useStoreApi,
  XYPosition,
} from '@xyflow/react';
import { useCallback, useContext } from 'react';
import { NodeTypeContext } from '../../contexts/NodeContext';
import { NodeTypeContextValue } from '../../contexts/NodeContext.types';
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

const applyMoveToBorderNodes = (
  resizedNode: Node<NodeData>,
  nodes: Node<NodeData>[],
  change: NodeDimensionChange,
  calculateCustomNodeBorderNodePosition?: (
    node: Node<NodeData>,
    borderNode: XYPosition & Dimensions,
    isDragging: boolean
  ) => XYPosition
) => {
  const newChanges: NodeChange<Node<NodeData>>[] = [];
  if (resizedNode.width && resizedNode.height && change.dimensions) {
    const resizedNodeNewBounds: Node<NodeData> = {
      ...resizedNode,
      width: change.dimensions.width,
      height: change.dimensions.height,
    };
    nodes
      .filter((node) => node.data.isBorderNode)
      .forEach((node) => {
        if (node.parentId === resizedNode.id) {
          node.extent = getBorderNodeExtent(resizedNodeNewBounds, node);
          if (calculateCustomNodeBorderNodePosition) {
            // The kind of the node being resized places the nodes on its borders itself, so they
            // follow the size it is given while it is being resized the same way they do once the
            // next full layout arrives.
            newChanges.push({
              id: node.id,
              type: 'position',
              position: calculateCustomNodeBorderNodePosition(
                resizedNodeNewBounds,
                {
                  x: node.position.x,
                  y: node.position.y,
                  width: node.width ?? 0,
                  height: node.height ?? 0,
                },
                true
              ),
            });
          } else if (node.data.borderNodePosition === BorderNodePosition.EAST) {
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

export const useResizeChange = (): UseResizeChangeValue => {
  const { getNodes } = useStore();
  const store = useStoreApi<Node<NodeData>, Edge<EdgeData>>();
  const { nodeLayoutHandlers } = useContext<NodeTypeContextValue>(NodeTypeContext);

  const transformResizeListNodeChanges = useCallback(
    (changes: NodeChange<Node<NodeData>>[]): NodeChange<Node<NodeData>>[] => {
      const zoom = store.getState().transform[2];
      const newResizeListContainChanges: NodeChange<Node<NodeData>>[] = [];
      const newBorderNodeMoveChanges: NodeChange<Node<NodeData>>[] = [];
      const updatedChanges: NodeChange<Node<NodeData>>[] = changes.map((currentChange) => {
        if (isResizing(currentChange)) {
          const resizedNode = getNodes().find((node) => currentChange.id === node.id);
          if (resizedNode) {
            // Let the node kind's layout handler lay its neighbourhood out live
            // during the drag - for instance pushing the siblings that follow a
            // resized child and growing its parent, or keeping the nodes on its
            // borders where it draws them - rather than waiting for the next full
            // layout. The generic renderer stays unaware of any particular kind.
            const nodeLayoutHandler = nodeLayoutHandlers.find((handler) => handler.canHandle(resizedNode));
            newResizeListContainChanges.push(...applyResizeToListContain(resizedNode, getNodes(), currentChange));
            newBorderNodeMoveChanges.push(
              ...applyMoveToBorderNodes(
                resizedNode,
                getNodes(),
                currentChange,
                nodeLayoutHandler?.calculateCustomNodeBorderNodePosition?.bind(nodeLayoutHandler)
              )
            );
            newResizeListContainChanges.push(...applyMoveToListChild(resizedNode, getNodes(), currentChange, zoom));
            if (nodeLayoutHandler?.transformResizeChange) {
              // A leading-edge resize (top or left) also moves the node's origin,
              // so its companion position change rides in the same batch. Passing
              // it lets the handler tell a leading-edge drag from a trailing one.
              const companionMove = changes.find((change) => isMove(change) && change.id === currentChange.id) as
                | NodePositionChange
                | undefined;
              newResizeListContainChanges.push(
                ...nodeLayoutHandler.transformResizeChange(resizedNode, getNodes(), currentChange, companionMove)
              );
            }
          }
        }
        if (isResizeFinished(currentChange)) {
          // Letting go of a resize is reported on its own: a size the resize control
          // accumulated, with no origin beside it. The node kind's layout handler is
          // given it too, so that a kind whose drag lays out more than the node being
          // resized can settle what it laid out - hold the neighbourhood to the sizes
          // the drag gave it, rather than letting this last raw size land on the one
          // node react-flow reports and undo them.
          const resizedNode = getNodes().find((node) => currentChange.id === node.id);
          if (resizedNode) {
            const nodeLayoutHandler = nodeLayoutHandlers.find((handler) => handler.canHandle(resizedNode));
            if (nodeLayoutHandler?.transformResizeChange) {
              newResizeListContainChanges.push(
                ...nodeLayoutHandler.transformResizeChange(resizedNode, getNodes(), currentChange)
              );
            }
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
    [getNodes, nodeLayoutHandlers]
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
