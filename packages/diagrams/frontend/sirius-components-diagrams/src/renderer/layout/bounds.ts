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

import { Dimensions, Node, XYPosition } from '@xyflow/react';
import { NodeData } from '../DiagramRenderer.types';
import { DiagramNodeType } from '../node/NodeTypes.types';
import { defaultHeight, defaultWidth } from './layoutParams';

const computeAbsolutePosition = (
  node: Node<NodeData, DiagramNodeType>,
  nodes: Node<NodeData, DiagramNodeType>[]
): XYPosition => {
  const absolutePosition: XYPosition = { ...node.position };
  let parentId: string | undefined = node.parentId;
  while (parentId) {
    const parent = nodes.find((candidate) => candidate.id === parentId);
    if (!parent) {
      break;
    }
    absolutePosition.x += parent.position.x;
    absolutePosition.y += parent.position.y;
    parentId = parent.parentId;
  }
  return absolutePosition;
};

/**
 * The position the node already has in memory, read against the parent the incoming diagram gives it.
 * A position is relative to a parent, so it only means what it says together with that parent. When the two
 * differ, the node has been reparented, e.g. dragged from one container into another or out onto the diagram,
 * and its position still describes where it sits under its former parent. Keeping it as is would paint the
 * node at a stale offset under the new parent, so it is converted into the new parent's frame and the node
 * stays where it was released.
 */
const positionUnderParentOf = (
  previousNode: Node<NodeData, DiagramNodeType>,
  node: Node<NodeData, DiagramNodeType>,
  previousNodes: Node<NodeData, DiagramNodeType>[]
): XYPosition => {
  if (previousNode.parentId === node.parentId) {
    return previousNode.position;
  }
  const newParent = node.parentId ? previousNodes.find((candidate) => candidate.id === node.parentId) : undefined;
  if (node.parentId && !newParent) {
    // The new parent is unknown in the previous diagram, so there is no frame to convert into.
    return previousNode.position;
  }
  const releaseAbsolutePosition: XYPosition = computeAbsolutePosition(previousNode, previousNodes);
  const newParentAbsolutePosition: XYPosition = newParent
    ? computeAbsolutePosition(newParent, previousNodes)
    : { x: 0, y: 0 };
  return {
    x: releaseAbsolutePosition.x - newParentAbsolutePosition.x,
    y: releaseAbsolutePosition.y - newParentAbsolutePosition.y,
  };
};

export const computePreviousPosition = (
  previousNode: Node<NodeData, DiagramNodeType> | undefined,
  node: Node<NodeData, DiagramNodeType>,
  previousNodes: Node<NodeData, DiagramNodeType>[] = []
): XYPosition | null => {
  let previousPosition: XYPosition | null = null;
  if (previousNode) {
    /*
      The node already exists in memory, so we have already laid it out and the user sees it at that position.
      We keep that position even when the node is still flagged as new (its layout has not yet been persisted
      to the server, e.g. a node just created from the palette whose layout sync is still in flight). Otherwise
      an unrelated refresh arriving in that window would discard the placed position and the node would jump
      to a default location.
      */

    previousPosition = positionUnderParentOf(previousNode, node, previousNodes);
  } else if (node.data.isNew) {
    /*
      The node is brand new and we have never seen it.
      The node may have some position since the position is required by ReactFlow but the converter was forced to put {x: 0, y: 0}.
      We won't consider this position as relevant since the node is new; it will be placed from the reference position instead.
      */

    previousPosition = null;
  } else {
    /*
      We have a node with some layout data from the server but we do not have a previous node in memory.
      This node already existed and it has been laid out in the past but we have never seen it.
      We must be receiving the diagram with those layout data for the first time.
      We will thus consider the position of the node which has just been converted with its server layout data.
      */

    previousPosition = node.position;
  }
  return previousPosition;
};

export const computePreviousSize = (
  previousNode: Node<NodeData, DiagramNodeType> | undefined,
  node: Node<NodeData, DiagramNodeType>
): Dimensions => {
  let previousDimensions: Dimensions;
  const nodeDefaultHeight: number = node.data.defaultHeight ?? defaultHeight;
  const nodeDefaultWidth: number = node.data.defaultWidth ?? defaultWidth;

  if (previousNode) {
    // Keep the size the node already has in memory even when it is still flagged as new (its layout has not
    // yet been persisted), for the same reason as computePreviousPosition: an unrelated refresh in that window
    // must not reset a just-created node to its default size.
    previousDimensions = {
      height: previousNode.height ?? nodeDefaultHeight,
      width: previousNode.width ?? nodeDefaultWidth,
    };
  } else if (node.data.isNew) {
    previousDimensions = {
      height: nodeDefaultHeight,
      width: nodeDefaultWidth,
    };
  } else {
    previousDimensions = {
      height: node.height ?? nodeDefaultHeight,
      width: node.width ?? nodeDefaultWidth,
    };
  }

  return previousDimensions;
};
