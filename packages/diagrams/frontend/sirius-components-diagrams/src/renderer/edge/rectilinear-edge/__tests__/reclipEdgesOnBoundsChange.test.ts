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

import { applyNodeChanges, Edge, Node, NodeChange, Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { EdgeData, NodeData } from '../../../DiagramRenderer.types';
import { DiagramNodeType } from '../../../node/NodeTypes.types';
import { isBoundsGestureChange, reclipEdgesOnBoundsChange, toRouteNodes } from '../reclipEdgesOnBoundsChange';

interface Point {
  x: number;
  y: number;
}
function node(id: string, y: number, position: Position) {
  return {
    id,
    type: 'rectangularNode',
    position: { x: 100, y },
    width: 100,
    height: 100,
    internals: { positionAbsolute: { x: 100, y } },
    data: {
      connectionHandles: [
        {
          id: id + '-handle',
          edgeId: 'edge',
          type: id,
          position,
          XYPosition: { x: 37, y: position === Position.Bottom ? -6 : 0 },
        },
      ],
    },
  };
}
type Shape = ReturnType<typeof node>;
type DiagramNode = Node<NodeData, DiagramNodeType>;

function harness(
  initial = [node('source', 0, Position.Bottom), node('target', 300, Position.Top)],
  bends: Point[] = []
) {
  let nodes = structuredClone(initial) as unknown as DiagramNode[];
  const edge = {
    id: 'edge',
    type: 'manhattan',
    source: 'source',
    target: 'target',
    sourceHandle: 'source-handle',
    targetHandle: 'target-handle',
    data: { bendingPoints: bends, relativePositionBendingPoints: [] as Point[] },
  };
  let original: Parameters<typeof reclipEdgesOnBoundsChange>[3] | undefined;
  return {
    edge,
    change(changes: NodeChange<DiagramNode>[]) {
      const before = nodes;
      nodes = applyNodeChanges(changes, nodes);
      const boundsChanges = changes.filter(isBoundsGestureChange);
      if (!boundsChanges.length) {
        return nodes as unknown as Shape[];
      }
      const current = structuredClone(edge) as unknown as Edge<EdgeData>;
      original ??= { nodes: toRouteNodes(before), edges: new Map([[edge.id, current]]) };
      const clipped = reclipEdgesOnBoundsChange(changes, nodes, [current], original, 'DOWN');
      nodes = clipped.nodes;
      const data = clipped.edges[0]?.data;
      if (!data?.bendingPoints || !data.relativePositionBendingPoints) {
        throw new Error('Expected a route with bend arrays');
      }
      edge.data.bendingPoints = data.bendingPoints;
      edge.data.relativePositionBendingPoints = data.relativePositionBendingPoints;
      if (
        !boundsChanges.some(
          (change) =>
            (change.type === 'position' && change.dragging) || (change.type === 'dimensions' && change.resizing)
        )
      ) {
        original = undefined;
      }
      return nodes as unknown as Shape[];
    },
  };
}

describe(`bounds edge clipping`, () => {
  for (const dragging of [true, false]) {
    it(`flips edited handles when the event crosses below the function (dragging=${dragging})`, () => {
      const editor = harness();
      const nodes = editor.change([{ id: 'source', type: 'position', position: { x: 100, y: 500 }, dragging }]);
      expect(nodes[0].data.connectionHandles[0].position).toBe(Position.Top);
      expect(nodes[1].data.connectionHandles[0].position).toBe(Position.Bottom);
      expect(nodes[1].data.connectionHandles[0].XYPosition).toEqual({ x: 37, y: -6 });
    });
  }
});

function rotate(point: Point, turns: number): Point {
  let result = point;
  for (let i = 0; i < turns; i++) {
    result = { x: -result.y, y: result.x };
  }
  return result;
}
function handlePoint(shape: Shape): Point {
  const handle = shape.data.connectionHandles[0];
  return {
    x:
      shape.position.x +
      (handle.position === Position.Left
        ? 0
        : handle.position === Position.Right
        ? shape.width
        : handle.XYPosition.x + 3),
    y:
      shape.position.y +
      (handle.position === Position.Top
        ? 0
        : handle.position === Position.Bottom
        ? shape.height
        : handle.XYPosition.y + 3),
  };
}
function rotateNode(shape: Shape, turns: number): Shape {
  const center = rotate({ x: shape.position.x + shape.width / 2, y: shape.position.y + shape.height / 2 }, turns);
  const sides = [Position.Top, Position.Right, Position.Bottom, Position.Left];
  const handle = shape.data.connectionHandles[0];
  const point = rotate(handlePoint(shape), turns);
  const position = sides[(sides.indexOf(handle.position) + turns) % 4];
  const width = turns % 2 ? shape.height : shape.width;
  const height = turns % 2 ? shape.width : shape.height;
  const origin = { x: center.x - width / 2, y: center.y - height / 2 };
  return {
    ...shape,
    width,
    height,
    position: origin,
    internals: { positionAbsolute: origin },
    data: {
      connectionHandles: [
        {
          ...handle,
          position,
          XYPosition:
            position === Position.Top || position === Position.Bottom
              ? { x: point.x - origin.x - 3, y: position === Position.Top ? 0 : -6 }
              : { x: position === Position.Left ? 0 : -6, y: point.y - origin.y - 3 },
        },
      ],
    },
  };
}
function reverse(nodes: Shape[]): Shape[] {
  return [...nodes].reverse().map((n, i) => {
    const id = i === 0 ? 'source' : 'target';
    return {
      ...n,
      id,
      data: { connectionHandles: n.data.connectionHandles.map((h) => ({ ...h, id: id + '-handle', type: id })) },
    };
  });
}
for (const turns of [0, 1, 2, 3]) {
  for (const reversed of [false, true]) {
    const arrange = (nodes: Shape[]) => {
      const rotated = nodes.map((n) => rotateNode(n, turns));
      return reversed ? reverse(rotated) : rotated;
    };
    const sides = [Position.Top, Position.Right, Position.Bottom, Position.Left];
    const side = (value: Position) => sides[(sides.indexOf(value) + turns) % 4];
    it(`crossing and reversing in direction ${turns}, reverse=${reversed}`, () => {
      const initial = arrange([node('source', 0, Position.Bottom), node('target', 300, Position.Top)]);
      const editor = harness(initial);
      const movingId = reversed ? 'target' : 'source';
      for (const y of [500, 0, 500]) {
        const destination = rotateNode(node(movingId, y, Position.Bottom), turns).position;
        const result = editor.change([{ id: movingId, type: 'position', position: destination, dragging: true }]);
        const expected = y ? [side(Position.Top), side(Position.Bottom)] : [side(Position.Bottom), side(Position.Top)];
        if (reversed) {
          expected.reverse();
        }
        expect(result.map((n) => n.data.connectionHandles[0].position)).toEqual(expected);
      }
    });
    it(`clips swallowed bends during movement, direction ${turns}, reverse=${reversed}`, () => {
      const initial = arrange([node('source', 0, Position.Bottom), node('target', 300, Position.Top)]);
      const bends = [{ x: 140, y: 200 }].map((p) => rotate(p, turns));
      const editor = harness(initial, bends);
      const destination = rotateNode(node('source', 500, Position.Bottom), turns).position;
      const result = editor.change([
        { id: reversed ? 'target' : 'source', type: 'position', position: destination, dragging: true },
      ]);
      const expected = [side(Position.Top), side(Position.Bottom)];
      if (reversed) {
        expected.reverse();
      }
      expect(result.map((n) => n.data.connectionHandles[0].position)).toEqual(expected);
      expect(editor.edge.data.bendingPoints).toEqual([]);
    });
  }
  it(`resize swallows a bend and changes attachment axis, direction ${turns}`, () => {
    const initial = [node('source', 0, Position.Bottom), node('target', 300, Position.Top)];
    initial[1].position.x = 260;
    initial[1].internals.positionAbsolute.x = 260;
    const shapes = initial.map((n) => rotateNode(n, turns));
    const editor = harness(
      shapes,
      [
        { x: 140, y: 150 },
        { x: 300, y: 150 },
      ].map((p) => rotate(p, turns))
    );
    // Resize toward the bend; rotations 1/2 also move the top/left origin.
    const corners = [
      { x: 100, y: 0 },
      { x: 200, y: 250 },
    ].map((p) => rotate(p, turns));
    const position = { x: Math.min(...corners.map((p) => p.x)), y: Math.min(...corners.map((p) => p.y)) };
    const result = editor.change([
      { id: 'source', type: 'position', position },
      {
        id: 'source',
        type: 'dimensions',
        dimensions: { width: turns % 2 ? 250 : 100, height: turns % 2 ? 100 : 250 },
        resizing: true,
        setAttributes: true,
      },
    ]);
    const expectedSide = [Position.Right, Position.Bottom, Position.Left, Position.Top][turns];
    expect(result[0].data.connectionHandles[0].position).toBe(expectedSide);
    expect(editor.edge.data.bendingPoints).toEqual([{ x: 300, y: 150 }].map((p) => rotate(p, turns)));
    const released = editor.change([
      {
        id: 'source',
        type: 'dimensions',
        dimensions: { width: turns % 2 ? 250 : 100, height: turns % 2 ? 100 : 250 },
        resizing: false,
        setAttributes: true,
      },
    ]);
    expect(released[0].data.connectionHandles).toEqual(result[0].data.connectionHandles);
    expect(editor.edge.data.bendingPoints).toEqual([{ x: 300, y: 150 }].map((p) => rotate(p, turns)));
  });
}
it(`translates the entire custom route during multi-selection movement`, () => {
  const editor = harness(undefined, [{ x: 140, y: 200 }]);
  editor.change([
    { id: 'source', type: 'position', position: { x: 150, y: 80 }, dragging: true },
    { id: 'target', type: 'position', position: { x: 150, y: 380 }, dragging: true },
  ]);
  // A collinear bend is redundant, but a second update must not translate it twice.
  expect(editor.edge.data.bendingPoints).toEqual([]);
  const released = editor.change([
    { id: 'source', type: 'position', dragging: false },
    { id: 'target', type: 'position', dragging: false },
  ]);
  expect(released.map((n) => n.data.connectionHandles[0].position)).toEqual([Position.Bottom, Position.Top]);
});
it(`retains a non-collinear detour when moving both nodes together`, () => {
  const source = node('source', 0, Position.Bottom);
  const target = node('target', 300, Position.Top);
  target.position.x = 300;
  target.internals.positionAbsolute.x = 300;
  const editor = harness(
    [source, target],
    [
      { x: 140, y: 200 },
      { x: 340, y: 200 },
    ]
  );
  editor.change([
    { id: 'source', type: 'position', position: { x: 150, y: 80 }, dragging: true },
    { id: 'target', type: 'position', position: { x: 350, y: 380 }, dragging: true },
  ]);
  expect(editor.edge.data.bendingPoints).toEqual([
    { x: 190, y: 280 },
    { x: 390, y: 280 },
  ]);
  expect(editor.edge.data.relativePositionBendingPoints).toEqual([
    { x: 0, y: 100 },
    { x: 200, y: 100 },
  ]);
});
for (const x of [-100, 300]) {
  it(`splits a shared bend when moving sideways to x=${x}`, () => {
    const editor = harness(undefined, [{ x: 140, y: 200 }]);
    const result = editor.change([{ id: 'source', type: 'position', position: { x, y: 0 }, dragging: true }]);
    expect(result.map((n) => n.data.connectionHandles[0].position)).toEqual([Position.Bottom, Position.Top]);
    expect(editor.edge.data.bendingPoints).toEqual([
      { x: x + 40, y: 200 },
      { x: 140, y: 200 },
    ]);
  });
}
it(`follows a moved ancestor using post-change absolute coordinates`, () => {
  const child = Object.assign(node('source', 0, Position.Bottom), { parentId: 'parent' });
  const parent = node('parent', 0, Position.Bottom);
  parent.position.x = 0;
  parent.internals.positionAbsolute.x = 0;
  parent.data.connectionHandles = [];
  const editor = harness([child, node('target', 300, Position.Top), parent]);
  const result = editor.change([{ id: 'parent', type: 'position', position: { x: 0, y: 500 }, dragging: true }]);
  expect(result.slice(0, 2).map((n) => n.data.connectionHandles[0].position)).toEqual([Position.Top, Position.Bottom]);
});
it(`selection changes do not rewrite saved terminals or bends`, () => {
  const initial = [node('source', 500, Position.Bottom), node('target', 300, Position.Top)];
  const editor = harness(initial, [{ x: 140, y: 200 }]);
  const result = editor.change([{ id: 'source', type: 'select', selected: true }]);
  expect(result.map((n) => n.data.connectionHandles)).toEqual(initial.map((n) => n.data.connectionHandles));
  expect(editor.edge.data.bendingPoints).toEqual([{ x: 140, y: 200 }]);
});
it(`automatic handles stay automatic after crossing`, () => {
  const initial = [node('source', 0, Position.Bottom), node('target', 300, Position.Top)];
  for (const shape of initial) {
    Reflect.deleteProperty(shape.data.connectionHandles[0], 'XYPosition');
  }
  const editor = harness(initial);
  const result = editor.change([{ id: 'source', type: 'position', position: { x: 100, y: 500 }, dragging: true }]);
  expect(result.map((n) => n.data.connectionHandles[0].position)).toEqual([Position.Top, Position.Bottom]);
  expect(result.map((n) => n.data.connectionHandles[0].XYPosition)).toEqual([undefined, undefined]);
});
it(`leaves self-loops unchanged`, () => {
  const editor = harness(undefined, [{ x: 0, y: -100 }]);
  editor.edge.target = 'source';
  const result = editor.change([{ id: 'source', type: 'position', position: { x: 100, y: 500 }, dragging: true }]);
  expect(result[0].data.connectionHandles[0].position).toBe(Position.Bottom);
  expect(editor.edge.data.bendingPoints).toEqual([{ x: 0, y: -100 }]);
});
it(`does not impose orthogonal attachment rules on oblique edges`, () => {
  const editor = harness();
  editor.edge.type = 'oblique';
  const result = editor.change([{ id: 'source', type: 'position', position: { x: 100, y: 500 }, dragging: true }]);
  expect(result.map((n) => n.data.connectionHandles[0].position)).toEqual([Position.Bottom, Position.Top]);
});

it(`an L-route follows the function perimeter throughout one continuous drag`, () => {
  const source = node('source', 0, Position.Right);
  source.width = 200;
  source.data.connectionHandles[0].XYPosition = { x: -6, y: 47 };
  const target = node('target', 300, Position.Top);
  target.width = 200;
  target.position.x = 400;
  target.internals.positionAbsolute.x = 400;
  target.data.connectionHandles[0].XYPosition = { x: 64, y: 0 };
  const editor = harness([source, target], [{ x: 467, y: 50 }]);
  for (let y = 0; y <= 500; y += 10) {
    const result = editor.change([{ id: 'source', type: 'position', position: { x: 100, y }, dragging: true }]);
    const handle = result[1].data.connectionHandles[0];
    const lineY = y + 50;
    if (lineY < 300) {
      expect(handle.position, `source y=${y}`).toBe(Position.Top);
    } else if (lineY > 400) {
      expect(handle.position, `source y=${y}`).toBe(Position.Bottom);
      expect(handle.XYPosition.x).toBeCloseTo(64);
    } else if (lineY > 300 && lineY < 400) {
      expect(handle.position, `source y=${y}`).toBe(Position.Left);
      expect(handle.XYPosition.y, `source y=${y}`).toBeCloseTo(lineY - 300 - 3);
    }
  }
});

for (const turns of [0, 1, 2, 3]) {
  for (const reversed of [false, true]) {
    for (const fractional of [false, true]) {
      it(`continuous perimeter projection, rotation=${turns}, reversed=${reversed}, fractional=${fractional}`, () => {
        const offset = fractional ? 0.12915493550199 : 0;
        const source = node('source', offset, Position.Right);
        source.width = 200;
        source.position.x += offset;
        source.internals.positionAbsolute = { ...source.position };
        source.data.connectionHandles[0].XYPosition = { x: -6, y: 47 };
        const target = node('target', 300 + offset, Position.Top);
        target.width = 200;
        target.position.x = 400 + offset;
        target.internals.positionAbsolute = { ...target.position };
        target.data.connectionHandles[0].XYPosition = { x: 64, y: 0 };
        let initial = [source, target].map((n) => rotateNode(n, turns));
        if (reversed) {
          initial = reverse(initial);
        }
        const editor = harness(initial, [rotate({ x: 467 + offset, y: 50 + offset }, turns)]);
        const movingId = reversed ? 'target' : 'source';
        const check = (y: number, dragging: boolean) => {
          const moved = { ...source, position: { x: source.position.x, y } };
          const position = rotateNode(moved, turns).position;
          const result = editor.change([{ id: movingId, type: 'position', position, dragging }]);
          const stationary = result[reversed ? 0 : 1];
          const point = handlePoint(stationary);
          const lineY = y + 50;
          const top = target.position.y;
          const bottom = top + target.height;
          const expected = rotate(
            lineY < top
              ? { x: 467 + offset, y: top }
              : lineY > bottom
              ? { x: 467 + offset, y: bottom }
              : { x: target.position.x, y: lineY },
            turns
          );
          expect(point.x, `source y=${y}`).toBeCloseTo(expected.x, 7);
          expect(point.y, `source y=${y}`).toBeCloseTo(expected.y, 7);
        };
        for (let step = 0; step <= 50; step++) {
          check(offset + step * 10, true);
        }
        check(offset + 500, false);
        // Reverse in a new gesture after release, so the saved bottom-facing
        // route must slide back along the side and then recover its top entry.
        for (let step = 50; step >= 0; step--) {
          check(offset + step * 10, true);
        }
        check(offset, false);
      });
    }
  }
}

it(`continuous resize can swallow and expose the same bend without accumulating clipping`, () => {
  const source = node('source', 0, Position.Bottom);
  const target = node('target', 300, Position.Top);
  target.position.x = 260;
  target.internals.positionAbsolute.x = 260;
  const editor = harness(
    [source, target],
    [
      { x: 140, y: 150 },
      { x: 300, y: 150 },
    ]
  );
  for (const height of [100, 130, 160, 200, 250, 350, 450, 350, 250, 200, 160, 130, 100]) {
    const result = editor.change([
      { id: 'source', type: 'dimensions', dimensions: { width: 100, height }, resizing: true, setAttributes: true },
    ]);
    const point = handlePoint(result[0]);
    expect(point).toEqual(height > 150 ? { x: 200, y: 150 } : { x: 140, y: height });
    expect(editor.edge.data.bendingPoints).toEqual(
      height > 150
        ? [{ x: 300, y: 150 }]
        : [
            { x: 140, y: 150 },
            { x: 300, y: 150 },
          ]
    );
  }
  editor.change([
    {
      id: 'source',
      type: 'dimensions',
      dimensions: { width: 100, height: 100 },
      resizing: false,
      setAttributes: true,
    },
  ]);
  expect(editor.edge.data.bendingPoints).toEqual([
    { x: 140, y: 150 },
    { x: 300, y: 150 },
  ]);
});
