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

import { Dimensions, Node } from '@xyflow/react';
import { NodeData } from '../DiagramRenderer.types';
import { DiagramNodeType } from '../node/NodeTypes.types';
import { FreeFormNodeLayoutHandler } from './FreeFormNodeLayoutHandler';
import { IconLabelNodeLayoutHandler } from './IconLabelNodeLayoutHandler';
import { ILayoutEngine, INodeLayoutHandler } from './LayoutEngine.types';
import { ListNodeLayoutHandler } from './ListNodeLayoutHandler';
import { RawDiagram } from './layout.types';

type LayoutNode = Node<NodeData, DiagramNodeType>;

export class LayoutEngine implements ILayoutEngine {
  private childrenIndex: { nodes: LayoutNode[]; byParent: Map<string, LayoutNode[]> } | null = null;

  nodeLayoutHandlers: INodeLayoutHandler<NodeData>[] = [
    new FreeFormNodeLayoutHandler(),
    new ListNodeLayoutHandler(),
    new IconLabelNodeLayoutHandler(),
  ];

  public layoutNodes(
    previousDiagram: RawDiagram | null,
    visibleNodes: Node<NodeData, DiagramNodeType>[],
    nodesToLayout: Node<NodeData, DiagramNodeType>[],
    newlyAddedNodes: Node<NodeData, DiagramNodeType>[],
    forceDimensions?: Dimensions
  ) {
    const previousIndex = this.childrenIndex;
    let index = previousIndex;
    if (index?.nodes !== visibleNodes) {
      const byParent = new Map<string, LayoutNode[]>();
      for (const node of visibleNodes) {
        const parentId = node.parentId;
        if (parentId !== undefined) {
          const children = byParent.get(parentId);
          if (children) {
            children.push(node);
          } else {
            byParent.set(parentId, [node]);
          }
        }
      }
      index = { nodes: visibleNodes, byParent };
    }
    this.childrenIndex = index;
    const { byParent } = index;
    try {
      nodesToLayout.forEach((node) => {
        const nodeLayoutHandler: INodeLayoutHandler<NodeData> | undefined = this.nodeLayoutHandlers.find((handler) =>
          handler.canHandle(node)
        );
        if (nodeLayoutHandler) {
          const directChildren = byParent.get(node.id)?.slice() ?? [];
          nodeLayoutHandler.handle(
            this,
            previousDiagram,
            node,
            visibleNodes,
            directChildren,
            newlyAddedNodes,
            forceDimensions
          );

          node.style = {
            ...node.style,
            width: `${node.width}px`,
            height: `${node.height}px`,
          };
        }
      });
    } finally {
      this.childrenIndex = previousIndex;
    }
  }

  public registerNodeLayoutHandlerContribution(nodeLayoutHandlerContribution: INodeLayoutHandler<NodeData>) {
    this.nodeLayoutHandlers.push(nodeLayoutHandlerContribution);
  }
}
