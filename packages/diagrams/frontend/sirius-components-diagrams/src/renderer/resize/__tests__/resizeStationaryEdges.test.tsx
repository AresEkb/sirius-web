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

import { cleanup, render } from '@testing-library/react';
import { NodeChange, NodeDimensionChange } from '@xyflow/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useResizeChange } from '../useResizeChange';

interface Point {
  x: number;
  y: number;
}
interface ResizeNode {
  id: string;
  type: string;
  width: number;
  height: number;
  position: Point;
  internals: { positionAbsolute: Point };
  data: { style: Record<string, never> };
}

function node(id: string, x: number, y: number, width: number, height: number): ResizeNode {
  return {
    id,
    type: 'rectangularNode',
    position: { x, y },
    width,
    height,
    internals: { positionAbsolute: { x, y } },
    data: { style: {} },
  };
}

function dimensions(width: number, height: number, resizing = true): NodeDimensionChange {
  return { id: 'shape', type: 'dimensions', dimensions: { width, height }, resizing };
}

const fixture = vi.hoisted(() => ({ nodes: new Map<string, ResizeNode>() }));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useStoreApi: () => ({
    getState: () => ({ nodeLookup: fixture.nodes, transform: [0, 0, 1], snapToGrid: true, snapGrid: [10, 10] }),
  }),
  useReactFlow: () => ({ getNodes: () => [...fixture.nodes.values()] }),
}));
vi.mock('../../../representation/useStore', () => ({
  useStore: () => ({ getNodes: () => [...fixture.nodes.values()] }),
}));

afterEach(cleanup);

function harness(initial: ResizeNode) {
  const nodes = new Map([[initial.id, initial]]);
  fixture.nodes = nodes;
  let resize: ReturnType<typeof useResizeChange>['transformResizeListNodeChanges'] | undefined;
  function Probe() {
    resize = useResizeChange().transformResizeListNodeChanges;
    return null;
  }
  render(<Probe />);
  if (!resize) throw new Error('Missing resize handler');
  const apply = resize;
  return {
    nodes,
    resize: (changes: NodeChange[]) => apply(changes as Parameters<typeof apply>[0]),
  };
}

it('does not round an unchanged off-grid height during a horizontal resize', () => {
  const editor = harness(node('shape', 100, 100, 103, 127));
  const changes = editor.resize([dimensions(123, 127)]);
  expect((changes[0] as NodeDimensionChange).dimensions).toEqual({ width: 120, height: 127 });
});

it('releases at the last applied preview size rather than raw control dimensions', () => {
  const editor = harness(node('shape', 100, 100, 103, 127));
  const preview = editor.resize([dimensions(123, 157)]);
  expect((preview[0] as NodeDimensionChange).dimensions).toEqual({ width: 120, height: 160 });
  editor.nodes.set('shape', node('shape', 100, 100, 120, 160));
  const released = editor.resize([dimensions(123, 157, false)]);
  expect((released[0] as NodeDimensionChange).dimensions).toEqual({ width: 120, height: 160 });
});
