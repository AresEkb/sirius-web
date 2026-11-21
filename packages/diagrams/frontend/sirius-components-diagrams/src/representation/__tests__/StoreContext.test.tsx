/*******************************************************************************
 * Copyright (c) 2024 Obeo.
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
import { memo } from 'react';
import { afterEach, expect, it } from 'vitest';
import { NodeData } from '../../renderer/DiagramRenderer.types';
import { StoreContextProvider } from '../StoreContext';
import { StoreContextValue } from '../StoreContext.types';
import { useStore, useStoreActions } from '../useStore';

afterEach(cleanup);

it('does not rerender command consumers on model updates but preserves reactive consumers and live event reads', () => {
  let commands: StoreContextValue | undefined;
  let reactive: StoreContextValue | undefined;
  let commandRenders = 0;
  let reactiveRenders = 0;
  const Commands = memo(function Commands() {
    commands = useStoreActions();
    commandRenders++;
    return null;
  });
  const Reactive = memo(function Reactive() {
    reactive = useStore();
    reactiveRenders++;
    return null;
  });
  render(
    <StoreContextProvider>
      <Commands />
      <Reactive />
    </StoreContextProvider>
  );
  if (!commands || !reactive) {
    throw new Error('Missing provider');
  }
  const saved = commands;
  const nodes = Array.from({ length: 300 }, (_, i) => ({
    id: String(i),
    position: { x: i, y: 0 },
    data: {} as NodeData,
  }));
  act(() => {
    saved.setNodes(nodes);
  });
  const beforeCommands = commandRenders;
  const beforeReactive = reactiveRenders;
  for (let i = 0; i < 10; i++) {
    act(() => {
      saved.setNodes((previous) => previous.map((n, index) => (index === 0 ? { ...n, position: { x: i, y: 1 } } : n)));
    });
  }
  expect(commandRenders).toBe(beforeCommands);
  expect(reactiveRenders).toBe(beforeReactive + 10);
  expect(commands).toBe(saved);
  expect(saved.getNode('0')?.position).toEqual({ x: 9, y: 1 });
  expect(saved.getNodes()).toBe(reactive.getNodes());
  act(() => {
    saved.onNodesChange([{ id: '0', type: 'select', selected: true }]);
  });
  expect(saved.getNode('0')?.selected).toBe(true);
  act(() => {
    saved.setEdges([{ id: 'edge', source: '0', target: '1' }]);
  });
  act(() => {
    saved.onEdgesChange([{ id: 'edge', type: 'select', selected: true }]);
  });
  expect(saved.getEdge('edge')?.selected).toBe(true);
  expect(saved.getEdges()).toBe(reactive.getEdges());
  expect(saved.getNode('missing')).toBeUndefined();
  expect(saved.getEdge('missing')).toBeUndefined();
  expect(commandRenders).toBe(beforeCommands);
});

it('isolates command readers and updates between diagrams', () => {
  const stores: StoreContextValue[] = [];
  function Probe() {
    stores.push(useStoreActions());
    return null;
  }
  render(
    <>
      <StoreContextProvider>
        <Probe />
      </StoreContextProvider>
      <StoreContextProvider>
        <Probe />
      </StoreContextProvider>
    </>
  );
  act(() => {
    stores[0].setNodes([{ id: 'left', position: { x: 0, y: 0 }, data: {} as NodeData }]);
  });
  act(() => {
    stores[1].setNodes([{ id: 'right', position: { x: 0, y: 0 }, data: {} as NodeData }]);
  });
  expect(stores[0].getNodes().map((n) => n.id)).toEqual(['left']);
  expect(stores[1].getNodes().map((n) => n.id)).toEqual(['right']);
});
