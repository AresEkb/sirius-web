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
import { Edge, Node, useStoreApi } from '@xyflow/react';
import { useEffect } from 'react';
import { NodeData, EdgeData } from '../DiagramRenderer.types';

export const useDynamicEdgeSelectionArea = ({ baseWidth = 20, minWidth = 1 } = {}) => {
  const store = useStoreApi<Node<NodeData>, Edge<EdgeData>>();
  useEffect(() => {
    const update = (state: ReturnType<typeof store.getState>, previous?: ReturnType<typeof store.getState>) => {
      const { domNode, transform } = state;
      if (domNode && (domNode !== previous?.domNode || transform[2] !== previous.transform[2])) {
        domNode.style.setProperty('--edge-selection-width', `${Math.max(minWidth, baseWidth / transform[2])}px`);
      }
    };
    update(store.getState());
    const unsubscribe = store.subscribe(update);
    return () => {
      unsubscribe();
      store.getState().domNode?.style.removeProperty('--edge-selection-width');
    };
  }, [store, baseWidth, minWidth]);
};
