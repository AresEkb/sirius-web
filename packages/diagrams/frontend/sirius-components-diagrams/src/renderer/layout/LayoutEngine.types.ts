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
  Node,
  NodeChange,
  NodeDimensionChange,
  NodePositionChange,
  Position,
  XYPosition,
} from '@xyflow/react';
import { NodeHandle } from '@xyflow/system';
import { NodeData } from '../DiagramRenderer.types';
import { DiagramNodeType } from '../node/NodeTypes.types';
import { ForcedDimensions, RawDiagram } from './layout.types';

export interface ILayoutEngine {
  registerNodeLayoutHandlerContribution(nodeLayoutHandlerContribution: INodeLayoutHandler<NodeData>);

  layoutNodes(
    previousDiagram: RawDiagram | null,
    visibleNodes: Node<NodeData, DiagramNodeType>[],
    nodesToLayout: Node<NodeData, DiagramNodeType>[],
    newlyAddedNode: Node<NodeData, DiagramNodeType>[],
    forceDimensions?: ForcedDimensions
  );
}

export interface INodeLayoutHandler<T extends NodeData> {
  canHandle(node: Node<NodeData, DiagramNodeType>);

  handle(
    layoutEngine: ILayoutEngine,
    previousDiagram: RawDiagram | null,
    node: Node<T>,
    visibleNodes: Node<NodeData, DiagramNodeType>[],
    directChildren: Node<NodeData, DiagramNodeType>[],
    newlyAddedNode: Node<NodeData, DiagramNodeType>[],
    forceDimensions?: ForcedDimensions
  );

  calculateCustomNodeEdgeHandlePosition?(
    node: Node<NodeData>,
    handlePosition: Position,
    handle: NodeHandle
  ): XYPosition;

  calculateCustomNodeBorderNodePosition?(
    node: Node<NodeData>,
    borderNode: XYPosition & Dimensions,
    isDragging: boolean
  ): XYPosition;

  /**
   * Transforms the node changes produced while the given node of this handler's
   * kind is being resized interactively, letting the kind lay its neighbourhood
   * out live during the drag rather than only on the next full layout. It is
   * given the node being resized, the current nodes and the raw resize change,
   * and returns the extra changes to apply, for example moving the siblings that
   * follow the resized node and growing its parent. When the resize is dragging
   * the node's leading edge, react-flow also moves the node's origin, and that
   * companion position change is passed so the kind can tell a leading-edge drag
   * from a trailing-edge one. It is called once more when the resize is let go,
   * with the size the resize control accumulated and no companion position
   * change; a kind whose drag lays out more than the node being resized answers
   * that by settling what it laid out, since nothing is left to derive from a
   * size reported for one node alone. Kinds that need no live handling leave it
   * undefined.
   */
  transformResizeChange?(
    resizedNode: Node<NodeData>,
    nodes: Node<NodeData>[],
    change: NodeDimensionChange,
    positionChange?: NodePositionChange
  ): NodeChange<Node<NodeData>>[];
}
