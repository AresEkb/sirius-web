/*******************************************************************************
 * Copyright (c) 2026 Obeo.
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
import { Node, NodeChange, NodeDimensionChange, NodePositionChange } from '@xyflow/react';
import { NodeData } from '../DiagramRenderer.types';

export const isResizing = (change: NodeChange<Node<NodeData>>): change is NodeDimensionChange =>
  change.type === 'dimensions' && (change.resizing ?? false);
export const isResize = (change: NodeChange<Node<NodeData>>): change is NodeDimensionChange =>
  change.type === 'dimensions';
export const isResizeFinished = (change: NodeChange<Node<NodeData>>): change is NodeDimensionChange =>
  change.type === 'dimensions' && typeof change.resizing === 'boolean' && !change.resizing;
export const isMoving = (change: NodeChange<Node<NodeData>>): change is NodePositionChange =>
  change.type === 'position' && typeof change.dragging === 'boolean' && change.dragging;
export const isMove = (change: NodeChange<Node<NodeData>>): change is NodePositionChange =>
  change.type === 'position' && !change.dragging;

/**
 * Whether a batch of changes is a plain one: nothing in it has to be laid out or written, so it can
 * be applied to what is drawn and left at that.
 *
 * <p>
 * A batch that carries a gesture coming to rest - a node let go of, a node whose resize has ended -
 * is never plain, whatever else travels with it. react-flow decides what travels together, and a
 * selection or a refresh arriving alongside the end of a gesture is ordinary rather than rare.
 * Applying such a batch as a plain change draws what the gesture did and tells nobody: no layout
 * follows it, so nothing is written, and the modeller's work comes back undone on the next reload
 * with no sign that anything went wrong.
 * </p>
 */
export const isPlainChangeBatch = (changes: NodeChange<Node<NodeData>>[]): boolean => {
  const isResetChange = changes.some((change) => change.type === 'replace');
  const isSelectChange = changes.some(
    (change) => change.type === 'select' && !change.id.startsWith('edgeAnchorNodeCreationHandles')
  );
  const isMeasuredOnly =
    changes.length === 1 && changes[0]?.type === 'dimensions' && typeof changes[0].resizing !== 'boolean';
  const carriesGesture = changes.some(
    (change) =>
      (change.type === 'dimensions' && typeof change.resizing === 'boolean') ||
      (change.type === 'position' && typeof change.dragging === 'boolean')
  );
  return !carriesGesture && (isResetChange || isSelectChange || isMeasuredOnly);
};
