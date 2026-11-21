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

import { describe, expect, it } from 'vitest';
import { LayoutEngine } from '../LayoutEngine';
import { computeNewlyNodePosition } from '../layoutNode';

interface LayoutNode {
  id: string;
  parentId?: string;
  width?: number;
  height?: number;
  style?: Record<string, unknown>;
}
interface Engine {
  nodeLayoutHandlers: {
    canHandle: (node: LayoutNode) => boolean;
    handle: (...args: [Engine, unknown, LayoutNode, LayoutNode[], LayoutNode[]]) => void;
  }[];
  layoutNodes: (previous: unknown, visible: LayoutNode[], nodes: LayoutNode[], added: LayoutNode[]) => void;
}
interface PositionNode extends LayoutNode {
  position: { x: number; y: number };
  data: { isNew?: boolean; isBorderNode?: boolean };
}

const engine = () => new LayoutEngine() as unknown as Engine;
const newNodePositions = computeNewlyNodePosition as unknown as (
  nodes: PositionNode[],
  previous: Pick<PositionNode, 'id'>[],
  reference: { parentId: string; positions: { x: number; y: number }[] } | null,
  direction: string
) => PositionNode[];

describe(`indexed layout traversal`, () => {
  it('reads hierarchy once across nested traversal, keeping order, references and fresh child arrays', () => {
    const e = engine();
    let reads = 0;
    const nodes: LayoutNode[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `n${i}`,
      width: 10,
      height: 20,
      get parentId() {
        reads++;
        return i ? 'n0' : undefined;
      },
    }));
    let visits = 0;
    e.nodeLayoutHandlers = [
      {
        canHandle: () => true,
        handle: (instance, _previous, node, visible, children) => {
          visits++;
          if (node === nodes[0]) {
            expect(children).toEqual(nodes.slice(1));
            expect(children[0]).toBe(nodes[1]);
            const original = [...children];
            children.pop();
            instance.layoutNodes(null, visible, original, []);
          } else {
            expect(children).toHaveLength(0);
            children.push(node); // A handler is free to mutate its own filtered result.
          }
        },
      },
    ];
    e.layoutNodes(null, nodes, [nodes[0]], []);
    expect(visits).toBe(1000);
    expect(reads).toBe(1000);
    expect(nodes[1].style).toEqual({ width: '10px', height: '20px' });
  });

  it('rebuilds after reparenting between calls and releases traversal state when a handler throws', () => {
    const e = engine();
    const parent = { id: 'p' };
    const child = { id: 'c', parentId: 'p' };
    const nodes = [parent, child];
    e.nodeLayoutHandlers = [
      {
        canHandle: () => true,
        handle: (_instance, _previous, _node, _visible, children) => {
          expect(children).toEqual([child]);
          throw new Error('handler failed');
        },
      },
    ];
    expect(() => {
      e.layoutNodes(null, nodes, [parent], []);
    }).toThrow('handler failed');
    child.parentId = 'other';
    e.nodeLayoutHandlers = [
      {
        canHandle: () => true,
        handle: (_instance, _previous, _node, _visible, children) => {
          expect(children).toEqual([]);
        },
      },
    ];
    e.layoutNodes(null, nodes, [parent], []);
  });
});

describe(`new node membership`, () => {
  it('reads previous IDs once, does not move existing nodes and preserves the new-node order', () => {
    const compute = newNodePositions;
    let reads = 0;
    const previous = Array.from({ length: 1000 }, (_, i) => ({
      get id() {
        reads++;
        return `n${i}`;
      },
    }));
    const nodes: PositionNode[] = Array.from({ length: 1002 }, (_, i) => ({
      id: `n${i}`,
      position: { x: 500, y: 600 },
      data: { isNew: true },
    }));
    const result = compute(
      nodes,
      previous,
      {
        parentId: '',
        positions: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      },
      'RIGHT'
    );
    expect(reads).toBe(1000);
    expect(result.map((node) => node.id)).toEqual(['n1000', 'n1001']);
    expect(result.map((node) => node.position)).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(nodes[1000].position).toEqual({ x: 500, y: 600 });
    expect(result[0]).not.toBe(nodes[1000]);
    expect(result[0].data).toBe(nodes[1000].data);
  });

  it('preserves restored-child positions and first-wins reference selection', () => {
    const compute = newNodePositions;
    const nodes: PositionNode[] = [
      { id: 'reference', parentId: 'container', position: { x: 0, y: 0 }, data: {} },
      { id: 'reference', parentId: 'other', position: { x: 0, y: 0 }, data: {} },
      { id: 'restored', parentId: 'reference', position: { x: 123, y: 456 }, data: { isNew: false } },
      { id: 'unrelated', parentId: 'other', position: { x: 999, y: 999 }, data: { isNew: true } },
    ];
    const result = compute(
      nodes,
      [{ id: 'reference' }],
      { parentId: 'reference', positions: [{ x: 10, y: 20 }] },
      'RIGHT'
    );
    expect(result.map((node) => node.id)).toEqual(['restored']);
    expect(result[0].position).toEqual({ x: 123, y: 456 });
    expect(result[0]).not.toBe(nodes[2]);
  });

  it('does no work without a reference and preserves legacy empty-ID behavior', () => {
    const compute = newNodePositions;
    const node = { id: '', position: { x: 0, y: 0 }, data: {} };
    expect(compute([node], [{ id: '' }], null, 'RIGHT')).toEqual([]);
    expect(compute([node], [{ id: '' }], { parentId: '', positions: [{ x: 1, y: 2 }] }, 'RIGHT')[0].position).toEqual({
      x: 1,
      y: 2,
    });
  });
});
