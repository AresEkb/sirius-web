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
import { useEffect, useRef, useState } from 'react';
import { MutableRefObject } from 'react';
import { clipSegmentRoute, projectToNodeBounds } from './SegmentRoute';
import { DraggableData } from 'react-draggable';
import { useStore } from '../../../representation/useStore';
import { NodeData } from '../../DiagramRenderer.types';
import { XYPositionSetter } from './MultiLabelRectilinearEditableEdge.types';
import { determineSegmentAxis, getMiddlePoint, isOutOfLines } from './RectilinearEdgeCalculation';
import { BendPointData, LocalBendingPointsSetter } from './useBendingPoints.types';
import { useEdgeDragStopHandler } from './useEdgeDragStopHandler';
import { MiddlePoint, UseTemporaryLinesValue } from './useTemporaryLines.types';

export const useTemporaryLines = (
  edgeId: string,
  originalBendingPoints: XYPosition[],
  localBendingPoints: BendPointData[],
  setLocalBendingPoints: LocalBendingPointsSetter,
  sourceNode: InternalNode<Node<NodeData>>,
  sourceHandleId: string,
  sourcePosition: Position,
  source: XYPosition,
  setSource: XYPositionSetter,
  targetNode: InternalNode<Node<NodeData>>,
  targetHandleId: string,
  targetPosition: Position,
  target: XYPosition,
  setTarget: XYPositionSetter,
  segmentDragInProgress: MutableRefObject<boolean>
): UseTemporaryLinesValue => {
  const { handleDragStop } = useEdgeDragStopHandler();
  const { setNodes, getEdges, setEdges } = useStore();

  const [middleBendingPoints, setMiddleBendingPoints] = useState<MiddlePoint[]>([]);

  const [dragInProgress, setDragInProgress] = useState(false);
  const initialRoute = useRef<XYPosition[]>([]);
  const preview = useRef<XYPosition[] | null>(null);
  const reconnectable = useRef<boolean | 'source' | 'target' | undefined>(undefined);

  const onDragStart = () => {
    preview.current = null;
    initialRoute.current = [source, ...originalBendingPoints, target].map((point) => ({ ...point }));
  };

  const onTemporaryLineDragStop = () => {
    const route = preview.current;
    preview.current = null;
    segmentDragInProgress.current = false;
    setDragInProgress(false);
    if (!route) {
      return;
    }
    const first = route[0]!;
    const last = route[route.length - 1]!;
    handleDragStop(
      edgeId,
      first,
      setSource,
      sourceNode,
      sourceHandleId,
      sourcePosition,
      last,
      setTarget,
      targetNode,
      targetHandleId,
      targetPosition,
      true,
      true,
      route.slice(1, -1).map((point, pathOrder) => ({ ...point, pathOrder })),
      true
    );
    setEdges((edges) =>
      edges.map((edge) => (edge.id === edgeId ? { ...edge, reconnectable: reconnectable.current } : edge))
    );
  };

  const onTemporaryLineDrag = (eventData: DraggableData, index: number, direction: 'x' | 'y') => {
    if (!eventData.deltaX && !eventData.deltaY && !preview.current) {
      return;
    }
    const initial = initialRoute.current;
    const first = initial[index];
    const second = initial[index + 1];
    if (!first || !second) {
      return;
    }
    let route = initial.map((point) => ({ ...point }));
    route[0] = projectToNodeBounds(route[0]!, sourceNode);
    route[route.length - 1] = projectToNodeBounds(route[route.length - 1]!, targetNode);
    const coordinate = direction === 'x' ? 'y' : 'x';
    let mergeIndex = -1;
    let nearestDistance = 10;
    for (let i = 0; i < initial.length - 1; i++) {
      if (Math.abs(i - index) <= 1) {
        continue;
      }
      const a = initial[i]!;
      const b = initial[i + 1]!;
      if (a[coordinate] !== b[coordinate] || a[direction] === b[direction]) {
        continue;
      }
      const distance = Math.abs(a[coordinate] - eventData[coordinate]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        mergeIndex = i;
      }
    }
    if (mergeIndex >= 0) {
      route[mergeIndex]![coordinate] = eventData[coordinate];
      route[mergeIndex + 1]![coordinate] = eventData[coordinate];
    }
    route[index]![coordinate] = eventData[coordinate];
    route[index + 1]![coordinate] = eventData[coordinate];

    const centerTerminal = (point: XYPosition, node: InternalNode<Node<NodeData>>) => {
      if (node.width && node.height && isOutOfLines(eventData.x, eventData.y, direction, node)) {
        point[direction] =
          node.internals.positionAbsolute[direction] + (direction === 'x' ? node.width : node.height) / 2;
      }
    };
    if (index === 0) {
      centerTerminal(route[0]!, sourceNode);
    }
    if (index === route.length - 2) {
      centerTerminal(route[route.length - 1]!, targetNode);
    }
    route = clipSegmentRoute(route, sourceNode, targetNode);
    if (route.length < 2) {
      return;
    }

    if (!preview.current) {
      reconnectable.current = getEdges().find((edge) => edge.id === edgeId)?.reconnectable;
      setEdges((edges) => edges.map((edge) => (edge.id === edgeId ? { ...edge, reconnectable: false } : edge)));
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id !== sourceNode.id && node.id !== targetNode.id
            ? node
            : {
                ...node,
                data: {
                  ...node.data,
                  connectionHandles: node.data.connectionHandles.map((handle) =>
                    handle.edgeId === edgeId ? { ...handle, isHidden: true } : handle
                  ),
                },
              }
        )
      );
    }
    segmentDragInProgress.current = true;
    preview.current = route;
    setSource(route[0]!);
    setTarget(route[route.length - 1]!);
    setLocalBendingPoints(route.slice(1, -1).map((point, pathOrder) => ({ ...point, pathOrder })));

    // Keep the active Draggable in its original slot even after another bend disappears.
    let active: MiddlePoint | undefined;
    let largestOverlap = -1;
    const lower = Math.min(first[direction], second[direction]);
    const upper = Math.max(first[direction], second[direction]);
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1]!;
      const b = route[i]!;
      if (a[coordinate] === eventData[coordinate] && b[coordinate] === a[coordinate] && a[direction] !== b[direction]) {
        const overlap =
          Math.min(upper, Math.max(a[direction], b[direction])) - Math.max(lower, Math.min(a[direction], b[direction]));
        if (overlap > largestOverlap) {
          largestOverlap = overlap;
          active = { ...getMiddlePoint(a, b), direction, segmentLength: Math.abs(a[direction] - b[direction]) };
        }
      }
    }
    setMiddleBendingPoints((points) =>
      points.map((point, i) => (i === index && active ? active : { ...point, segmentLength: 0 }))
    );
    setDragInProgress(true);
  };

  const computeMiddlePoints = () => {
    const middlePoints: MiddlePoint[] = [];
    const reorderBendPoint = [...localBendingPoints].sort((a, b) => a.pathOrder - b.pathOrder);
    if (reorderBendPoint.length > 0) {
      for (let i = 0; i < reorderBendPoint.length; i++) {
        const p1 = i === 0 ? { x: source.x, y: source.y } : reorderBendPoint[i - 1];
        const p2 = reorderBendPoint[i];
        if (p1 && p2) {
          const direction = determineSegmentAxis(p1, p2);
          middlePoints.push({
            ...getMiddlePoint(p1, p2),
            direction: direction,
            segmentLength: direction === 'x' ? Math.abs(p1.x - p2.x) : Math.abs(p1.y - p2.y),
          });
        }
      }
      const lastPoint = reorderBendPoint[reorderBendPoint.length - 1];
      if (lastPoint) {
        const direction = determineSegmentAxis(lastPoint, target);
        middlePoints.push({
          ...getMiddlePoint(lastPoint, { x: target.x, y: target.y }),
          direction: direction,
          segmentLength: direction === 'x' ? Math.abs(lastPoint.x - target.x) : Math.abs(lastPoint.y - target.y),
        });
      }
    } else {
      const direction = determineSegmentAxis(source, target);
      middlePoints.push({
        ...getMiddlePoint({ x: source.x, y: source.y }, { x: target.x, y: target.y }),
        direction: direction,
        segmentLength: direction === 'x' ? Math.abs(source.x - target.x) : Math.abs(source.y - target.y),
      });
    }
    return middlePoints;
  };

  useEffect(() => {
    if (!dragInProgress) {
      setMiddleBendingPoints(computeMiddlePoints());
    }
  }, [localBendingPoints, source.x, source.y, target.x, target.y, dragInProgress]);

  return {
    middleBendingPoints,
    onDragStart,
    onTemporaryLineDragStop,
    onTemporaryLineDrag,
    isSegmentDragged: dragInProgress,
  };
};
