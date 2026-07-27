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

import { act, cleanup, render } from '@testing-library/react';
import { Node, NodeChange, NodeDimensionChange } from '@xyflow/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NodeData } from '../../DiagramRenderer.types';
import { HelperLinesContext } from '../HelperLinesContext';
import { useHelperLines } from '../useHelperLines';

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

function harness(initial: ResizeNode, helpers: boolean) {
  const nodes = new Map([[initial.id, initial]]);
  fixture.nodes = nodes;
  const current = {} as { helpers: ReturnType<typeof useHelperLines> };
  function Probe() {
    current.helpers = useHelperLines();
    return null;
  }
  render(
    <HelperLinesContext.Provider value={{ isHelperLineEnabled: helpers, setHelperLineEnabled: () => {} }}>
      <Probe />
    </HelperLinesContext.Provider>
  );
  return {
    nodes,
    helperLines: () => current.helpers.horizontalHelperLine,
    align(changes: NodeChange[]) {
      act(() => {
        current.helpers.applyHelperLines(changes as NodeChange<Node<NodeData>>[]);
      });
    },
  };
}

for (const helpers of [true, false]) {
  it(`does not snap the bottom when a top-right drag pauses vertically (helpers=${helpers})`, () => {
    const editor = harness(node('shape', 100, 100, 100, 100), helpers);
    editor.align([{ id: 'shape', type: 'position', position: { x: 100, y: 80 } }, dimensions(130, 120)]);
    editor.nodes.set('shape', node('shape', 100, 80, 130, 120));
    editor.nodes.set('bottom-trap', node('bottom-trap', 350, 203, 100, 100));
    const next = dimensions(140, 120);
    editor.align([next]);
    expect(next.dimensions).toEqual({ width: 140, height: 120 });
    expect(editor.nodes.get('shape')!.position.y + next.dimensions!.height).toBe(200);
    expect(editor.helperLines()).toBeNull();
  });
}
