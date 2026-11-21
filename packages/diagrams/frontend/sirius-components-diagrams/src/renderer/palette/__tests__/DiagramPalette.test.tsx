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
import { DiagramPalette } from '../DiagramPalette';

const fixture = vi.hoisted(() => ({
  query: vi.fn(() => ({ palette: null })),
  hidePalette: vi.fn(),
  open: true,
  ids: [] as string[],
  nodes: new Map(),
  edges: new Map(),
}));
vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ getNode: vi.fn(), getEdge: vi.fn(), getViewport: vi.fn() }),
  useStore: (selector: (state: object) => unknown) =>
    selector({ nodeLookup: fixture.nodes, edgeLookup: fixture.edges }),
}));
vi.mock('@eclipse-sirius/sirius-components-palette', () => ({
  usePalette: () => ({
    isOpened: fixture.open,
    representationElementIds: fixture.ids,
    hidePalette: fixture.hidePalette,
  }),
  PaletteExtensionSection: () => null,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../direct-edit/useDiagramDirectEdit', () => ({ useDiagramDirectEdit: () => ({}) }));
vi.mock('../usePaletteContents', () => ({ usePaletteContents: fixture.query }));
vi.mock('../appearance/PaletteAppearanceSection', () => ({ PaletteAppearanceSection: () => null }));
vi.mock('../DraggablePalette', () => ({ DraggablePalette: () => null }));
vi.mock('../GroupPaletteLayoutSection', () => ({ GroupPaletteLayoutSection: () => null }));
vi.mock('../PalettePortal', () => ({ PalettePortal: () => null }));
vi.mock('../ShowInSection', () => ({ ShowInSection: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function show({ open = true, ids = ['node'], nodes = ['node'], edges = ['edge'], readOnly = false } = {}) {
  fixture.open = open;
  fixture.ids = ids;
  fixture.nodes = new Map(nodes.map((id) => [id, {}]));
  fixture.edges = new Map(edges.map((id) => [id, {}]));
  render(
    <DiagramContext.Provider value={{ readOnly } as DiagramContextValue}>
      <DiagramPalette diagramId="diagram" diagramTargetObjectId="root" />
    </DiagramContext.Provider>
  );
  return { query: fixture.query, hidePalette: fixture.hidePalette };
}
it('does not load tools while hidden, even if the previous selection remains', () => {
  const { query, hidePalette } = show({ open: false });
  expect(query).toHaveBeenCalledWith(['node'], true);
  expect(hidePalette).not.toHaveBeenCalled();
});
it('does not load tools in read-only mode', () => {
  expect(show({ readOnly: true }).query).toHaveBeenCalledWith(['node'], true);
});
for (const ids of [['node'], ['edge'], [], ['diagram'], ['node', 'edge']]) {
  it(`loads the visible palette for the live selection ${JSON.stringify(ids)}`, () => {
    const { query, hidePalette } = show({ ids });
    expect(query).toHaveBeenCalledWith(ids.length ? ids : ['diagram'], false);
    expect(hidePalette).not.toHaveBeenCalled();
  });
}
for (const ids of [['deleted'], ['node', 'deleted'], ['edge', 'deleted'], ['diagram', 'deleted']]) {
  it(`closes without querying a removed selection ${JSON.stringify(ids)}`, () => {
    const { query, hidePalette } = show({ ids });
    expect(query).toHaveBeenCalledWith(ids, true);
    expect(hidePalette).toHaveBeenCalledOnce();
  });
}
it('does not close an already hidden stale palette', () => {
  const { query, hidePalette } = show({ open: false, ids: ['deleted'] });
  expect(query).toHaveBeenCalledWith(['deleted'], true);
  expect(hidePalette).not.toHaveBeenCalled();
});
