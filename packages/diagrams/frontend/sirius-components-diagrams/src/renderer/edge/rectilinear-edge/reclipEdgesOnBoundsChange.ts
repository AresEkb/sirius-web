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
import { Edge, Node, NodeChange, Position, XYPosition } from '@xyflow/react';
import { EdgeData, NodeData } from '../../DiagramRenderer.types';
import { ConnectionHandle } from '../../handles/ConnectionHandles.types';
import { isDescendantOf } from '../../layout/layoutNode';
import { isEdgeAnchorNode } from '../../node/EdgeAnchorNode.types';
import { evaluateAbsolutePosition } from '../../node/NodeUtils';
import { DiagramNodeType } from '../../node/NodeTypes.types';
import { getEdgeParameters, getUpdatedHandleForNode, HANDLE_OFFSET } from '../EdgeLayout';
import { clipSegmentRoute, getTerminalSide, RouteNode, simplifySegmentRoute } from './SegmentRoute';

type DiagramNode = Node<NodeData, DiagramNodeType>;

export const isBoundsGestureChange = (change: NodeChange<Node<NodeData>>) =>
  (change.type === 'position' && typeof change.dragging === 'boolean') ||
  (change.type === 'dimensions' && typeof change.resizing === 'boolean');

export const toRouteNodes = (nodes: Node<NodeData>[]): Map<string, RouteNode> => {
  // Only the geometry of InternalNode is consumed here. Compute it from the
  // complete post-change snapshot, not yet measured by React Flow.
  const lookup = new Map(nodes.map((node) => [node.id, node as RouteNode]));
  return new Map(
    nodes.map((node) => [
      node.id,
      {
        ...node,
        measured: node.measured ?? {},
        internals: { positionAbsolute: evaluateAbsolutePosition(node, lookup), z: 0, userNode: node },
      },
    ])
  );
};

const isHorizontal = (position: Position) => position === Position.Left || position === Position.Right;
const hasSize = (node: RouteNode): node is RouteNode & { width: number; height: number } =>
  !!node.width && !!node.height && node.width > 0 && node.height > 0;

const terminal = (
  node: RouteNode & { width: number; height: number },
  initial: RouteNode,
  handle: ConnectionHandle,
  position = handle.position
): XYPosition => {
  const horizontal = isHorizontal(position);
  const length = horizontal ? node.height : node.width;
  const originalLength = (horizontal ? initial.height : initial.width) || length;
  const explicitOffset =
    handle.XYPosition && isHorizontal(handle.position) === horizontal
      ? (horizontal ? handle.XYPosition.y : handle.XYPosition.x) + HANDLE_OFFSET
      : null;
  const offset =
    explicitOffset === null ? length / 2 : Math.max(0, Math.min(length, (explicitOffset * length) / originalLength));
  const { x, y } = node.internals.positionAbsolute;
  return horizontal
    ? { x: x + (position === Position.Right ? node.width : 0), y: y + offset }
    : { x: x + offset, y: y + (position === Position.Bottom ? node.height : 0) };
};

