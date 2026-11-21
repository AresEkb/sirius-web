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
import { InternalNode, Node, Position, XYPosition } from '@xyflow/react';
import { NodeData } from '../../DiagramRenderer.types';

export type RouteNode = InternalNode<Node<NodeData>>;

export const projectToNodeBounds = (point: XYPosition, node: RouteNode): XYPosition => {
  if (!node.width || !node.height) {
    return point;
  }
  const { x, y } = node.internals.positionAbsolute;
  return { x: Math.max(x, Math.min(x + node.width, point.x)), y: Math.max(y, Math.min(y + node.height, point.y)) };
};

export const clipSegmentRouteToNode = (route: XYPosition[], node: RouteNode): XYPosition[] => {
  const start = route[0];
  if (!start || !node.width || !node.height) {
    return route;
  }
  const { x: left, y: top } = node.internals.positionAbsolute;
  const right = left + node.width;
  const bottom = top + node.height;
  let previous = projectToNodeBounds(start, node);
  for (const [index, point] of route.entries()) {
    if (point.x < left || point.x > right || point.y < top || point.y > bottom) {
      const terminal =
        point.x < left
          ? { x: left, y: previous.y }
          : point.x > right
          ? { x: right, y: previous.y }
          : point.y < top
          ? { x: previous.x, y: top }
          : { x: previous.x, y: bottom };
      return [terminal, ...route.slice(index)];
    }
    previous = point;
  }
  return route;
};

export const simplifySegmentRoute = (route: XYPosition[]): XYPosition[] => {
  const simplified: XYPosition[] = [];
  for (const point of route) {
    const last = simplified[simplified.length - 1];
    if (last?.x === point.x && last.y === point.y) {
      continue;
    }
    while (simplified.length > 1) {
      const a = simplified[simplified.length - 2]!;
      const b = simplified[simplified.length - 1]!;
      if (!((a.x === b.x && b.x === point.x) || (a.y === b.y && b.y === point.y))) {
        break;
      }
      simplified.pop();
    }
    simplified.push(point);
  }
  return simplified;
};

export const getTerminalSide = (point: XYPosition, next: XYPosition): Position =>
  point.x === next.x
    ? next.y < point.y
      ? Position.Top
      : Position.Bottom
    : next.x < point.x
    ? Position.Left
    : Position.Right;

export const clipSegmentRoute = (route: XYPosition[], source: RouteNode, target: RouteNode): XYPosition[] => {
  const fromSource = clipSegmentRouteToNode(simplifySegmentRoute(route), source);
  return simplifySegmentRoute(clipSegmentRouteToNode(fromSource.reverse(), target).reverse());
};
