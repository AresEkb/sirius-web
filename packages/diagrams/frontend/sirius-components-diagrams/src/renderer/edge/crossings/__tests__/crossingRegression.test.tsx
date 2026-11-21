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
import { afterEach, expect, it, vi } from 'vitest';
import { DropNodeContext } from '../../../dropNode/DropNodeContext';
import { DropNodeContextValue } from '../../../dropNode/DropNodeContext.types';
import { CachedPath, detectEdgeCrossings } from '../detectEdgeCrossings';
import { useEdgeCrossingFades } from '../useEdgeCrossingFades';

interface Edge {
  id: string;
  source: string;
  target: string;
  hidden?: boolean;
  zIndex?: number;
  selected?: boolean;
  markerStart?: unknown;
  markerEnd?: unknown;
  style?: { stroke: string };
  data?: { edgePath?: string; crossingGaps?: Gap[] };
}
interface Gap {
  startRatio: number;
  endRatio: number;
}
interface BoundsNode {
  position: { x: number; y: number };
  width: number;
  height: number;
}

type Point = { x: number; y: number };
type Window = Gap & { intersection: Point };

function detect(edges: Edge[], nodes = new Map<string, BoundsNode>(), cache?: Map<string, CachedPath>) {
  return detectEdgeCrossings(
    edges as Parameters<typeof detectEdgeCrossings>[0],
    nodes as Parameters<typeof detectEdgeCrossings>[1],
    undefined,
    cache
  );
}

