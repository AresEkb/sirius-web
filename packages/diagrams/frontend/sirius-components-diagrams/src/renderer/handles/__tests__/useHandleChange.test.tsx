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
import { cleanup, render } from '@testing-library/react';
import { Edge, Node, Position } from '@xyflow/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EdgeData, NodeData } from '../../DiagramRenderer.types';
import { useHandleChange } from '../useHandleChange';

const fixture = vi.hoisted(() => ({
  edges: [] as Edge<EdgeData>[],
  nodeLookup: new Map<string, Node<NodeData>>(),
  borderPosition: vi.fn(),
}));

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useStoreApi: () => ({ getState: () => ({ nodeLookup: fixture.nodeLookup }) }),
}));
vi.mock('../../../representation/useStore', () => ({
  useStore: () => ({ getEdges: () => fixture.edges }),
}));
vi.mock('../../../contexts/useDiagramDescription', () => ({
  useDiagramDescription: () => ({ diagramDescription: {} }),
}));
vi.mock('../../edge/EdgeLayout', () => {
  const parameters = () => ({ sourcePosition: Position.Right, targetPosition: Position.Left });
  return {
    getEdgeParameters: parameters,
    getEdgeParametersWhileMoving: parameters,
    getUpdatedConnectionHandle: () => ['border'],
    getUpdatedConnectionHandles: () => ({
      sourceConnectionHandles: ['source'],
      targetConnectionHandles: ['target'],
    }),
  };
});
vi.mock('../../layout/layoutBorderNodes', () => ({
  getBorderNodeParentIfExist: (node: Node<NodeData>) =>
    (node.parentId && fixture.nodeLookup.get(node.parentId)) || node,
  convertPositionToBorderNodePosition: () => 'EAST',
  computeBorderNodeXYPositionFromBorderNodePosition: fixture.borderPosition,
}));

afterEach(cleanup);

const node = (id: string, parentId?: string) => ({
  id,
  parentId,
  position: { x: 0, y: 0 },
  data: { connectionHandles: [], isBorderNode: !!parentId } as unknown as NodeData,
});

const setup = (nodes: ReturnType<typeof node>[], source: string, target: string) => {
  fixture.nodeLookup = new Map(nodes.map((node) => [node.id, node]));
  fixture.edges = [
    {
      id: 'edge',
      source,
      target,
      sourceHandle: 'source',
      targetHandle: 'target',
      data: { bendingPoints: [] } as unknown as EdgeData,
    },
  ];
  let apply: ReturnType<typeof useHandleChange>['applyHandleChange'] | undefined;
  function Probe() {
    apply = useHandleChange().applyHandleChange;
    return null;
  }
  render(<Probe />);
  if (!apply) {
    throw new Error('Missing hook result');
  }
  return apply;
};

it('updates both connected handles and retains unaffected node references', () => {
  const nodes = ['a', 'b', 'other'].map((id) => node(id));
  const apply = setup(nodes, 'a', 'b');
  const result = apply([{ id: 'a', type: 'position', dragging: true }], nodes);
  expect(result.map((node) => node.id)).toEqual(['a', 'b', 'other']);
  expect(result[0].data.connectionHandles).toEqual(['source']);
  expect(result[1].data.connectionHandles).toEqual(['target']);
  expect(result[2]).toBe(nodes[2]);
  expect(nodes[0].data.connectionHandles).toEqual([]);
  expect(apply([], nodes)).toEqual(nodes);
});

it('positions a border node from the already processed prefix', () => {
  const nodes = [node('parent'), node('prefix'), node('border', 'parent'), node('target')];
  fixture.borderPosition.mockImplementationOnce((_node, _all, processed) => {
    expect(processed).toEqual(nodes.slice(0, 2));
    return { x: 10, y: 20 };
  });
  const apply = setup(nodes, 'border', 'target');
  const result = apply([{ id: 'parent', type: 'position', dragging: true }], nodes);
  expect(fixture.borderPosition).toHaveBeenCalledTimes(1);
  expect(result[2].position).toEqual({ x: 10, y: 20 });
  expect(result[2].data.connectionHandles).toEqual(['border']);
  expect(result[2].data.borderNodePosition).toBe('EAST');
  expect(result[3]).toBe(nodes[3]);
});
