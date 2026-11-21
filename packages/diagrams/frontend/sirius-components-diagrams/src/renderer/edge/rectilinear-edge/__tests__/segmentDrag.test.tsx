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

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { Position } from '@xyflow/react';
import React, { createContext } from 'react';
import { DraggableData } from 'react-draggable';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemporaryMovingLine } from '../../BendPoint';
import { SmoothStepEdgeWrapper } from '../../SmoothStepEdgeWrapper';
import { RouteNode } from '../SegmentRoute';
import { useBendingPoints } from '../useBendingPoints';
import { useTemporaryLines } from '../useTemporaryLines';

interface Point {
  x: number;
  y: number;
}
interface Handle {
  id: string;
  edgeId: string;
  position: Position;
  XYPosition?: Point;
}
interface Node {
  id: string;
  width: number;
  height: number;
  internals: { positionAbsolute: Point };
  data: { connectionHandles: Handle[] };
}
const fixture = vi.hoisted(() => ({
  store: () => ({}),
  nodes: () => [] as Node[],
  edges: [] as { id: string }[],
  zoom: 1,
  synchronize: vi.fn(),
  handle: (_node: Node) => ({ x: 0, y: 0 }),
}));

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useInternalNode: (id: string) => fixture.nodes().find((node) => node.id === id),
  useStore: () => fixture.zoom,
  useStoreApi: () => ({
    getState: () => ({ edges: fixture.edges, edgeLookup: new Map([['edge', fixture.edges[0]]]) }),
  }),
  useUpdateNodeInternals: () => vi.fn(),
  getSmoothStepPath: () => {
    throw new Error('Custom segment route was unexpectedly discarded');
  },
}));
vi.mock('../../../../contexts/DiagramContext', () => ({ DiagramContext: createContext({ readOnly: false }) }));
vi.mock('../../../../contexts/NodeContext', () => ({ NodeTypeContext: createContext({ nodeLayoutHandlers: [] }) }));
vi.mock('../../../../representation/useStore', () => ({
  useStore: () => fixture.store(),
  useStoreActions: () => fixture.store(),
}));
vi.mock('../../EdgeLayout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../EdgeLayout')>()),
  getHandleCoordinatesByPosition: (node: Node) => fixture.handle(node),
}));
vi.mock('../../useEditableEdgePath', () => ({
  useEditableEdgePath: () => ({ synchronizeEdgeLayoutData: fixture.synchronize }),
}));
vi.mock('../MultiLabelRectilinearEditableEdge', () => ({ MultiLabelRectilinearEditableEdge: () => null }));

afterEach(cleanup);

function renderHook<T>(useTestHook: () => T) {
  const result = {} as { current: T };
  function Probe() {
    result.current = useTestHook();
    return null;
  }
  render(<Probe />);
  return { result };
}

function draggableData(point: Point): DraggableData {
  return { ...point, lastX: point.x, lastY: point.y, deltaX: 1, deltaY: 1, node: document.body };
}

