/*******************************************************************************
 * Copyright (c) 2026 Denis Nikiforov.
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

import { Node, Position } from '@xyflow/react';
import { expect, it, vi } from 'vitest';
import { useHandles } from '../useHandles';

type Update = (nodes: Node[]) => Node[];

const fixture = vi.hoisted(() => ({ update: (_update: Update) => {}, queue: [] as Update[] }));
vi.mock('../../../representation/useStore', () => ({ useStore: () => ({ setNodes: fixture.update }) }));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useReactFlow: () => ({ setNodes: (update: Update) => fixture.queue.push(update) }),
}));

function harness() {
  const stale: Node[] = [
    { id: 'node', selected: true, data: {}, position: { x: 0, y: 0 } },
    {
      id: 'handleNode_node_left',
      type: 'handleNode',
      data: { nodeId: 'node', position: Position.Left },
      position: { x: 0, y: 0 },
    },
  ];
  let current = stale.map((node) => ({ ...node, selected: false })) as Node[];
  fixture.queue = [];
  fixture.update = (update) => {
    current = update(current);
  };
  return {
    handles: useHandles(),
    // The stale XYFlow render can only overwrite the current selection if a command
    // writes to the XYFlow queue instead of the diagram's controlled state.
    settle: () => (fixture.queue.length ? fixture.queue.reduce((nodes, update) => update(nodes), stale) : current),
  };
}

it('removes handles without restoring selection from the previous React Flow render', () => {
  const stand = harness();
  stand.handles.unMountHandles();
  expect(stand.settle().map(({ id, selected }) => ({ id, selected }))).toEqual([{ id: 'node', selected: false }]);
});

it('mounts handles against the current controlled nodes', () => {
  const stand = harness();
  stand.handles.mountNodeHandles('node', { x: 0, y: 0 }, 100, 50);
  expect(stand.settle().find((node) => node.id === 'node')?.selected).toBe(false);
  expect(stand.settle().some((node) => node.id === 'handleNode_node_right')).toBe(true);
});

it('updates handle positions without restoring selection', () => {
  const stand = harness();
  stand.handles.updateNodeHandles('node', { x: 0, y: 0 }, 100, 50);
  expect(stand.settle().find((node) => node.id === 'node')?.selected).toBe(false);
  expect(stand.settle().find((node) => node.id === 'handleNode_node_left')?.position).toEqual({ x: -20, y: 25 });
});
