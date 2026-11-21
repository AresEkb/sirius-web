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

import { Dimensions, InternalNode, Node, Position, XYPosition } from '@xyflow/react';
import { NodeData } from '../DiagramRenderer.types';
import {
  FloatingEdgeEndpointContext,
  FloatingEdgeEndpointResolution,
  INodeLayoutHandler,
} from '../layout/LayoutEngine.types';

interface EndpointInput {
  node: InternalNode<Node<NodeData>>;
  handler?: INodeLayoutHandler<NodeData>;
  handleId: string;
  handlePoint: XYPosition;
  position: Position;
}

type Bounds = XYPosition & Dimensions;
type Resolution = FloatingEdgeEndpointResolution;
type Terminals = Partial<Record<'source' | 'target', Resolution>>;

const frame = ({ node }: EndpointInput): Bounds => ({
  ...node.internals.positionAbsolute,
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
});
const center = ({ x, y, width, height }: Bounds): XYPosition => ({ x: x + width / 2, y: y + height / 2 });
const valid = (bounds: Bounds) => Object.values(bounds).every(Number.isFinite) && bounds.width > 0 && bounds.height > 0;
const hasFixedHandle = (node: Node<NodeData>, handleId?: string | null) =>
  node.data.connectionHandles?.find((handle) => handle.id === handleId)?.XYPosition != null;
const fixedPoint = ({ node, handleId, handlePoint, position }: EndpointInput): XYPosition | undefined =>
  hasFixedHandle(node, handleId)
    ? {
        x: handlePoint.x + (position === Position.Left ? -2 : position === Position.Right ? 2 : 0),
        y: handlePoint.y + (position === Position.Top ? -2 : position === Position.Bottom ? 2 : 0),
      }
    : undefined;

export const canAlignEdgeHandle = (
  node: Node<NodeData>,
  handleId: string | null | undefined,
  handler?: INodeLayoutHandler<NodeData>
) => !hasFixedHandle(node, handleId) && handler?.canAlignEdgeHandle?.(node, handleId ?? '') !== false;

const resolve = (
  input: EndpointInput,
  bounds: Bounds,
  reference: XYPosition,
  projection: FloatingEdgeEndpointContext['projection'],
  endpoint: FloatingEdgeEndpointContext['endpoint']
): Resolution | undefined => {
  const resolved = input.handler?.resolveFloatingEdgeEndpoint?.({
    node: input.node,
    bounds,
    reference,
    projection,
    endpoint,
  });
  return resolved && Number.isFinite(resolved.point.x) && Number.isFinite(resolved.point.y) ? resolved : undefined;
};

export const resolveFloatingEdgeEndpoints = (
  source: EndpointInput,
  target: EndpointInput,
  projection: FloatingEdgeEndpointContext['projection'],
  bends: XYPosition[],
  straightOnly = false
): Terminals => {
  const sourceBounds = frame(source);
  const targetBounds = frame(target);
  if (
    !valid(sourceBounds) ||
    !valid(targetBounds) ||
    bends.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))
  ) {
    return {};
  }
  const fixedSource = fixedPoint(source);
  const fixedTarget = fixedPoint(target);
  const sourceReference = fixedSource ?? center(sourceBounds);
  const targetReference = fixedTarget ?? center(targetBounds);
  if (
    straightOnly &&
    (bends.length || (sourceReference.x !== targetReference.x && sourceReference.y !== targetReference.y))
  ) {
    return {};
  }
  const targetTerminal = fixedTarget
    ? undefined
    : resolve(target, targetBounds, bends[bends.length - 1] ?? sourceReference, projection, 'target');
  const sourceTerminal = fixedSource
    ? undefined
    : resolve(
        source,
        sourceBounds,
        bends[0] ?? fixedTarget ?? targetTerminal?.point ?? targetReference,
        projection,
        'source'
      );
  return { source: sourceTerminal, target: targetTerminal };
};

export const resolveFloatingOrthogonalRoute = (
  source: EndpointInput,
  target: EndpointInput,
  createRoute: (from: Resolution, to: Resolution) => XYPosition[]
) => {
  const a = frame(source);
  const b = frame(target);
  if (!valid(a) || !valid(b) || (fixedPoint(source) && fixedPoint(target))) {
    return undefined;
  }
  const aCenter = center(a);
  const bCenter = center(b);
  if (aCenter.x === bCenter.x || aCenter.y === bCenter.y) {
    return undefined;
  }
  const horizontal = (a.x + a.width <= b.x || b.x + b.width <= a.x) && a.y <= b.y + b.height && b.y <= a.y + a.height;
  const vertical = (a.y + a.height <= b.y || b.y + b.height <= a.y) && a.x <= b.x + b.width && b.x <= a.x + a.width;
  if (!horizontal && !vertical) {
    return undefined;
  }
  const seed = (
    input: EndpointInput,
    bounds: Bounds,
    own: XYPosition,
    other: XYPosition,
    endpoint: 'source' | 'target'
  ) => {
    const fixed = fixedPoint(input);
    return fixed
      ? { point: fixed, position: input.position }
      : resolve(
          input,
          bounds,
          horizontal ? { x: other.x, y: own.y } : { x: own.x, y: other.y },
          'orthogonal',
          endpoint
        );
  };
  const from = seed(source, a, aCenter, bCenter, 'source');
  const to = seed(target, b, bCenter, aCenter, 'target');
  if (!from || !to) {
    return undefined;
  }
  const bendingPoints = createRoute(from, to);
  const terminals = resolveFloatingEdgeEndpoints(source, target, 'orthogonal', bendingPoints);
  const stable = (input: EndpointInput, first: Resolution, last?: Resolution) =>
    !!fixedPoint(input) ||
    (last?.position === first.position && last.point.x === first.point.x && last.point.y === first.point.y);
  // A generated route is valid only if it attaches at the same points as the route calculation.
  return stable(source, from, terminals.source) && stable(target, to, terminals.target)
    ? { terminals, bendingPoints }
    : undefined;
};
