/*******************************************************************************
 * Copyright (c) 2023, 2025 Obeo.
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
import { Edge, Node, OnSelectionChangeFunc } from '@xyflow/react';
import { useCallback, useRef, useState } from 'react';
import { useStore } from '../../representation/useStore';
import { EdgeData, NodeData } from '../DiagramRenderer.types';
import { isNotUtilityNode } from '../node/NodeTypes';
import { UseDiagramSelectionValue } from './useDiagramSelection.types';
import { useRubberBandSelection } from './useRubberBandSelection';

/**
 * Compute the list of new selected diagram elements while keeping the order of any
 * elements which was already selected before. This ensure we keep the selection order stable.
 */
const mergeNewSelectedElementIds = (previousSelectedElementsIds: string[], newSelectedElementId: string[]) => {
  if (newSelectedElementId.length === 0) {
    return [];
  } else {
    return previousSelectedElementsIds
      .filter((id) => newSelectedElementId.includes(id))
      .concat(newSelectedElementId.filter((id) => !previousSelectedElementsIds.includes(id)));
  }
};

/**
 * Configures React Flow so that when the selection changes on the diagram, the diagram-local & global selections are updated.
 */
export const useDiagramSelection = (diagramTargetObjectId: string): UseDiagramSelectionValue => {
  const { setSelection } = useSelection();
  const { getEdges, setEdges } = useStore();
  /*
   * The store's getters close over the state of the render they were taken from, and the callback
   * below is created once - XYFlow calls it again whenever one of its dependencies changes, which
   * would defeat its purpose - so they are read through a ref that every render refreshes.
   */
  const getEdgesRef = useRef(getEdges);
  getEdgesRef.current = getEdges;
  const [selectedElementsIds, setSelectedElementsIds] = useState<string[]>([]);
  const { onSelectionStart, onSelectionEnd, isBandActive } = useRubberBandSelection();
  // What the diagram holds selected, read at the end of a rubber band: a band which has covered
  // nothing leaves it empty, and that is a selection of its own rather than a reason to keep the
  // one the band replaced.
  const emptyBandRef = useRef<boolean>(false);

  /**
   * The callback invoked by XYFlow when the graphical selection of nodes & edges on a diagram changes.
   * We receive in `nodes` and `edges` the complete list of elements selected after the change.
   */
  const onSelectionChange: OnSelectionChangeFunc<Node<NodeData>, Edge<EdgeData>> = useCallback(({ nodes, edges }) => {
    const newSelectedElementsIds: string[] = [];
    let entries: SelectionEntry[] = [];

    /*
     * While a rubber band is being dragged, XYFlow selects every edge connected to a node the band
     * covers, even when the other end of that edge is outside it. An edge belongs to the region the
     * user is taking only when both of its ends do, so the rule is restated here over all the edges
     * of the diagram rather than over the ones XYFlow reports: it remembers the set it selected
     * last and stays silent while that set does not change, so an edge this rule has unselected
     * would never be offered again when the band grows to cover its other end.
     */
    /*
     * The anchors an edge is created and reconnected from are nodes of the diagram too, and a band
     * drawn over an edge covers them. They depict no object, so they take no part in the selection.
     */
    const takenNodes = nodes.filter(isNotUtilityNode);
    const selectedNodeIds = new Set(takenNodes.map((node) => node.id));
    const isTakenByBand = (edge: Edge<EdgeData>) =>
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target);
    const takenEdges = isBandActive() ? getEdgesRef.current().filter(isTakenByBand) : edges;
    if (isBandActive() && getEdgesRef.current().some((edge) => !!edge.selected !== isTakenByBand(edge))) {
      setEdges((previousEdges) =>
        previousEdges.map((edge) =>
          !!edge.selected === isTakenByBand(edge) ? edge : { ...edge, selected: isTakenByBand(edge) }
        )
      );
    }

    takenNodes.forEach((node) => {
      entries.push({ id: node.data.targetObjectId });
      newSelectedElementsIds.push(node.id);
    });
    takenEdges.forEach((edge) => {
      if (edge.data) {
        entries.push({ id: edge.data.targetObjectId });
      }
      newSelectedElementsIds.push(edge.id);
    });

    emptyBandRef.current = newSelectedElementsIds.length === 0;

    let selectedElementsInOrder: string[] = [];
    setSelectedElementsIds((previousSelectedElementsIds) => {
      selectedElementsInOrder = mergeNewSelectedElementIds(previousSelectedElementsIds, newSelectedElementsIds);
      return selectedElementsInOrder;
    });

    // Publish semantic selection globally (if any)
    if (entries.length > 0) {
      setSelection({ entries });
    }
  }, []); // The dependency array must stay empty, otherwise XYFlow will call this function if one dependency changes.

  const handleSelectionStart = useCallback(() => {
    emptyBandRef.current = true;
    onSelectionStart();
  }, [onSelectionStart]);

  /**
   * A band which has covered no element selects the object the diagram represents, the way a click
   * on the background does: the user has emptied the selection of elements deliberately, and the
   * editor has to keep pointing at something rather than at what the band replaced.
   */
  const handleSelectionEnd = useCallback(() => {
    onSelectionEnd();
    if (emptyBandRef.current) {
      setSelection({ entries: [{ id: diagramTargetObjectId }] });
    }
  }, [diagramTargetObjectId, onSelectionEnd, setSelection]);

  return {
    onSelectionChange,
    onSelectionStart: handleSelectionStart,
    onSelectionEnd: handleSelectionEnd,
    selectedElementsIds,
  };
};
