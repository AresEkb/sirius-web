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
import { HelperLines } from '../HelperLines';

const fixture = vi.hoisted(() => ({ viewport: { x: 10, y: 20, zoom: 2 } }));
vi.mock('@xyflow/react', () => ({
  useStore: (selector: (state: object) => unknown) => selector({ width: 800, height: 600 }),
  useViewport: () => fixture.viewport,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('does not allocate an idle guide canvas, draws zero-valued guides and reuses the active buffer', () => {
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
  const canvasContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const width = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
  const height = vi.spyOn(HTMLCanvasElement.prototype, 'height', 'set');
  const view = render(<HelperLines horizontal={null} vertical={null} />);
  expect(view.container.querySelector('canvas')).toBeNull();
  expect(canvasContext).not.toHaveBeenCalled();
  expect(width).not.toHaveBeenCalled();
  expect(height).not.toHaveBeenCalled();
  view.rerender(<HelperLines horizontal={0} vertical={0} />);
  expect(width).toHaveBeenCalledTimes(1);
  expect(height).toHaveBeenCalledTimes(1);
  expect(context.moveTo.mock.calls).toEqual([
    [10, 0],
    [0, 20],
  ]);
  fixture.viewport = { x: 30, y: 40, zoom: 3 };
  view.rerender(<HelperLines horizontal={0} vertical={0} />);
  expect(width).toHaveBeenCalledTimes(1);
  expect(height).toHaveBeenCalledTimes(1);
  expect(context.beginPath).toHaveBeenCalledTimes(2);
  expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
});