export const reclipEdgesOnBoundsChange = (
  changes: NodeChange<Node<NodeData>>[],
  nodes: DiagramNode[],
  edges: Edge<EdgeData>[],
  original: { nodes: Map<string, RouteNode>; edges: Map<string, Edge<EdgeData>> },
  direction: string
): { nodes: DiagramNode[]; edges: Edge<EdgeData>[] } => {
  const changed = new Set(
    changes.flatMap((change) => (isBoundsGestureChange(change) && 'id' in change ? [change.id] : []))
  );
  if (!changed.size) {
    return { nodes, edges };
  }
  const lookup = toRouteNodes(nodes);
  const updatedHandles = new Map<string, ConnectionHandle[]>();
  const affected = (node: RouteNode): boolean => {
    for (let current: RouteNode | undefined = node; current; current = lookup.get(current.parentId ?? '')) {
      if (changed.has(current.id)) {
        return true;
      }
    }
    return false;
  };
  const save = (
    node: RouteNode,
    handle: ConnectionHandle,
    point: XYPosition,
    position: Position,
    explicit: boolean
  ) => {
    const handles = updatedHandles.get(node.id) ?? node.data.connectionHandles;
    const result =
      explicit && handle.id
        ? getUpdatedHandleForNode(
            { ...node, data: { ...node.data, connectionHandles: handles } },
            handle.edgeId,
            handle.id,
            point,
            position
          )
        : handles.map((candidate) => (candidate.id === handle.id ? { ...candidate, position } : candidate));
    updatedHandles.set(node.id, result);
  };

  const nextEdges = edges.map((edge) => {
    if (edge.type !== 'manhattan' || edge.source === edge.target || !edge.data) {
      return edge;
    }
    const source = lookup.get(edge.source);
    const target = lookup.get(edge.target);
    if (
      !source ||
      !target ||
      (!affected(source) && !affected(target)) ||
      !hasSize(source) ||
      !hasSize(target) ||
      source.data.isBorderNode ||
      target.data.isBorderNode ||
      isEdgeAnchorNode(source) ||
      isEdgeAnchorNode(target) ||
      isDescendantOf(source, target, lookup) ||
      isDescendantOf(target, source, lookup)
    ) {
      return edge;
    }

    const s = source.internals.positionAbsolute;
    const t = target.internals.positionAbsolute;
    if (
      s.x < t.x + target.width &&
      t.x < s.x + source.width &&
      s.y < t.y + target.height &&
      t.y < s.y + source.height
    ) {
      return edge;
    }
    const oldSource = original.nodes.get(source.id) ?? source;
    const oldTarget = original.nodes.get(target.id) ?? target;
    const sh = oldSource.data.connectionHandles.find((handle) => handle.id === edge.sourceHandle);
    const th = oldTarget.data.connectionHandles.find((handle) => handle.id === edge.targetHandle);
    if (!sh || !th) {
      return edge;
    }
    const originalEdge = original.edges.get(edge.id) ?? edge;
    let bends = (originalEdge.data?.bendingPoints ?? []).map((point) => ({ ...point }));
    if (!bends.length) {
      const { sourcePosition, targetPosition } = getEdgeParameters(source, target, lookup, direction, []);
      save(source, sh, terminal(source, oldSource, sh, sourcePosition), sourcePosition, !!sh.XYPosition);
      save(target, th, terminal(target, oldTarget, th, targetPosition), targetPosition, !!th.XYPosition);
      return edge;
    }

    const delta = { x: s.x - oldSource.internals.positionAbsolute.x, y: s.y - oldSource.internals.positionAbsolute.y };
    if (
      delta.x === t.x - oldTarget.internals.positionAbsolute.x &&
      delta.y === t.y - oldTarget.internals.positionAbsolute.y
    ) {
      bends = bends.map(({ x, y }) => ({ x: x + delta.x, y: y + delta.y }));
    }
    const start = terminal(source, oldSource, sh);
    const end = terminal(target, oldTarget, th);
    if (bends.length === 1 && isHorizontal(sh.position) === isHorizontal(th.position)) {
      bends.push({ ...bends[0]! });
    }
    const firstAxis = isHorizontal(sh.position) ? 'y' : 'x';
    const lastAxis = isHorizontal(th.position) ? 'y' : 'x';
    bends[0]![firstAxis] = start[firstAxis];
    bends[bends.length - 1]![lastAxis] = end[lastAxis];

    const route = simplifySegmentRoute([start, ...bends, end]);
    if (
      route.some((point, index) => {
        const previous = route[index - 1];
        return previous && point.x !== previous.x && point.y !== previous.y;
      })
    ) {
      return edge;
    }
    const clipped = clipSegmentRoute(route, source, target);
    if (clipped.length < 2) {
      return edge;
    }
    const first = clipped[0]!;
    const last = clipped[clipped.length - 1]!;
    save(source, sh, first, getTerminalSide(first, clipped[1]!), true);
    save(target, th, last, getTerminalSide(last, clipped[clipped.length - 2]!), true);
    const bendingPoints = clipped.slice(1, -1);
    return {
      ...edge,
      data: {
        ...edge.data,
        bendingPoints,
        relativePositionBendingPoints: bendingPoints.map(({ x, y }) => ({ x: x - first.x, y: y - first.y })),
      },
    };
  });
  return {
    nodes: nodes.map((node) => {
      const connectionHandles = updatedHandles.get(node.id);
      return connectionHandles ? { ...node, data: { ...node.data, connectionHandles } } : node;
    }),
    edges: nextEdges.some((edge, index) => edge !== edges[index]) ? nextEdges : edges,
  };
};