// Exhaustive oracle for the fixtures' straight SVG segments. No spatial index,
// bounding-box pruning, or cross-call cache is used.
function bruteForce(edges: Edge[], nodes: Map<string, BoundsNode>) {
  function geometry(edge: Edge) {
    const coords = [...(edge.data?.edgePath ?? '').matchAll(/[ML] ([-0-9.]+) ([-0-9.]+)/g)];
    const points = coords.map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
    let total = 0;
    const segments = points.slice(1).flatMap((end, i) => {
      const start = points[i]!;
      const x = end.x - start.x;
      const y = end.y - start.y;
      const length = Math.hypot(x, y);
      if (length < 1) return [];
      const segment = { start, x, y, offset: total, length };
      total += length;
      return [segment];
    });
    return { edge, segments, total };
  }
  const visible = edges.filter((edge) => !edge.hidden).map(geometry);
  const result = new Map<string, Window[]>();
  const seen = new Set<string>();
  const insideEndpoint = (point: Point, edge: Edge) =>
    [edge.source, edge.target].some((id) => {
      const n = nodes.get(id);
      return (
        n &&
        point.x >= n.position.x - 12 &&
        point.x <= n.position.x + n.width + 12 &&
        point.y >= n.position.y - 12 &&
        point.y <= n.position.y + n.height + 12
      );
    });
  for (const [i, first] of visible.entries()) {
    for (const second of visible.slice(i + 1)) {
      const z1 = first.edge.zIndex;
      const z2 = second.edge.zIndex;
      const chooseSecond =
        z1 !== undefined && z2 !== undefined && z1 !== z2 ? z2 > z1 : first.edge.id.localeCompare(second.edge.id) < 0;
      const under = chooseSecond ? second : first;
      for (const a of first.segments) {
        for (const b of second.segments) {
          const cross = a.x * b.y - a.y * b.x;
          if (Math.abs(cross) < 0.001) continue;
          const dx = b.start.x - a.start.x;
          const dy = b.start.y - a.start.y;
          const u = (dx * b.y - dy * b.x) / cross;
          const v = (dx * a.y - dy * a.x) / cross;
          if (u <= 0.001 || u >= 0.999 || v <= 0.001 || v >= 0.999) continue;
          const p = a.offset + u * a.length;
          const q = b.offset + v * b.length;
          if (Math.min(p, first.total - p, q, second.total - q) <= 18) continue;
          const intersection = { x: a.start.x + u * a.x, y: a.start.y + u * a.y };
          if (insideEndpoint(intersection, first.edge) || insideEndpoint(intersection, second.edge)) continue;
          const id = under.edge.id;
          const key = `${id}:${intersection.x.toFixed(2)}:${intersection.y.toFixed(2)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const center = chooseSecond ? q : p;
          const windows = result.get(id) ?? [];
          windows.push({ startRatio: (center - 9) / under.total, endRatio: (center + 9) / under.total, intersection });
          result.set(id, windows);
        }
      }
    }
  }
  return result;
}

const fixture = vi.hoisted(() => ({
  store: () => ({}),
  flow: () => ({}),
  detectCalls: vi.fn(),
}));
vi.mock('../detectEdgeCrossings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../detectEdgeCrossings')>();
  return {
    ...actual,
    detectEdgeCrossings: (...args: Parameters<typeof actual.detectEdgeCrossings>) => {
      fixture.detectCalls();
      return actual.detectEdgeCrossings(...args);
    },
  };
});
vi.mock('@xyflow/react', () => ({ useStoreApi: () => fixture.flow() }));
vi.mock('../../../../representation/useStore', () => ({ useStore: () => fixture.store() }));

afterEach(() => {
  cleanup();
  fixture.detectCalls.mockClear();
});

function harness() {
  let edges: Edge[] = [];
  const nodes = new Map<string, BoundsNode>();
  const setEdges = vi.fn((update: (previous: Edge[]) => Edge[]) => {
    edges = update(edges);
  });
  const store = { getEdges: () => edges, getNodes: () => [...nodes.values()], setEdges };
  const flow = { getState: () => ({ nodeLookup: nodes }) };
  fixture.store = () => store;
  fixture.flow = () => flow;
  function Probe() {
    useEdgeCrossingFades();
    return null;
  }
  let view: ReturnType<typeof render> | undefined;
  return {
    nodes,
    setEdges,
    detectCalls: fixture.detectCalls,
    getEdges: () => edges,
    render(nextEdges?: Edge[], dragging = false) {
      if (nextEdges) edges = nextEdges;
      const element = (
        <DropNodeContext.Provider value={{ dragging } as DropNodeContextValue}>
          <Probe />
        </DropNodeContext.Provider>
      );
      if (view) view.rerender(element);
      else view = render(element);
    },
  };
}

function crossingEdges(): [Edge, Edge] {
  return [
    { id: 'a', source: 's1', target: 't1', data: { edgePath: 'M 0 100 L 200 100' } },
    { id: 'b', source: 's2', target: 't2', data: { edgePath: 'M 100 0 L 100 200' } },
  ];
}

function seededCrossingCases() {
  let seed = 20_261_111;
  function random(): number {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223 + 2 ** 32) % 2 ** 32;
    return seed / 2 ** 32;
  }
  return Array.from({ length: 40 }, (_value, trial) => {
    const edges: Edge[] = Array.from({ length: 35 }, (_, i) => {
      const points = Array.from(
        { length: 5 },
        () => `${Math.floor(random() * 8) * 50} ${Math.floor(random() * 8) * 50}`
      );
      return {
        id: `edge-${i}`,
        source: 's1',
        target: 't1',
        hidden: random() < 0.1,
        zIndex: Math.floor(random() * 3),
        data: { edgePath: `M ${points.join(' L ')}` },
      };
    });
    return { trial, edges };
  });
}

it.each(seededCrossingCases())(
  'matches exhaustive traversal on seeded paths $trial with hidden edges and endpoint bounds',
  ({ edges }) => {
    const nodes = new Map([['s1', { position: { x: 0, y: 0 }, width: 30, height: 30 }]]);
    expect([...detect(edges, nodes)]).toEqual([...bruteForce(edges, nodes)]);
  }
);

it('matches exhaustive traversal on coincident windows, invalid and empty paths', () => {
  expect(bruteForce(crossingEdges(), new Map()).size).toBe(1);
  const special = [
    ...crossingEdges(),
    { ...crossingEdges()[0], id: 'c' },
    { ...crossingEdges()[0], id: 'invalid', data: { edgePath: 'invalid' } },
    { ...crossingEdges()[0], id: 'empty', data: { edgePath: '' } },
  ];
  expect([...detect(special, new Map())]).toEqual([...bruteForce(special, new Map())]);
});

it('matches exhaustive traversal on spatially separated groups with local crossings', () => {
  const edges: Edge[] = [];
  for (let group = 0; group < 30; group++) {
    const x = (group % 6) * 500;
    const y = Math.floor(group / 6) * 500;
    edges.push(
      {
        id: `a-${group}`,
        source: 's',
        target: 't',
        data: { edgePath: `M ${x} ${y + 100} L ${x + 200} ${y + 100}` },
      },
      {
        id: `b-${group}`,
        source: 's',
        target: 't',
        data: { edgePath: `M ${x + 100} ${y} L ${x + 100} ${y + 200}` },
      },
      {
        id: `c-${group}`,
        source: 's',
        target: 't',
        data: { edgePath: `M ${x} ${y + 300} L ${x + 200} ${y + 300}` },
      }
    );
  }
  const expected = bruteForce(edges, new Map());
  expect(expected.size).toBe(30);
  expect([...detect(edges, new Map())]).toEqual([...expected]);
});

it('prunes inactive entries and invalidates changed paths', () => {
  const cache = new Map<string, CachedPath>();
  const edges = crossingEdges();
  const original = detect(edges, new Map(), cache);
  const parsed = cache.get('a');
  expect(parsed).toBeDefined();
  expect(detect(edges, new Map(), cache)).toEqual(original);
  expect(cache.get('a')).toBe(parsed);
  const changed = [{ ...edges[0], data: { edgePath: 'M 300 100 L 500 100' } }, edges[1]];
  expect(detect(changed, new Map(), cache)).toEqual(bruteForce(changed, new Map()));
  expect(cache.get('a')).not.toBe(parsed);
  expect(cache.get('a')?.path).toBe(changed[0].data!.edgePath);
  detect([edges[1]], new Map(), cache);
  expect([...cache.keys()]).toEqual(['b']);
});

it('reuses crossing results for selection/gap feedback, but invalidates visibility, geometry, order, zIndex and bounds', () => {
  const h = harness();
  h.render(crossingEdges());
  expect(h.detectCalls).toHaveBeenCalledTimes(1);
  expect(h.setEdges).toHaveBeenCalledTimes(1);
  const withGaps = h.getEdges();
  h.render(withGaps);
  expect(h.detectCalls).toHaveBeenCalledTimes(1);
  h.render(withGaps.map((e) => ({ ...e, selected: true })));
  expect(h.detectCalls).toHaveBeenCalledTimes(1);
  h.render(h.getEdges().map((e) => ({ ...e, zIndex: e.id === 'a' ? 2 : 1 })));
  expect(h.detectCalls).toHaveBeenCalledTimes(2);
  h.render(h.getEdges().map((e) => ({ ...e, hidden: e.id === 'b' })));
  expect(h.detectCalls).toHaveBeenCalledTimes(3);
  h.render(crossingEdges().reverse());
  expect(h.detectCalls).toHaveBeenCalledTimes(4);
  h.nodes.set('s1', { position: { x: 90, y: 90 }, width: 20, height: 20 });
  h.render([...h.getEdges()]);
  expect(h.detectCalls).toHaveBeenCalledTimes(5);
  expect(h.getEdges().every((e) => !e.data?.crossingGaps?.length)).toBe(true);
  h.render(crossingEdges().map((e) => ({ ...e, data: { edgePath: 'M 0 0 L 10 0' } })));
  expect(h.detectCalls).toHaveBeenCalledTimes(6);
  h.render([]);
  h.render(crossingEdges());
  expect(h.detectCalls).toHaveBeenCalledTimes(7);
});

it('defers crossing work during dragging and retains unchanged edge objects when other gaps change', () => {
  const h = harness();
  const edges = [...crossingEdges(), { id: 'c', source: 's3', target: 't3', data: { edgePath: 'M 0 500 L 200 500' } }];
  h.render(edges, true);
  expect(h.detectCalls).not.toHaveBeenCalled();
  h.render(undefined, false);
  expect(h.detectCalls).toHaveBeenCalledTimes(1);
  expect(h.getEdges()[0]).toBe(edges[0]);
  expect(h.getEdges()[2]).toBe(edges[2]);
  expect(h.getEdges()[1]).not.toBe(edges[1]);
});
