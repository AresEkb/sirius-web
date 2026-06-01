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

export const computePreviousPosition = (
  previousNode: Node<NodeData, DiagramNodeType> | undefined,
  node: Node<NodeData, DiagramNodeType>
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

    previousPosition = previousNode.position;
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
