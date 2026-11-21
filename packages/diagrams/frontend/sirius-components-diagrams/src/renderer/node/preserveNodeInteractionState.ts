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

import { Node } from '@xyflow/react';
import { NodeData } from '../DiagramRenderer.types';

export const preserveNodeInteractionState = <T extends Node<NodeData>>(newNodes: T[], previousNodes: T[]): T[] => {
  const previousById = new Map<string, T>();
  for (const node of previousNodes) {
    const id = node.id;
    if (!previousById.has(id)) {
      previousById.set(id, node);
    }
  }
  return newNodes.map((newNode) => {
    const previousNode = previousById.get(newNode.id);
    if (previousNode) {
      newNode.data.isDraggedNode = previousNode.data.isDraggedNode;
      newNode.data.isDragNodeSource = previousNode.data.isDragNodeSource;
      newNode.data.isDropNodeTarget = previousNode.data.isDropNodeTarget;
      newNode.data.isDropNodeCandidate = previousNode.data.isDropNodeCandidate;
    }
    return newNode;
  });
};
