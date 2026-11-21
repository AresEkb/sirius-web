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
import { resolveFloatingEdgeEndpoints } from './FloatingEdgeEndpoints';
import { Edge, EdgeProps, InternalNode, Node, useInternalNode, Position } from '@xyflow/react';
import { useContext, memo } from 'react';
import { NodeTypeContext } from '../../contexts/NodeContext';
import { NodeTypeContextValue } from '../../contexts/NodeContext.types';
import { NodeData } from '../DiagramRenderer.types';
import { DiagramNodeType } from '../node/NodeTypes.types';
import { getHandleCoordinatesByPosition } from './EdgeLayout';
import { MultiLabelEdgeData } from './MultiLabelEdge.types';
import { MultiLabelObliqueEditableEdge } from './oblique-edge/MultiLabelObliqueEditableEdge';

export const ObliqueEdgeWrapper = memo((props: EdgeProps<Edge<MultiLabelEdgeData>>) => {
  const {
    source,
    target,
    markerEnd,
    markerStart,
    sourcePosition: initialSourcePosition,
    targetPosition: initialTargetPosition,
    sourceHandleId,
    targetHandleId,
    data,
  } = props;
  const { nodeLayoutHandlers } = useContext<NodeTypeContextValue>(NodeTypeContext);

  const sourceNode: InternalNode<Node<NodeData>> | undefined = useInternalNode<Node<NodeData>>(source);
  const targetNode: InternalNode<Node<NodeData>> | undefined = useInternalNode<Node<NodeData>>(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceLayoutHandler = nodeLayoutHandlers.find((nodeLayoutHandler) =>
    nodeLayoutHandler.canHandle(sourceNode as Node<NodeData, DiagramNodeType>)
  );
  const targetLayoutHandler = nodeLayoutHandlers.find((nodeLayoutHandler) =>
    nodeLayoutHandler.canHandle(targetNode as Node<NodeData, DiagramNodeType>)
  );

  let { x: sourceX, y: sourceY } = getHandleCoordinatesByPosition(
    sourceNode,
    initialSourcePosition,
    sourceHandleId ?? '',
    sourceLayoutHandler?.calculateCustomNodeEdgeHandlePosition
  );
  let { x: targetX, y: targetY } = getHandleCoordinatesByPosition(
    targetNode,
    initialTargetPosition,
    targetHandleId ?? '',
    targetLayoutHandler?.calculateCustomNodeEdgeHandlePosition
  );

  let sourcePosition = initialSourcePosition;
  let targetPosition = initialTargetPosition;
  const sourceInput = {
    node: sourceNode,
    handler: sourceLayoutHandler,
    handleId: sourceHandleId ?? '',
    handlePoint: { x: sourceX, y: sourceY },
    position: sourcePosition,
  };
  const targetInput = {
    node: targetNode,
    handler: targetLayoutHandler,
    handleId: targetHandleId ?? '',
    handlePoint: { x: targetX, y: targetY },
    position: targetPosition,
  };
  const staleRelativeRoute = data?.relativePositionBendingPoints && sourceNode.data.moving && targetNode.data.moving;
  const floating = staleRelativeRoute
    ? {}
    : resolveFloatingEdgeEndpoints(sourceInput, targetInput, 'radial', data?.bendingPoints ?? []);
  // trick to have the source of the edge positioned at the very border of a node
  // if the edge has a marker, then only the marker need to touch the node
  const handleSourceRadius = markerStart == undefined || markerStart.includes('None') ? 2 : 3;
  switch (sourcePosition) {
    case Position.Right:
      sourceX = sourceX + handleSourceRadius;
      break;
    case Position.Left:
      sourceX = sourceX - handleSourceRadius;
      break;
    case Position.Top:
      sourceY = sourceY - handleSourceRadius;
      break;
    case Position.Bottom:
      sourceY = sourceY + handleSourceRadius;
      break;
  }
  // trick to have the target of the edge positioned at the very border of a node
  // if the edge has a marker, then only the marker need to touch the node
  const handleTargetRadius = markerEnd == undefined || markerEnd.includes('None') ? 2 : 3;
  switch (targetPosition) {
    case Position.Right:
      targetX = targetX + handleTargetRadius;
      break;
    case Position.Left:
      targetX = targetX - handleTargetRadius;
      break;
    case Position.Top:
      targetY = targetY - handleTargetRadius;
      break;
    case Position.Bottom:
      targetY = targetY + handleTargetRadius;
      break;
  }

  if (floating.source) {
    ({ x: sourceX, y: sourceY } = floating.source.point);
    sourcePosition = floating.source.position;
  }
  if (floating.target) {
    ({ x: targetX, y: targetY } = floating.target.point);
    targetPosition = floating.target.position;
  }

  if (data?.relativePositionBendingPoints && sourceNode.data.moving && targetNode.data.moving) {
    data.bendingPoints = data.relativePositionBendingPoints.map((relativePositionBendingPoint) => ({
      x: relativePositionBendingPoint.x + sourceX,
      y: relativePositionBendingPoint.y + sourceY,
    }));
  }

  return (
    <MultiLabelObliqueEditableEdge
      {...props}
      sourcePosition={sourcePosition}
      targetPosition={targetPosition}
      sourceX={sourceX}
      sourceY={sourceY}
      targetX={targetX}
      targetY={targetY}
      bendingPoints={data?.bendingPoints ?? []}
    />
  );
});
