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
import { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { DiagramContext } from '../../contexts/DiagramContext';
import { DiagramContextValue } from '../../contexts/DiagramContext.types';
import { DraggableEdgeLabels } from '../edge/DraggableEdgeLabels';
import { Label } from '../Label';

type ZoomStore = { panZoom: { getViewport: () => { zoom: number } } };
type Selector = (state: ZoomStore) => number;
const fixture = vi.hoisted(() => ({
  zoom: 2,
  editingId: null as string | null,
  selectors: [] as Selector[],
  viewport: vi.fn(),
  move: vi.fn(() => ({})),
  resize: vi.fn(() => ({})),
}));

const zoomStore = { panZoom: { getViewport: () => fixture.viewport() } } as ZoomStore;

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useStore: (selector: Selector) => {
    fixture.selectors.push(selector);
    return selector(zoomStore);
  },
  EdgeLabelRenderer: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@eclipse-sirius/sirius-components-core', () => ({ IconOverlay: () => null, getCSSColor: () => 'black' }));
vi.mock('../direct-edit/useDiagramDirectEdit', () => ({
  useDiagramDirectEdit: () => ({ currentlyEditedLabelId: fixture.editingId, editingKey: '', resetDirectEdit: vi.fn() }),
}));
vi.mock('../direct-edit/DiagramDirectEditInput', () => ({
  DiagramDirectEditInput: ({ width }: { width: number }) => <input data-width={width} />,
}));
vi.mock('../move/useLabelMove', () => ({ useLabelMove: fixture.move }));
vi.mock('../move/useLabelResize', () => ({ useLabelResize: fixture.resize }));
vi.mock('../edge/DraggableResizableLabel', () => ({
  DraggableResizableLabel: () => <span data-testid="draggable-label" />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  fixture.selectors.length = 0;
  fixture.editingId = null;
  fixture.zoom = 2;
});

const label = (visibility?: string) => ({
  id: 'label',
  text: 'Name',
  style: { visibility },
  contentStyle: {},
  iconURL: [],
  position: { x: 0, y: 0 },
});

it('keeps passive and read-only label selectors stable across zoom but uses live zoom while editing', () => {
  fixture.viewport.mockImplementation(() => ({ zoom: fixture.zoom }));
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 520 } as DOMRect);
  const data = label() as unknown as React.ComponentProps<typeof Label>['label'];
  const view = (readOnly = false) => (
    <DiagramContext.Provider value={{ readOnly } as DiagramContextValue}>
      <Label key={String(readOnly)} diagramElementId="node" label={data} faded={false} />
    </DiagramContext.Provider>
  );
  const ui = render(view());
  const passive = fixture.selectors.at(-1)!;
  expect(passive(zoomStore)).toBe(1);
  fixture.zoom = 4;
  expect(passive(zoomStore)).toBe(1);
  expect(fixture.viewport).not.toHaveBeenCalled();
  fixture.editingId = 'label';
  ui.rerender(view());
  const active = fixture.selectors.at(-1)!;
  expect(active(zoomStore)).toBe(4);
  expect(ui.container.querySelector('input')?.getAttribute('data-width')).toBe('130');
  fixture.zoom = 2;
  expect(active(zoomStore)).toBe(2);
  fixture.editingId = null;
  ui.rerender(view());
  fixture.editingId = 'label';
  ui.rerender(view());
  expect(ui.container.querySelector('input')?.getAttribute('data-width')).toBe('260');
  ui.rerender(view(true));
  expect(fixture.selectors.at(-1)!(zoomStore)).toBe(1);
});

it('skips absent and hidden edge labels and mounts visible controls without a parent zoom subscription', () => {
  const view = (data?: object) => (
    <DraggableEdgeLabels
      {...({ id: 'edge', data, edgeCenterPosition: { x: 0, y: 0 } } as React.ComponentProps<
        typeof DraggableEdgeLabels
      >)}
    />
  );
  const ui = render(view());
  expect(ui.container.childElementCount).toBe(0);
  ui.rerender(view({}));
  expect(ui.container.childElementCount).toBe(0);
  ui.rerender(view({ label: label('hidden'), beginLabel: label('collapse') }));
  expect(ui.container.childElementCount).toBe(0);
  expect(fixture.move).not.toHaveBeenCalled();
  for (const slot of ['label', 'beginLabel', 'endLabel']) {
    ui.rerender(view({ [slot]: label() }));
    expect(ui.getAllByTestId('draggable-label')).toHaveLength(1);
  }
  expect(fixture.selectors).toHaveLength(0);
});
