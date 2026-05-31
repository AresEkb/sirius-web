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
import { DiagramContext } from '../../../contexts/DiagramContext';
import { DiagramContextValue } from '../../../contexts/DiagramContext.types';
import { GQLDiagramRefreshedEventPayload } from '../../../graphql/subscription/diagramEventSubscription.types';
import { usePostToolSelection } from '../usePostToolSelection';

interface Element {
  id: string;
  hidden?: boolean;
  selected?: boolean;
  data: { targetObjectId: string; isLastNodeSelected?: boolean };
}
interface Payload {
  id: string;
  cause: string;
}

const fixture = vi.hoisted(() => ({ store: () => ({}), publish: vi.fn() }));
vi.mock('@eclipse-sirius/sirius-components-core', () => ({
  useSelection: () => ({ setSelection: fixture.publish }),
}));
vi.mock('@xyflow/react', () => ({
  useStoreApi: () => ({ getState: () => ({ addSelectedNodes: vi.fn() }) }),
}));
vi.mock('../../../representation/useStore', () => ({ useStore: () => fixture.store() }));

afterEach(cleanup);

function node(id: string, hidden = false): Element {
  return { id: `${id}-shape`, data: { targetObjectId: id }, hidden };
}

function harness(requested: string[]) {
  let nodes: Element[] = [{ ...node('old'), selected: true }];
  let edges: Element[] = [];
  const publish = vi.fn();
  fixture.publish = publish;
  fixture.store = () => ({
    getNodes: () => nodes,
    getEdges: () => edges,
    setNodes: (update: (previous: Element[]) => Element[]) => {
      nodes = update(nodes);
    },
    setEdges: (update: (previous: Element[]) => Element[]) => {
      edges = update(edges);
    },
  });
  const pending = new Map([['tool', { entries: requested.map((id) => ({ id })) }]]);
  const consume = vi.fn((id: string) => {
    const selection = pending.get(id);
    pending.delete(id);
    return selection;
  });
  const context = { toolSelections: pending, consumePostToolSelection: consume } as unknown as DiagramContextValue;
  function Probe({ event }: { event: Payload }) {
    usePostToolSelection(event as GQLDiagramRefreshedEventPayload);
    return null;
  }
  let view: ReturnType<typeof render> | undefined;
  return {
    pending,
    consume,
    publish,
    nodes: () => nodes,
    commitNodes: (next: Element[]) => {
      nodes = next;
    },
    commitEdges: (next: Element[]) => {
      edges = next;
    },
    render: (event: Payload = { id: 'tool', cause: 'layout' }) => {
      const element = (
        <DiagramContext.Provider value={context}>
          <Probe event={event} />
        </DiagramContext.Provider>
      );
      if (view) {
        view.rerender(element);
      } else {
        view = render(element);
      }
    },
  };
}

it('keeps the pending intent and previous selection until the new node commits, then publishes once', () => {
  const editor = harness(['created']);
  editor.render();
  expect(editor.consume).not.toHaveBeenCalled();
  expect(editor.nodes()[0].selected).toBe(true);
  expect(editor.publish).not.toHaveBeenCalled();
  editor.commitNodes([...editor.nodes(), node('created')]);
  editor.render();
  expect(editor.consume).toHaveBeenCalledTimes(1);
  expect(editor.publish).toHaveBeenCalledExactlyOnceWith({ entries: [{ id: 'created' }] });
  editor.render();
  expect(editor.publish).toHaveBeenCalledTimes(1);
});

it('retries the same payload after an edge commits', () => {
  const editor = harness(['created-edge']);
  editor.render();
  editor.commitEdges([node('created-edge')]);
  editor.render();
  expect(editor.publish).toHaveBeenCalledExactlyOnceWith({ entries: [{ id: 'created-edge' }] });
});

it('retains the existing visible subset behavior when another requested object is hidden', () => {
  const editor = harness(['visible', 'hidden']);
  editor.commitNodes([node('visible'), node('hidden', true)]);
  editor.render();
  expect(editor.consume).toHaveBeenCalledTimes(1);
  expect(editor.publish).toHaveBeenCalledExactlyOnceWith({ entries: [{ id: 'visible' }] });
});

it('does not deselect or consume an intent represented only by hidden or missing objects', () => {
  const editor = harness(['hidden', 'unrepresented']);
  editor.commitNodes([...editor.nodes(), node('hidden', true)]);
  editor.render();
  expect(editor.nodes()[0].selected).toBe(true);
  expect(editor.pending.size).toBe(1);
  expect(editor.publish).not.toHaveBeenCalled();
});

it('preserves the existing empty-intent clearing behavior', () => {
  const editor = harness([]);
  editor.render();
  expect(editor.consume).toHaveBeenCalledTimes(1);
  expect(editor.nodes()[0].selected).toBe(false);
  expect(editor.publish).not.toHaveBeenCalled();
});

it('selects only the first visible shape for a semantic object', () => {
  const editor = harness(['created']);
  editor.commitNodes([node('created'), { ...node('created'), id: 'second-shape' }]);
  editor.render();
  expect(editor.nodes().map((element) => Boolean(element.selected))).toEqual([true, false]);
  expect(editor.publish).toHaveBeenCalledExactlyOnceWith({ entries: [{ id: 'created' }] });
});

it('does not consume an unrelated event or an unfinished refresh', () => {
  const editor = harness(['created']);
  editor.commitNodes([node('created')]);
  editor.render({ id: 'other-tool', cause: 'layout' });
  editor.render({ id: 'tool', cause: 'refresh' });
  expect(editor.consume).not.toHaveBeenCalled();
  expect(editor.publish).not.toHaveBeenCalled();
});
