/*******************************************************************************
 * Copyright (c) 2026 Obeo.
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
import { SelectionEntry, useSelection } from '@eclipse-sirius/sirius-components-core';
import React, { useCallback, useRef } from 'react';
import { useStore } from '../../representation/useStore';
import { isNotUtilityNode } from '../node/NodeTypes';
import { UseSelectAllValue } from './useSelectAll.types';

/**
 * Selects every element of the diagram on Ctrl+A (Cmd+A on macOS), the way the shortcut works in a
 * list or in a text: what is taken is what the diagram holds, nodes and edges alike.
 *
 * The elements are marked and the semantic selection is published in the same step, so the other
 * views of the workbench show the same objects; a text field which has the focus - a label being
 * edited, a search box - keeps the shortcut for its own text.
 *
 * @author dnikiforov
 */
export const useSelectAll = (): UseSelectAllValue => {
  const { getNodes, getEdges, setNodes, setEdges } = useStore();
  const { setSelection } = useSelection();
  /*
   * The store's getters close over the state of the render they were taken from, so the handler -
   * which is created once, as a key handler given to React Flow has to be - reads them through a
   * ref that every render refreshes; taken from the first render they would answer with the nodes
   * and the edges the diagram had before it was loaded.
   */
  const storeRef = useRef({ getNodes, getEdges });
  storeRef.current = { getNodes, getEdges };

  const onSelectAll = useCallback((event: React.KeyboardEvent<Element>) => {
    const isTextField = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'a' || isTextField) {
      return;
    }
    event.preventDefault();

    // The anchors an edge is created and reconnected from are nodes of the diagram as well; they
    // depict nothing, so selecting everything means selecting everything the user can see.
    const visibleNodes = storeRef.current.getNodes().filter((node) => !node.hidden && isNotUtilityNode(node));
    const visibleEdges = storeRef.current.getEdges().filter((edge) => !edge.hidden);

    const selectedNodeIds = new Set(visibleNodes.map((node) => node.id));
    setNodes((previousNodes) =>
      previousNodes.map((node) => (selectedNodeIds.has(node.id) ? { ...node, selected: true } : node))
    );
    const selectedEdgeIds = new Set(visibleEdges.map((edge) => edge.id));
    setEdges((previousEdges) =>
      previousEdges.map((edge) => (selectedEdgeIds.has(edge.id) ? { ...edge, selected: true } : edge))
    );

    const targetObjectIds = new Set<string>();
    visibleNodes.forEach((node) => targetObjectIds.add(node.data.targetObjectId));
    visibleEdges.forEach((edge) => {
      if (edge.data) {
        targetObjectIds.add(edge.data.targetObjectId);
      }
    });
    const entries: SelectionEntry[] = [...targetObjectIds].map((id) => ({ id }));
    if (entries.length > 0) {
      setSelection({ entries });
    }
  }, []);

  return { onSelectAll };
};
