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
import { Edge, Node, useStoreApi } from '@xyflow/react';
import { useContext, useEffect } from 'react';
import { DiagramContext } from '../../contexts/DiagramContext';
import { DiagramContextValue } from '../../contexts/DiagramContext.types';
import { GQLDiagramRefreshedEventPayload } from '../../graphql/subscription/diagramEventSubscription.types';
import { useStore } from '../../representation/useStore';
import { EdgeData, NodeData } from '../DiagramRenderer.types';
import { publishedByADiagram } from './diagramOriginatedSelection';

export const usePostToolSelection = (diagramRefreshedEventPayload: GQLDiagramRefreshedEventPayload) => {
  const { toolSelections, consumePostToolSelection } = useContext<DiagramContextValue>(DiagramContext);
  const { setNodes, getNodes, getEdges, setEdges } = useStore();
  const store = useStoreApi<Node<NodeData>, Edge<EdgeData>>();
  const { setSelection } = useSelection();

  useEffect(() => {
    const { id } = diagramRefreshedEventPayload;

    if (toolSelections.get(id) && diagramRefreshedEventPayload.cause === 'layout') {
      const selectionFromTool = consumePostToolSelection(id);

      if (selectionFromTool) {
        // If we "auto-select" a node because it matches what a previous tool invocation
        // asked, we only select the first matching diagram element we find and ignore the rest,
        // even if the new diagram shows the requested semantic element through multiple
        // nodes.
        const targetObjectIdAlreadySelected: Set<string> = new Set();
        const nodesToSelect: string[] = [];
        const edgesToSelect: string[] = [];
        let lastNodeSelectedId: string = '';

        getEdges()
          .filter((edge) => !edge.hidden)
          .forEach((edge) => {
            if (edge.data && edge.data.targetObjectId) {
              if (
                selectionFromTool.entries.some((entry) => entry.id === edge?.data?.targetObjectId) &&
                !targetObjectIdAlreadySelected.has(edge.data.targetObjectId)
              ) {
                targetObjectIdAlreadySelected.add(edge.data.targetObjectId);
                edgesToSelect.push(edge.id);
              }
            }
          });

        getNodes()
          .filter((node) => !node.hidden)
          .forEach((node) => {
            if (
              selectionFromTool.entries.some((entry) => entry.id === node?.data?.targetObjectId) &&
              !targetObjectIdAlreadySelected.has(node.data.targetObjectId)
            ) {
              targetObjectIdAlreadySelected.add(node.data.targetObjectId);
              nodesToSelect.push(node.id);
            }
          });

        setNodes((previousNodes) =>
          previousNodes.map((previousNode) => {
            if (nodesToSelect.includes(previousNode.id)) {
              if (!lastNodeSelectedId) {
                lastNodeSelectedId = previousNode.id;
              }
              return {
                ...previousNode,
                selected: true,
                data: {
                  ...previousNode.data,
                  isLastNodeSelected: previousNode.id === lastNodeSelectedId,
                },
              };
            } else if (previousNode.selected) {
              return {
                ...previousNode,
                selected: false,
                data: {
                  ...previousNode.data,
                  isLastNodeSelected: false,
                },
              };
            }
            return previousNode;
          })
        );
        store.getState().addSelectedNodes(nodesToSelect);
        setEdges((previousEdges) =>
          previousEdges.map((previousEdge) => {
            if (edgesToSelect.includes(previousEdge.id)) {
              return {
                ...previousEdge,
                selected: true,
              };
            } else if (previousEdge.selected) {
              return {
                ...previousEdge,
                selected: false,
              };
            }
            return previousEdge;
          })
        );

        // What the tool asked to be selected is published to the rest of the editor, the
        // way a selection made by hand is. The flags written above only paint it on the
        // diagram: XYFlow is told of the nodes, and tells the editor through the
        // selection change it raises, but nothing tells it of an edge - so an edge a tool
        // created came out drawn as selected while the properties of whatever was
        // selected before it went on being shown, and pressing the edge changed nothing,
        // it being selected already. It is noted as published by a diagram, since the
        // modeller is looking at what the tool has just made and the view is not to be
        // taken to it.
        const entries = selectionEntriesOf(getNodes(), getEdges(), nodesToSelect, edgesToSelect);
        if (entries.length > 0) {
          publishedByADiagram({ entries });
          setSelection({ entries });
        }

        // Focus the diagram so the user can direct edit the created element by
        // typing - but never steal focus from an editable field (a form / inline
        // rename input), or the user's keystrokes would be dropped.
        const active = document.activeElement;
        const isEditingField =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          (active instanceof HTMLElement && active.isContentEditable);
        if (!isEditingField) {
          store.getState().domNode?.focus();
        }
      }
    }
  }, [diagramRefreshedEventPayload, toolSelections, getNodes, getEdges]);
};

/**
 * The objects the selected nodes and edges stand for, in the order the diagram holds them, so that
 * what a tool selected is published as the elements it created rather than as the shapes drawn for
 * them.
 */
const selectionEntriesOf = (
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[],
  nodesToSelect: string[],
  edgesToSelect: string[]
): SelectionEntry[] => {
  const entries: SelectionEntry[] = [];
  nodes
    .filter((node) => nodesToSelect.includes(node.id))
    .forEach((node) => entries.push({ id: node.data.targetObjectId }));
  edges
    .filter((edge) => edgesToSelect.includes(edge.id))
    .forEach((edge) => {
      if (edge.data) {
        entries.push({ id: edge.data.targetObjectId });
      }
    });
  return entries;
};
