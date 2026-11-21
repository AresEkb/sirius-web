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
import { createContext, useContext } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { MarkerDefinitions, useSharedMarkerUrl } from '../MarkerDefinitions';

type MarkerEdge = { markerStart: string; markerEnd: string; style: { stroke: string } };
type MarkerState = { edges: MarkerEdge[] };
const StoreContext = createContext({ getState: () => ({ edges: [] as MarkerEdge[] }) });

vi.mock('@xyflow/react', () => ({
  useStoreApi: () => useContext(StoreContext),
  useStore: (selector: (state: MarkerState) => unknown) => selector(useContext(StoreContext).getState()),
}));
vi.mock('@eclipse-sirius/sirius-components-core', () => ({ getCSSColor: (color: string) => color }));
afterEach(cleanup);

function Url({ id, selected = false }: { id: number; selected?: boolean }) {
  return <output>{useSharedMarkerUrl(`url('#InputArrow--${id}')`, selected)}</output>;
}

it('shares definitions across equal markers and keeps selected variants, first colors and isolated diagrams', () => {
  const edges = Array.from({ length: 900 }, (_, i) => ({
    markerStart: `Diamond--${i}`,
    markerEnd: `InputArrow--${i}`,
    style: { stroke: '#123abc' },
  }));
  const first = { edges };
  const second = { edges };
  const one = { getState: () => first };
  const two = { getState: () => second };
  const draw = (store: typeof one) => (
    <StoreContext.Provider value={store}>
      <MarkerDefinitions />
      <Url id={0} />
      <Url id={899} />
      <Url id={0} selected />
    </StoreContext.Provider>
  );
  const ui = render(draw(one));
  const markers = () => Array.from(ui.container.querySelectorAll('marker'));
  const urls = () => Array.from(ui.container.querySelectorAll('output'), (value) => value.textContent);
  expect(markers()).toHaveLength(4);
  const ids = () => markers().map((marker) => marker.id);
  const originalIds = ids();
  expect(originalIds).toEqual([...originalIds].sort((left, right) => left.localeCompare(right)));
  const [url, aliased, selected] = urls();
  expect(aliased).toBe(url);
  expect(selected).not.toBe(url);
  expect(selected).toContain("--selected')");
  expect(url).toBe(`url('#${originalIds[2]}')`);
  ui.rerender(draw({ getState: one.getState }));
  expect(ids()).toEqual(originalIds);
  ui.rerender(draw(two));
  expect(ids()[0]).not.toBe(originalIds[0]);
  first.edges = [...edges, { ...edges[0]!, style: { stroke: 'red' } }];
  ui.rerender(draw(one));
  expect(urls()[0]).toBe(url);
  expect(markers().every((marker) => marker.querySelector('path')?.getAttribute('stroke') === '#123abc')).toBe(true);
  first.edges = [{ ...edges[0]!, style: { stroke: 'red' } }];
  ui.rerender(draw(one));
  expect(urls()[0]).not.toBe(url);
  expect(markers().every((marker) => marker.querySelector('path')?.getAttribute('stroke') === 'red')).toBe(true);
  first.edges = [];
  ui.rerender(draw(one));
  expect(markers()).toHaveLength(0);
});