function harness(
  initialNodes: Node[],
  initialSource: Point,
  initialTarget: Point,
  initialBends: Point[],
  reconnectable: boolean | 'source' | 'target' | undefined = true,
  zoom = 1
) {
  let nodes = initialNodes;
  const edges = [
    { id: 'edge', reconnectable, data: { bendingPoints: initialBends, relativePositionBendingPoints: [] } },
  ];
  const synchronize = vi.fn();
  const store = () => ({
    getNodes: () => nodes,
    getEdges: () => edges,
    setNodes: (value: Node[] | ((p: Node[]) => Node[])) => {
      nodes = typeof value === 'function' ? value(nodes) : value;
    },
    setEdges: (value: typeof edges | ((previous: typeof edges) => typeof edges)) => {
      const next = typeof value === 'function' ? value(edges) : value;
      edges.splice(0, edges.length, ...next);
    },
  });
  fixture.store = store;
  fixture.nodes = () => nodes;
  fixture.edges = edges;
  fixture.zoom = zoom;
  fixture.synchronize = synchronize;
  fixture.handle = (node) => (node.id === 'source' ? initialSource : initialTarget);
  for (const [i, point] of [initialSource, initialTarget].entries()) {
    const node = initialNodes[i];
    const handle = node.data.connectionHandles[0];
    const x = point.x - node.internals.positionAbsolute.x;
    const y = point.y - node.internals.positionAbsolute.y;
    handle.XYPosition =
      handle.position === Position.Top
        ? { x: x - 3, y: 0 }
        : handle.position === Position.Bottom
        ? { x: x - 3, y: -6 }
        : handle.position === Position.Left
        ? { x: 0, y: y - 3 }
        : { x: -6, y: y - 3 };
  }
  const rendered = renderHook(() => {
    const [source, setSource] = React.useState(initialSource);
    const [target, setTarget] = React.useState(initialTarget);
    const {
      localBendingPoints: bends,
      setLocalBendingPoints: setBends,
      segmentDragInProgress,
    } = useBendingPoints(
      'edge',
      initialBends,
      source,
      setSource,
      initialNodes[0] as unknown as RouteNode,
      'source-handle',
      initialNodes[0].data.connectionHandles[0].position,
      target,
      setTarget,
      initialNodes[1] as unknown as RouteNode,
      'target-handle',
      initialNodes[1].data.connectionHandles[0].position,
      true
    );
    const controls = useTemporaryLines(
      'edge',
      initialBends,
      bends,
      setBends,
      initialNodes[0] as unknown as RouteNode,
      'source-handle',
      initialNodes[0].data.connectionHandles[0].position,
      source,
      setSource,
      initialNodes[1] as unknown as RouteNode,
      'target-handle',
      initialNodes[1].data.connectionHandles[0].position,
      target,
      setTarget,
      segmentDragInProgress
    );
    return { controls, source, target, bends };
  });
  return {
    drag(point: Point, index: number, axis: string, begin = true) {
      if (begin) {
        act(() => {
          rendered.result.current.controls.onDragStart();
        });
      }
      act(() => {
        rendered.result.current.controls.onTemporaryLineDrag(draggableData(point), index, axis as 'x' | 'y');
      });
    },
    stop() {
      act(() => {
        rendered.result.current.controls.onTemporaryLineDragStop(draggableData({ x: 0, y: 0 }), 0);
      });
    },
    line(index: number) {
      const { controls } = rendered.result.current;
      return React.createElement(TemporaryMovingLine, {
        ...controls.middleBendingPoints[index],
        index,
        onDragStart: controls.onDragStart,
        onDrag: controls.onTemporaryLineDrag,
        onDragStop: controls.onTemporaryLineDragStop,
      });
    },
    wrapper(sourcePosition: Position, targetPosition: Position) {
      return render(
        React.createElement(SmoothStepEdgeWrapper, {
          id: 'edge',
          source: 'source',
          target: 'target',
          sourcePosition,
          targetPosition,
          sourceHandleId: 'source-handle',
          targetHandleId: 'target-handle',
          data: edges[0].data,
        } as unknown as React.ComponentProps<typeof SmoothStepEdgeWrapper>)
      );
    },
    current: () => rendered.result.current,
    nodes: () => nodes,
    edges,
    synchronize,
  };
}

