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

import { act, cleanup, render } from '@testing-library/react';
import { createContext, StrictMode, useContext, useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionTargetHandle } from '../ConnectionTargetHandle';
import { ConnectionHandle } from '../ConnectionHandles.types';
import { useRefreshConnectionHandles } from '../useRefreshConnectionHandles';

interface Store {
  getState: () => unknown;
  update: (ids: string[]) => void;
}
interface Handle {
  id: string;
  XYPosition: { x: number; y: number };
}
const StoreContext = createContext<Store | null>(null);
function useTestStore(): Store {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('Missing test store');
  }
  return store;
}

const initialized = vi.fn();
const mountedTargets = new Set<string>();
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useStoreApi: () => useTestStore(),
  useStore: (selector: (state: unknown) => unknown) => selector(useTestStore().getState()),
  useUpdateNodeInternals: () => {
    initialized();
    return useTestStore().update;
  },
  Handle: ({ id }: { id: string }) => {
    useEffect(() => {
      mountedTargets.add(id);
      return () => {
        mountedTargets.delete(id);
      };
    }, [id]);
    return null;
  },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  initialized.mockClear();
});

function scheduler() {
  const microtasks: (() => void)[] = [];
  vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((task) => {
    microtasks.push(task);
  });
  const flush = () =>
    act(() => {
      while (microtasks.length) microtasks.shift()?.();
    });
  return { flush, microtasks };
}
function loadHook() {
  function Probe({ id, version }: { id: string; version: number }) {
    const handle: Handle = { id: 'handle', XYPosition: { x: version, y: 0 } };
    useRefreshConnectionHandles(id, [handle as ConnectionHandle]);
    return null;
  }
  return { Probe, ...scheduler() };
}
function loadTargets() {
  return { Target: ConnectionTargetHandle, initialized, ...scheduler() };
}

describe('batched handle remeasurements', () => {
  it('skips the initial measurement and batches 1000 updates into one React Flow call', () => {
    const { Probe, flush, microtasks } = loadHook();
    const store: Store = { getState: () => ({}), update: vi.fn() };
    const tree = (version: number) => (
      <StoreContext.Provider value={store}>
        {Array.from({ length: 1000 }, (_, i) => (
          <Probe key={i} id={`node-${i}`} version={version} />
        ))}
      </StoreContext.Provider>
    );
    const view = render(tree(0));
    flush();
    expect(store.update).not.toHaveBeenCalled();
    view.rerender(tree(1));
    expect(microtasks).toHaveLength(1);
    flush();
    expect(store.update).toHaveBeenCalledOnce();
    expect(store.update).toHaveBeenLastCalledWith(Array.from({ length: 1000 }, (_, i) => `node-${i}`));
    view.rerender(tree(1));
    flush();
    expect(store.update).toHaveBeenCalledOnce();
    view.rerender(tree(2));
    flush();
    expect(store.update).toHaveBeenCalledTimes(2);
  });
  it('isolates diagrams and cancels unmounted requests without cancelling another owner of the same ID', () => {
    const { Probe, flush } = loadHook();
    const first: Store = { getState: () => ({}), update: vi.fn() };
    const second: Store = { getState: () => ({}), update: vi.fn() };
    const tree = (version: number, keepDuplicate: boolean) => (
      <>
        <StoreContext.Provider value={first}>
          {keepDuplicate && <Probe key="duplicate" id="same" version={version} />}
          <Probe key="original" id="same" version={version} />
        </StoreContext.Provider>
        <StoreContext.Provider value={second}>
          <Probe id="same" version={version} />
        </StoreContext.Provider>
      </>
    );
    const view = render(tree(0, true));
    view.rerender(tree(1, true));
    view.rerender(tree(1, false));
    flush();
    expect(first.update).toHaveBeenCalledExactlyOnceWith(['same']);
    expect(second.update).toHaveBeenCalledExactlyOnceWith(['same']);
    view.rerender(tree(2, false));
    view.unmount();
    flush();
    expect(first.update).toHaveBeenCalledOnce();
    expect(second.update).toHaveBeenCalledOnce();
  });
});

describe('temporary connection target lifecycle', () => {
  it('keeps idle nodes controller-free, mounts the same five targets while connecting and batches measurement', () => {
    const { Target, initialized, microtasks, flush } = loadTargets();
    let inProgress = false;
    const store: Store = { getState: () => ({ connection: { inProgress } }), update: vi.fn() };
    const tree = (active: boolean, count = 1000) => {
      inProgress = active;
      return (
        <StrictMode>
          <StoreContext.Provider value={{ ...store }}>
            {Array.from({ length: count }, (_, i) => (
              <Target key={i} nodeId={`n${i}`} isHovered={false} nodeDescription={undefined} />
            ))}
          </StoreContext.Provider>
        </StrictMode>
      );
    };
    const view = render(tree(false));
    expect(initialized).not.toHaveBeenCalled();
    expect(mountedTargets.size).toBe(0);
    view.rerender(tree(true));
    expect(mountedTargets.size).toBe(5000);
    flush();
    expect(store.update).toHaveBeenCalledExactlyOnceWith(Array.from({ length: 1000 }, (_, i) => `n${i}`));
    expect(mountedTargets.has('handle--n0--target')).toBe(true);
    view.rerender(tree(false));
    expect(mountedTargets.size).toBe(0);
    view.rerender(tree(true, 2));
    expect(microtasks.length).toBeGreaterThan(0);
    view.rerender(tree(false, 2));
    flush();
    expect(store.update).toHaveBeenCalledOnce();
  });
});
