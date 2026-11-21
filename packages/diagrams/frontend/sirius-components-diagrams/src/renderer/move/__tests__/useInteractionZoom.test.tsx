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
import { ReactFlowProvider, useStore, useStoreApi } from '@xyflow/react';
import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import { afterEach, describe, expect, it } from 'vitest';

import { useInteractionZoom } from '../useInteractionZoom';

afterEach(cleanup);

type ZoomHook = typeof useInteractionZoom;
describe('gesture-only zoom', () => {
  it('does not redraw while idle, activates before bubbling, and releases on mouse/touch/blur', () => {
    let store: ReturnType<typeof useStoreApi> | undefined;
    let renders = 0;
    const starts: string[] = [];
    function Probe({ readOnly }: { readOnly: boolean }) {
      store = useStoreApi();
      const { zoom: currentZoom, begin } = useInteractionZoom(readOnly);
      renders++;
      return (
        <div
          data-testid="control"
          data-zoom={currentZoom}
          onMouseDownCapture={begin}
          onTouchStartCapture={begin}
          onMouseDown={(e) => starts.push(e.currentTarget.dataset.zoom ?? '')}
        />
      );
    }
    const view = render(
      <ReactFlowProvider>
        <Probe readOnly={false} />
      </ReactFlowProvider>
    );
    function zoom(value: number) {
      act(() => store?.setState({ transform: [0, 0, value] }));
    }
    const before = renders;
    zoom(2);
    zoom(4);
    expect(renders).toBe(before);
    const control = view.getByTestId('control');
    fireEvent.mouseDown(control);
    expect(starts).toEqual(['4']);
    zoom(3);
    expect(control.dataset.zoom).toBe('3');
    fireEvent.mouseUp(window);
    expect(control.dataset.zoom).toBe('1');
    fireEvent.touchStart(control);
    expect(control.dataset.zoom).toBe('3');
    fireEvent.touchCancel(window);
    expect(control.dataset.zoom).toBe('1');
    fireEvent.mouseDown(control);
    fireEvent.blur(window);
    expect(control.dataset.zoom).toBe('1');
    view.rerender(
      <ReactFlowProvider>
        <Probe readOnly />
      </ReactFlowProvider>
    );
    fireEvent.mouseDown(control);
    expect(control.dataset.zoom).toBe('1');
  });

  it('matches always-live react-draggable deltas when starting after idle zoom and zooming mid-drag', () => {
    function trace(useZoom: ZoomHook): number[][] {
      const events: number[][] = [];
      let store: ReturnType<typeof useStoreApi> | undefined;
      function Control() {
        store = useStoreApi();
        const { zoom, begin } = useZoom(false);
        const nodeRef = useRef<HTMLDivElement>(null);
        return (
          <div onMouseDownCapture={begin} onTouchStartCapture={begin}>
            <Draggable
              nodeRef={nodeRef}
              scale={zoom}
              onDrag={(_e, d) => {
                events.push([d.x, d.y]);
              }}>
              <div ref={nodeRef} data-testid="drag" />
            </Draggable>
          </div>
        );
      }
      const view = render(
        <ReactFlowProvider>
          <Control />
        </ReactFlowProvider>
      );
      act(() => store?.setState({ transform: [0, 0, 2] }));
      fireEvent.mouseDown(view.getByTestId('drag'), { button: 0, clientX: 10, clientY: 10 });
      fireEvent.mouseMove(document, { clientX: 50, clientY: 30 });
      act(() => store?.setState({ transform: [0, 0, 4] }));
      fireEvent.mouseMove(document, { clientX: 90, clientY: 50 });
      fireEvent.mouseUp(document, { clientX: 90, clientY: 50 });
      view.unmount();
      return events;
    }
    function useAlwaysLive(): ReturnType<ZoomHook> {
      return { zoom: useStore((s) => s.transform[2]), begin: () => {} };
    }
    const expected = trace(useAlwaysLive);
    expect(expected.length).toBeGreaterThan(0);
    expect(expected[0]).toEqual([20, 10]);
    expect(trace(useInteractionZoom)).toEqual(expected);
  });

  it('matches always-live react-resizable sizes after idle zoom', () => {
    function trace(useZoom: ZoomHook): number[][] {
      const sizes: number[][] = [];
      let store: ReturnType<typeof useStoreApi> | undefined;
      function Control() {
        store = useStoreApi();
        const { zoom, begin } = useZoom(false);
        const [size, setSize] = useState({ width: 100, height: 40 });
        return (
          <div onMouseDownCapture={begin} onTouchStartCapture={begin}>
            <Resizable
              width={size.width}
              height={size.height}
              transformScale={zoom}
              onResize={(_e, data) => {
                sizes.push([data.size.width, data.size.height]);
                setSize(data.size);
              }}>
              <div data-testid="resize" />
            </Resizable>
          </div>
        );
      }
      const view = render(
        <ReactFlowProvider>
          <Control />
        </ReactFlowProvider>
      );
      act(() => store?.setState({ transform: [0, 0, 2] }));
      const handle = view.container.querySelector('.react-resizable-handle');
      if (!handle) {
        throw new Error('Missing resize handle');
      }
      fireEvent.mouseDown(handle, { button: 0, clientX: 10, clientY: 10 });
      fireEvent.mouseMove(document, { clientX: 50, clientY: 30 });
      fireEvent.mouseUp(document, { clientX: 50, clientY: 30 });
      view.unmount();
      return sizes;
    }
    function useAlwaysLive(): ReturnType<ZoomHook> {
      return { zoom: useStore((s) => s.transform[2]), begin: () => {} };
    }
    const expected = trace(useAlwaysLive);
    expect(expected.length).toBeGreaterThan(0);
    expect(trace(useInteractionZoom)).toEqual(expected);
  });
});