describe(`segment drag`, () => {
  for (const vertical of [false, true]) {
    it(`release keeps a straight edge's detour while measured handle sides catch up (vertical=${vertical})`, () => {
      const map = ({ x, y }: Point): Point => (vertical ? { x: y, y: x } : { x, y });
      const nodes: Node[] = [0, 300].map((x, i) => ({
        id: i === 0 ? 'source' : 'target',
        width: 100,
        height: 100,
        internals: { positionAbsolute: map({ x, y: 100 }) },
        data: {
          connectionHandles: [
            {
              id: i === 0 ? 'source-handle' : 'target-handle',
              edgeId: 'edge',
              position: vertical
                ? i === 0
                  ? Position.Bottom
                  : Position.Top
                : i === 0
                ? Position.Right
                : Position.Left,
            },
          ],
        },
      }));
      const editor = harness(nodes, map({ x: 100, y: 150 }), map({ x: 300, y: 150 }), []);
      editor.drag(map({ x: 200, y: 260 }), 0, vertical ? 'y' : 'x');
      const bends = editor.current().bends.map(({ x, y }) => ({ x, y }));
      editor.stop();
      editor.wrapper(vertical ? Position.Bottom : Position.Right, vertical ? Position.Top : Position.Left);
      expect(editor.edges[0].data.bendingPoints).toEqual(bends);
    });
  }
  for (const vertical of [false, true]) {
    for (const zoom of [0.5, 1, 2]) {
      for (const offset of [-10.1, -10, -9.9, -5, 5, 9.9, 10, 10.1]) {
        it(`parallel segments merge within 10 diagram units: vertical=${vertical}, zoom=${zoom}, offset=${offset}`, () => {
          const map = ({ x, y }: Point): Point => (vertical ? { x: y, y: x } : { x, y });
          const nodes: Node[] = [0, 300].map((x, i) => ({
            id: i === 0 ? 'source' : 'target',
            width: 100,
            height: 100,
            internals: { positionAbsolute: map({ x, y: 100 }) },
            data: {
              connectionHandles: [
                {
                  id: i === 0 ? 'source-handle' : 'target-handle',
                  edgeId: 'edge',
                  position: vertical
                    ? i === 0
                      ? Position.Right
                      : Position.Bottom
                    : i === 0
                    ? Position.Bottom
                    : Position.Right,
                },
              ],
            },
          }));
          const editor = harness(
            nodes,
            map({ x: 50, y: 200 }),
            map({ x: 400, y: 150 }),
            [
              { x: 50, y: 250 },
              { x: 450, y: 250 },
              { x: 450, y: 150 },
            ].map((point) => map(point)),
            true,
            zoom
          );
          editor.drag(map({ x: 250, y: 150 + offset }), 1, vertical ? 'y' : 'x');
          if (Math.abs(offset) < 10) {
            expect([
              editor.current().source,
              ...editor.current().bends.map(({ x, y }) => ({ x, y })),
              editor.current().target,
            ]).toEqual([map({ x: 100, y: 150 + offset }), map({ x: 300, y: 150 + offset })]);
          } else {
            expect(editor.current().bends).toHaveLength(2);
            expect(editor.current().target).toEqual(map({ x: 400, y: 150 }));
            expect(editor.current().bends[0][vertical ? 'x' : 'y']).toBe(150 + offset);
          }
          if (offset === 5) {
            // Keep moving in the same gesture after collapse, then leave and
            // re-enter the merge range in both directions without releasing.
            for (const height of [151, 155, 159, 161, 159, 151, 150, 149, 145, 141, 139, 141]) {
              editor.drag(map({ x: 250, y: height }), 1, vertical ? 'y' : 'x', false);
              if (Math.abs(height - 150) < 10) {
                expect([
                  editor.current().source,
                  ...editor.current().bends.map(({ x, y }) => ({ x, y })),
                  editor.current().target,
                ]).toEqual([map({ x: 100, y: height }), map({ x: 300, y: height })]);
              } else {
                expect(editor.current().bends[0][vertical ? 'x' : 'y']).toBe(height);
                expect(editor.current().target).toEqual(map({ x: 400, y: 150 }));
              }
              expect(editor.current().controls.middleBendingPoints[1][vertical ? 'x' : 'y']).toBe(height);
            }
          }
          const savedBends = editor.current().bends.map(({ x, y }) => ({ x, y }));
          editor.stop();
          expect(editor.edges[0].data.bendingPoints).toEqual(savedBends);
        });
      }
    }
  }
  for (const vertical of [false, true]) {
    for (const move of [false, true]) {
      it(`segment release does not clear selection through a trailing pane click: vertical=${vertical}, move=${move}`, () => {
        vi.useFakeTimers();
        try {
          const map = ({ x, y }: Point): Point => (vertical ? { x: y, y: x } : { x, y });
          const nodes: Node[] = [
            {
              id: 'source',
              width: 80,
              height: 80,
              internals: { positionAbsolute: map({ x: -80, y: 60 }) },
              data: {
                connectionHandles: [
                  { id: 'source-handle', edgeId: 'edge', position: vertical ? Position.Bottom : Position.Right },
                ],
              },
            },
            {
              id: 'target',
              width: vertical ? 200 : 120,
              height: vertical ? 120 : 200,
              internals: { positionAbsolute: map({ x: 200, y: 80 }) },
              data: {
                connectionHandles: [
                  { id: 'target-handle', edgeId: 'edge', position: vertical ? Position.Top : Position.Left },
                ],
              },
            },
          ];
          const editor = harness(nodes, map({ x: 0, y: 100 }), map({ x: 199, y: 250 }), [
            map({ x: 50, y: 100 }),
            map({ x: 50, y: 250 }),
          ]);
          let selected = true;
          const onPaneClick = vi.fn(() => {
            selected = false;
          });
          const view = () =>
            React.createElement(
              'div',
              { 'data-testid': 'pane', onClick: onPaneClick },
              React.createElement('svg', null, editor.line(1))
            );
          const ui = render(view());
          const pane = ui.getByTestId('pane');
          const rect = ui.getByTestId('temporary-moving-line-1');
          const start = map({ x: 50, y: 175 });
          const end = move ? map({ x: 250, y: 175 }) : start;
          fireEvent.mouseDown(rect, { button: 0, clientX: start.x, clientY: start.y });
          if (move) {
            fireEvent.mouseMove(document, { buttons: 1, clientX: end.x, clientY: end.y });
            ui.rerender(view());
            expect(rect.style.visibility).toBe('hidden');
          }
          fireEvent.mouseUp(pane, { button: 0, clientX: end.x, clientY: end.y });
          // Browsers target the common ancestor when the pressed SVG segment
          // disappears before release. React Flow treats this as a pane click.
          fireEvent.click(pane, { button: 0, detail: 1, clientX: end.x, clientY: end.y });
          expect(selected).toBe(move);
          expect(onPaneClick).toHaveBeenCalledTimes(move ? 0 : 1);
          act(() => {
            vi.runAllTimers();
          });
          fireEvent.click(pane, { button: 0, detail: 1, clientX: end.x, clientY: end.y });
          expect(selected).toBe(false);
          expect(onPaneClick).toHaveBeenCalledTimes(move ? 1 : 2);
        } finally {
          vi.useRealTimers();
        }
      });
    }
  }
  for (const swallowed of [false, true]) {
    it(`actual Draggable clips its highlight and survives reversals (swallowed=${swallowed})`, () => {
      const nodes: Node[] = [
        {
          id: 'source',
          width: 80,
          height: 80,
          internals: { positionAbsolute: { x: -80, y: 60 } },
          data: { connectionHandles: [{ id: 'source-handle', edgeId: 'edge', position: Position.Right }] },
        },
        {
          id: 'target',
          width: 120,
          height: swallowed ? 200 : 80,
          internals: { positionAbsolute: { x: 200, y: swallowed ? 80 : 200 } },
          data: { connectionHandles: [{ id: 'target-handle', edgeId: 'edge', position: Position.Left }] },
        },
      ];
      const editor = harness(nodes, { x: 0, y: 100 }, { x: 199, y: 250 }, [
        { x: 50, y: 100 },
        { x: 50, y: 250 },
      ]);
      const ui = render(React.createElement('svg', null, editor.line(1)));
      const rect = ui.getByTestId('temporary-moving-line-1');
      fireEvent.mouseDown(rect, { button: 0, clientX: 50, clientY: 175 });
      expect(editor.edges[0].reconnectable).toBe(true);
      fireEvent.mouseMove(document, { buttons: 1, clientX: 250, clientY: 175 });
      expect(editor.edges[0].reconnectable).toBe(false);
      ui.rerender(React.createElement('svg', null, editor.line(1)));
      expect(ui.getByTestId('temporary-moving-line-1')).toBe(rect);
      if (swallowed) {
        expect(rect.style.visibility).toBe('hidden');
      } else {
        const transform = rect
          .getAttribute('transform')
          ?.match(/-?\d+(?:\.\d+)?/gu)
          ?.map(Number);
        if (!transform) {
          throw new Error('Missing segment highlight transform');
        }
        // Include the five-unit half-stroke used by DiagramRenderer.css.
        expect(transform[1] + Number(rect.getAttribute('height')) + 5).toBeLessThanOrEqual(200);
        expect(Number(rect.getAttribute('height'))).toBeGreaterThan(0);
      }
      fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 175 });
      ui.rerender(React.createElement('svg', null, editor.line(1)));
      expect(editor.current().target).toEqual({ x: 200, y: 250 });
      expect(editor.current().controls.middleBendingPoints[1]).toEqual({
        x: 100,
        y: 175,
        direction: 'y',
        segmentLength: 150,
      });
      fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 175 });
      expect(editor.edges[0].reconnectable).toBe(true);
      expect(editor.synchronize).toHaveBeenCalledOnce();
    });
  }
  for (const reconnectable of [true, false, 'source', 'target'] as const) {
    it(`hides stale reconnect circles during drag and restores ${String(reconnectable)}`, () => {
      const nodes: Node[] = [
        {
          id: 'source',
          width: 80,
          height: 80,
          internals: { positionAbsolute: { x: -80, y: 60 } },
          data: { connectionHandles: [{ id: 'source-handle', edgeId: 'edge', position: Position.Right }] },
        },
        {
          id: 'target',
          width: 120,
          height: 80,
          internals: { positionAbsolute: { x: 200, y: 200 } },
          data: { connectionHandles: [{ id: 'target-handle', edgeId: 'edge', position: Position.Left }] },
        },
      ];
      const editor = harness(
        nodes,
        { x: 0, y: 100 },
        { x: 199, y: 250 },
        [
          { x: 50, y: 100 },
          { x: 50, y: 250 },
        ],
        reconnectable
      );
      editor.drag({ x: 250, y: 175 }, 1, 'y');
      expect(editor.edges[0].reconnectable).toBe(false);
      editor.stop();
      expect(editor.edges[0].reconnectable).toBe(reconnectable);
    });
  }
  it('preserves short deliberate segments when saving', () => {
    const sourceNode: Node = {
      id: 'source',
      width: 4,
      height: 4,
      internals: { positionAbsolute: { x: -4, y: 3 } },
      data: { connectionHandles: [{ id: 'source-handle', edgeId: 'edge', position: Position.Right }] },
    };
    const targetNode: Node = {
      id: 'target',
      width: 6,
      height: 4,
      internals: { positionAbsolute: { x: 10, y: 10 } },
      data: { connectionHandles: [{ id: 'target-handle', edgeId: 'edge', position: Position.Left }] },
    };
    const editor = harness([sourceNode, targetNode], { x: 0, y: 5 }, { x: 10, y: 12.5 }, [
      { x: 2.5, y: 5 },
      { x: 2.5, y: 12.5 },
    ]);
    editor.drag({ x: 17.5, y: 8.75 }, 1, 'y');
    const before = [
      editor.current().source,
      ...editor.current().bends.map(({ x, y }) => ({ x, y })),
      editor.current().target,
    ];
    editor.stop();
    expect([editor.current().source, ...editor.edges[0].data.bendingPoints, editor.current().target]).toEqual(before);
  });
  for (let rotation = 0; rotation < 4; rotation++) {
    for (const reflect of [false, true]) {
      const transform = (p: Point): Point => {
        let { x, y } = p;
        if (reflect) {
          x = -x;
        }
        for (let i = 0; i < rotation; i++) {
          [x, y] = [-y, x];
        }
        return { x: x + 471, y: y - 193 };
      };
      const side = (position: Position): Position => {
        const p = transform(
          { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } }[position]
        );
        const zero = transform({ x: 0, y: 0 });
        return p.x < zero.x
          ? Position.Left
          : p.x > zero.x
          ? Position.Right
          : p.y < zero.y
          ? Position.Top
          : Position.Bottom;
      };
      const node = (id: string, x: number, y: number, width: number, height: number, position: Position): Node => {
        const a = transform({ x, y });
        const b = transform({ x: x + width, y: y + height });
        return {
          id,
          width: Math.abs(a.x - b.x),
          height: Math.abs(a.y - b.y),
          internals: { positionAbsolute: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) } },
          data: { connectionHandles: [{ id: `${id}-handle`, edgeId: 'edge', position: side(position) }] },
        };
      };
      for (const { reverse, extraBends, gap } of [false, true].flatMap((reversed) =>
        [false, true].flatMap((long) => [0, 1].map((offset) => ({ reverse: reversed, extraBends: long, gap: offset })))
      )) {
        it(`collapsing a backtrack clips both ends to facing sides: rotation=${rotation}, reflect=${reflect}, reverse=${reverse}, gap=${gap}, extraBends=${extraBends}`, () => {
          let nodes = [
            node('source', 93, 156, 200, 100, Position.Bottom),
            node('target', 426.4392523364486, 156, 200, 100, Position.Right),
          ];
          let source = transform({ x: 193, y: 256 + gap });
          let target = transform({ x: 626.4392523364486 + gap, y: 206 });
          let bends = [
            { x: 193, y: 348.30607476635464 },
            { x: 680.9953271028038, y: 348.30607476635464 },
            { x: 680.9953271028038, y: 206 },
          ].map((point) => transform(point));
          if (extraBends) {
            bends = [
              { x: 193, y: 348.30607476635464 },
              { x: 250, y: 348.30607476635464 },
              { x: 250, y: 206 },
              { x: 680.9953271028038, y: 206 },
            ].map((point) => transform(point));
          }
          if (reverse) {
            nodes = [...nodes].reverse().map((n, i) => ({
              ...n,
              data: {
                connectionHandles: [
                  {
                    ...n.data.connectionHandles[0],
                    id: i === 0 ? 'source-handle' : 'target-handle',
                  },
                ],
              },
            }));
            [source, target] = [target, source];
            bends = [...bends].reverse();
          }
          const editor = harness(nodes, source, target, bends);
          editor.drag(transform({ x: 400, y: 206 }), reverse ? bends.length - 1 : 1, rotation % 2 === 0 ? 'x' : 'y');
          const expected = [
            { x: 293, y: 206 },
            { x: 426.4392523364486, y: 206 },
          ].map((point) => transform(point));
          if (reverse) {
            expected.reverse();
          }
          expect([
            editor.current().source,
            ...editor.current().bends.map(({ x, y }) => ({ x, y })),
            editor.current().target,
          ]).toEqual(expected);
          editor.stop();
          expect(editor.edges[0].data.bendingPoints).toEqual([]);
          expect(editor.nodes().map((n) => n.data.connectionHandles[0].position)).toEqual(
            (reverse ? [Position.Left, Position.Right] : [Position.Right, Position.Left]).map((position) =>
              side(position)
            )
          );
        });
      }
      for (const reverse of [false, true]) {
        for (const x of [150, 200, 250, 320, 350]) {
          it(`terminal segment changes side at center: rotation=${rotation}, reflect=${reflect}, reverse=${reverse}, x=${x}`, () => {
            let nodes = [
              node('source', -80, 60, 80, 80, Position.Right),
              node('target', 200, 200, 120, 80, Position.Top),
            ];
            let source = transform({ x: 1, y: 100 });
            let target = transform({ x: 260, y: 199 });
            let bends = [transform({ x: 260, y: 100 })];
            if (reverse) {
              nodes = [...nodes].reverse().map((n, i) => ({
                ...n,
                data: {
                  connectionHandles: [
                    { ...n.data.connectionHandles[0], id: i === 0 ? 'source-handle' : 'target-handle' },
                  ],
                },
              }));
              [source, target] = [target, source];
              bends = [...bends].reverse();
            }
            const editor = harness(nodes, source, target, bends);
            editor.drag(transform({ x, y: 150 }), reverse ? 0 : 1, rotation % 2 === 0 ? 'y' : 'x');
            const expected = transform(x < 200 ? { x: 200, y: 240 } : x > 320 ? { x: 320, y: 240 } : { x, y: 200 });
            expect(reverse ? editor.current().source : editor.current().target).toEqual(expected);
            const path = [editor.current().source, ...editor.current().bends, editor.current().target];
            for (let i = 1; i < path.length; i++) {
              expect(path[i].x === path[i - 1].x || path[i].y === path[i - 1].y).toBe(true);
            }
            editor.stop();
            expect(reverse ? editor.current().source : editor.current().target).toEqual(expected);
            expect(editor.nodes()[reverse ? 0 : 1].data.connectionHandles[0].position).toBe(
              side(x < 200 ? Position.Left : x > 320 ? Position.Right : Position.Top)
            );
          });
        }
        it(`highlight follows the clipped segment through reversals: rotation=${rotation}, reflect=${reflect}, reverse=${reverse}`, () => {
          let nodes = [
            node('source', -80, 60, 80, 80, Position.Right),
            node('target', 200, 200, 120, 80, Position.Left),
          ];
          let source = transform({ x: 0, y: 100 });
          let target = transform({ x: 199, y: 250 });
          let bends = [
            { x: 50, y: 100 },
            { x: 50, y: 250 },
          ].map((point) => transform(point));
          if (reverse) {
            nodes = [...nodes].reverse().map((n, i) => ({
              ...n,
              data: {
                connectionHandles: [
                  { ...n.data.connectionHandles[0], id: i === 0 ? 'source-handle' : 'target-handle' },
                ],
              },
            }));
            [source, target] = [target, source];
            bends = [...bends].reverse();
          }
          const editor = harness(nodes, source, target, bends);
          for (const [i, x] of [100, 250, 350, 250, 100].entries()) {
            editor.drag(transform({ x, y: 175 }), 1, rotation % 2 === 0 ? 'y' : 'x', i === 0);
            const point = editor.current().controls.middleBendingPoints[1];
            expect(point).toEqual({
              ...transform({ x, y: x === 250 ? 150 : 175 }),
              direction: rotation % 2 === 0 ? 'y' : 'x',
              segmentLength: x === 250 ? 100 : 150,
            });
          }
        });
      }
      const cases = [
        {
          name: 'single bend disappears into a straight connection',
          source: { x: 50, y: 100 },
          sourceRect: [-100, 20, 400, 80],
          sourceSide: Position.Bottom,
          bends: [{ x: 50, y: 250 }],
          index: 0,
          pointer: { x: 250, y: 175 },
          expectedSource: { x: 250, y: 100 },
          expectedTarget: { x: 250, y: 200 },
        },
        {
          name: 'single bend changes both attachments',
          source: { x: 50, y: 100 },
          sourceRect: [10, 20, 80, 80],
          sourceSide: Position.Bottom,
          bends: [{ x: 50, y: 250 }],
          index: 0,
          pointer: { x: 250, y: 175 },
          expectedSource: { x: 90, y: 60 },
          expectedTarget: { x: 250, y: 200 },
        },
        {
          name: 'terminal horizontal segment moves above node',
          bends: [
            { x: 50, y: 100 },
            { x: 50, y: 250 },
          ],
          index: 2,
          pointer: { x: 125, y: 175 },
          axis: 'x',
          expectedTarget: { x: 260, y: 200 },
        },
        {
          name: 'terminal horizontal segment moves below node',
          bends: [
            { x: 50, y: 100 },
            { x: 50, y: 250 },
          ],
          index: 2,
          pointer: { x: 125, y: 310 },
          axis: 'x',
          expectedTarget: { x: 260, y: 280 },
        },
        {
          name: 'adjacent vertical segment enters from below',
          source: { x: 0, y: 350 },
          sourceRect: [-80, 310, 80, 80],
          bends: [
            { x: 50, y: 350 },
            { x: 50, y: 250 },
          ],
          index: 1,
          pointer: { x: 250, y: 300 },
          expectedTarget: { x: 250, y: 280 },
        },
        {
          name: 'long route retains unrelated bends',
          bends: [
            { x: 30, y: 100 },
            { x: 30, y: 20 },
            { x: 50, y: 20 },
            { x: 50, y: 250 },
          ],
          index: 3,
          pointer: { x: 250, y: 135 },
          expectedTarget: { x: 250, y: 200 },
        },
        {
          name: 'interior segment preserves endpoints',
          bends: [
            { x: 30, y: 100 },
            { x: 30, y: 20 },
            { x: 50, y: 20 },
            { x: 50, y: 250 },
          ],
          index: 2,
          pointer: { x: 40, y: -30 },
          axis: 'x',
          expectedTarget: { x: 200, y: 250 },
        },
        {
          name: 'straight segment moved beyond both nodes',
          source: { x: 0, y: 250 },
          sourceRect: [-80, 210, 80, 80],
          bends: [],
          index: 0,
          pointer: { x: 100, y: 170 },
          axis: 'x',
          expectedSource: { x: -40, y: 210 },
          expectedTarget: { x: 260, y: 200 },
        },
      ];
      for (const scenario of cases) {
        for (const reverse of [false, true]) {
          it(`${scenario.name}: rotation=${rotation}, reflect=${reflect}, reverse=${reverse}`, () => {
            const rect = scenario.sourceRect ?? [-80, 60, 80, 80];
            let nodes = [
              node('source', rect[0], rect[1], rect[2], rect[3], scenario.sourceSide ?? Position.Right),
              node('target', 200, 200, 120, 80, Position.Left),
            ];
            let source = transform(scenario.source ?? { x: 0, y: 100 });
            let target = transform({ x: 200, y: 250 });
            let bends = scenario.bends.map((point) => transform(point));
            if (reverse) {
              nodes = [nodes[1], nodes[0]].map((n, i) => ({
                ...n,
                data: {
                  connectionHandles: [
                    { ...n.data.connectionHandles[0], id: i === 0 ? 'source-handle' : 'target-handle' },
                  ],
                },
              }));
              [source, target] = [target, source];
              bends = [...bends].reverse();
            }
            const editor = harness(nodes, source, target, bends);
            const axis = scenario.axis ?? 'y';
            editor.drag(
              transform(scenario.pointer),
              reverse ? bends.length - scenario.index : scenario.index,
              rotation % 2 === 0 ? axis : axis === 'x' ? 'y' : 'x'
            );
            expect(reverse ? editor.current().source : editor.current().target).toEqual(
              transform(scenario.expectedTarget)
            );
            expect(reverse ? editor.current().target : editor.current().source).toEqual(
              transform(scenario.expectedSource ?? scenario.source ?? { x: 0, y: 100 })
            );
            const path = [editor.current().source, ...editor.current().bends, editor.current().target];
            for (let i = 1; i < path.length; i++) {
              const a = path[i - 1];
              const b = path[i];
              expect(a.x === b.x || a.y === b.y).toBe(true);
              for (const n of nodes) {
                const { x, y } = n.internals.positionAbsolute;
                const crosses =
                  a.x === b.x
                    ? a.x > x && a.x < x + n.width && Math.max(a.y, b.y) > y && Math.min(a.y, b.y) < y + n.height
                    : a.y > y && a.y < y + n.height && Math.max(a.x, b.x) > x && Math.min(a.x, b.x) < x + n.width;
                expect(crosses).toBe(false);
              }
            }
            editor.stop();
            expect(editor.synchronize).toHaveBeenCalledOnce();
            expect(editor.synchronize).toHaveBeenCalledWith(editor.edges, editor.nodes());
            expect(editor.edges[0].data.relativePositionBendingPoints).toEqual(
              editor.edges[0].data.bendingPoints.map((point) => ({
                x: point.x - editor.current().source.x,
                y: point.y - editor.current().source.y,
              }))
            );
            // Persisted coordinates reconstruct the same endpoints, including corner attachments.
            for (const [i, point] of [editor.current().source, editor.current().target].entries()) {
              const n = editor.nodes()[i];
              const h = n.data.connectionHandles[0];
              const xy = h.XYPosition;
              if (!xy) {
                throw new Error('Missing persisted endpoint coordinates');
              }
              const reconstructed = {
                x:
                  n.internals.positionAbsolute.x +
                  (h.position === Position.Left ? 0 : h.position === Position.Right ? n.width : xy.x + 3),
                y:
                  n.internals.positionAbsolute.y +
                  (h.position === Position.Top ? 0 : h.position === Position.Bottom ? n.height : xy.y + 3),
              };
              expect(reconstructed).toEqual(point);
            }
          });
        }
      }
      it(`can cross the shape and reverse within one drag: rotation=${rotation}, reflect=${reflect}`, () => {
        const editor = harness(
          [node('source', -80, 60, 80, 80, Position.Right), node('target', 200, 200, 120, 80, Position.Left)],
          transform({ x: 0, y: 100 }),
          transform({ x: 200, y: 250 }),
          [
            { x: 50, y: 100 },
            { x: 50, y: 250 },
          ].map((point) => transform(point))
        );
        for (const [i, x] of [250, 350, 250, 100].entries()) {
          editor.drag(transform({ x, y: 175 }), 1, rotation % 2 === 0 ? 'y' : 'x', i === 0);
          expect(editor.current().target).toEqual(
            transform(x === 250 ? { x, y: 200 } : { x: x > 320 ? 320 : 200, y: 250 })
          );
        }
        editor.stop();
        expect(editor.nodes()[1].data.connectionHandles[0].position).toBe(side(Position.Left));
      });
      for (const reverse of [false, true]) {
        for (const { destination, gap } of [50, 200, 250, 320, 350].flatMap((coordinate) =>
          [0, 1].map((offset) => ({ destination: coordinate, gap: offset }))
        )) {
          it(`clips/persists: rotation=${rotation}, reflect=${reflect}, reverse=${reverse}, coordinate=${destination}, handleGap=${gap}`, () => {
            let nodes = [
              node('source', -80, 60, 80, 80, Position.Right),
              node('target', 200, 200, 120, 80, Position.Left),
            ];
            let source = transform({ x: gap, y: 100 });
            let target = transform({ x: 200 - gap, y: 250 });
            let bends = [
              { x: 50, y: 100 },
              { x: 50, y: 250 },
            ].map((point) => transform(point));
            if (reverse) {
              nodes = [nodes[1], nodes[0]].map((n, i) => ({
                ...n,
                data: {
                  connectionHandles: [
                    { ...n.data.connectionHandles[0], id: i === 0 ? 'source-handle' : 'target-handle' },
                  ],
                },
              }));
              [source, target] = [target, source];
              bends = [...bends].reverse();
            }
            const editor = harness(nodes, source, target, bends);
            const inside = destination >= 200 && destination <= 320;
            const expected = transform(
              inside ? { x: destination, y: 200 } : { x: destination < 200 ? 200 : 320, y: 250 }
            );
            const expectedSide = side(inside ? Position.Top : destination < 200 ? Position.Left : Position.Right);
            editor.drag(transform({ x: destination, y: 175 }), 1, rotation % 2 === 0 ? 'y' : 'x');
            expect(reverse ? editor.current().source : editor.current().target).toEqual(expected);
            const path = [editor.current().source, ...editor.current().bends, editor.current().target];
            for (let i = 1; i < path.length; i++) {
              expect(path[i].x === path[i - 1].x || path[i].y === path[i - 1].y).toBe(true);
            }
            editor.stop();
            expect(editor.synchronize).toHaveBeenCalledOnce();
            expect(editor.synchronize).toHaveBeenCalledWith(editor.edges, editor.nodes());
            expect(editor.edges[0].data.relativePositionBendingPoints).toEqual(
              editor.edges[0].data.bendingPoints.map((point) => ({
                x: point.x - editor.current().source.x,
                y: point.y - editor.current().source.y,
              }))
            );
            const attached = editor.nodes()[reverse ? 0 : 1];
            const handle = attached.data.connectionHandles[0];
            expect(handle.position).toBe(expectedSide);
            const relative = {
              x: expected.x - attached.internals.positionAbsolute.x,
              y: expected.y - attached.internals.positionAbsolute.y,
            };
            expect(handle.XYPosition).toEqual(
              expectedSide === Position.Top
                ? { x: relative.x - 3, y: 0 }
                : expectedSide === Position.Bottom
                ? { x: relative.x - 3, y: -6 }
                : expectedSide === Position.Left
                ? { x: 0, y: relative.y - 3 }
                : { x: -6, y: relative.y - 3 }
            );
            expect(editor.edges[0].data.bendingPoints).toEqual(editor.current().bends.map(({ x, y }) => ({ x, y })));
          });
        }
      }
    }
  }
});
