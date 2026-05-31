/*******************************************************************************
 * Copyright (c) 2023, 2026 Obeo.
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

import { useData, useSelection } from '@eclipse-sirius/sirius-components-core';
import { usePalette } from '@eclipse-sirius/sirius-components-palette';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  ReactFlowProps,
  SelectionMode,
  applyNodeChanges,
  useReactFlow,
  useStore as useReactFlowStore,
  useStoreApi,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { MouseEvent as ReactMouseEvent, memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { DiagramContext } from '../contexts/DiagramContext';
import { DiagramContextValue } from '../contexts/DiagramContext.types';
import { NodeTypeContext } from '../contexts/NodeContext';
import { NodeTypeContextValue } from '../contexts/NodeContext.types';
import { useDiagramDescription } from '../contexts/useDiagramDescription';
import { convertDiagram } from '../converter/convertDiagram';
import { useStore } from '../representation/useStore';
import { Diagram, DiagramRendererProps, EdgeData, NodeData, ReactFlowPropsCustomizer } from './DiagramRenderer.types';
import { diagramRendererReactFlowPropsCustomizerExtensionPoint } from './DiagramRendererExtensionPoints';
import { useBorderChange } from './border/useBorderChange';
import { ConnectorContextualMenu } from './connector/ConnectorContextualMenu';
import { useConnector } from './connector/useConnector';
import { useResetXYFlowConnection } from './connector/useResetXYFlowConnection';
import { DebugPanel } from './debug/DebugPanel';
import { useDiagramDirectEdit } from './direct-edit/useDiagramDirectEdit';
import { useNodesDraggable } from './drag/useNodesDraggable';
import { useDrop } from './drop/useDrop';
import { useDropDiagramStyle } from './dropNode/useDropDiagramStyle';
import { useDropNodes } from './dropNode/useDropNodes';
import { ConnectionLine } from './edge/ConnectionLine';
import { edgeTypes } from './edge/EdgeTypes';
import { useEdgeCrossingFades } from './edge/crossings/useEdgeCrossingFades';
import { useDynamicEdgeSelectionArea } from './edge/useDynamicEdgeSelectionArea';
import { useSelectEdgeChange } from './edgeChange/useSelectEdgeChange';
import { useInitialFitToScreen } from './fit-to-screen/useInitialFitToScreen';
import { useHandleChange } from './handles/useHandleChange';
import { useHandleResizedChange } from './handles/useHandleResizedChange';
import { HelperLines } from './helper-lines/HelperLines';
import { HelperLinesContext } from './helper-lines/HelperLinesContext';
import { HelperLinesContextValue } from './helper-lines/HelperLinesContext.types';
import { useHelperLines } from './helper-lines/useHelperLines';
import { useEdgeHover } from './hover/useEdgeHover';
import { useNodeHover } from './hover/useNodeHover';
import { useDiagramKeyBinding } from './key-binding/useDiagramKeyBinding';
import { useFilterReadOnlyChanges } from './layout-events/useFilterReadOnlyChanges';
import { useLayoutOnBoundsChange } from './layout-events/useLayoutOnBoundsChange';
import { RawDiagram } from './layout/layout.types';
import { useLayout } from './layout/useLayout';
import { useSynchronizeLayoutData } from './layout/useSynchronizeLayoutData';
import { MiniMapContext } from './mini-map/MiniMapContext';
import { MiniMapContextValue } from './mini-map/MiniMapContext.types';
import { useMoveChange } from './move/useMoveChange';
import { useNodeType } from './node/useNodeType';
import { DiagramPalette } from './palette/DiagramPalette';
import { useReconnectEdge } from './reconnect-edge/useReconnectEdge';
import { useMultiSelectResizeChange } from './resize/useMultiSelectResizeChange';
import { useResizeChange } from './resize/useResizeChange';
import { useApplySelection } from './selection/useApplySelection';
import { useDiagramSelection } from './selection/useDiagramSelection';
import { useLastElementSelectedChange } from './selection/useLastElementSelectedChange';
import { useOnRightClickElement } from './selection/useOnRightClickElement';
import { usePostToolSelection } from './selection/usePostToolSelection';
import { SnapToGridContext } from './snap-to-grid/SnapToGridContext';
import { SnapToGridContextValue } from './snap-to-grid/SnapToGridContext.types';
import { DiagramToolbar } from './toolbar/DiagramToolbar';
import { wasPublishedByADiagram } from './selection/diagramOriginatedSelection';

const GRID_STEP: number = 10;

export const DiagramRenderer = memo(({ diagramRefreshedEventPayload }: DiagramRendererProps) => {
  const { readOnly } = useContext<DiagramContextValue>(DiagramContext);
  const { diagramDescription } = useDiagramDescription();
  const { getEdges, onEdgesChange, getNodes, setEdges, setNodes } = useStore();
  const nodes = getNodes();
  const edges = getEdges();
  useEdgeCrossingFades();
  useDynamicEdgeSelectionArea();

  const { onDirectEdit } = useDiagramDirectEdit();
  const { onKeyBinding } = useDiagramKeyBinding(diagramRefreshedEventPayload.diagram.targetObjectId);

  const ref = useRef<HTMLDivElement | null>(null);
  const { layout } = useLayout();
  const { synchronizeLayoutData } = useSynchronizeLayoutData();
  const { onConnectEnd } = useConnector();
  const { onReconnectEdgeStart, reconnectEdge, onReconnectEdgeEnd } = useReconnectEdge();
  const { onDrop, onDragOver } = useDrop();
  const { onNodesDragStart, onNodesDrag, onNodesDragStop } = useDropNodes();
  const { background, setBackground, largeGridColor, smallGridColor } = useDropDiagramStyle();
  const { nodeTypes } = useNodeType();
  const { selection, setSelection } = useSelection();
  const { applySelection } = useApplySelection();
  // Starts null (not the current selection) so a selection set BEFORE this
  // diagram mounted - e.g. a properties-form navigation that opens another view
  // and selects the revealed element before its renderer exists - still gets
  // reflected onto the freshly loaded nodes. Initialising it to the current
  // selection made the edge-trigger below short-circuit that case forever.
  const previousSelectionRef = useRef<typeof selection | null>(null);

  const { nodeConverters } = useContext<NodeTypeContextValue>(NodeTypeContext);
  const { isMiniMapVisible } = useContext<MiniMapContextValue>(MiniMapContext);
  const { isHelperLineEnabled } = useContext<HelperLinesContextValue>(HelperLinesContext);
  const { isSnapToGridEnabled } = useContext<SnapToGridContextValue>(SnapToGridContext);

  useInitialFitToScreen(diagramRefreshedEventPayload.diagram.nodes.length === 0);
  useResetXYFlowConnection();
  usePostToolSelection(diagramRefreshedEventPayload);
  const { getNode } = useReactFlow<Node<NodeData>, Edge<EdgeData>>();
  const store = useStoreApi<Node<NodeData>, Edge<EdgeData>>();

  // The number of loaded nodes and edges; used to re-evaluate the selection
  // reflection once the diagram has actually rendered its content (the refresh
  // payload arrives before react flow holds the nodes).
  const loadedElementCount = useReactFlowStore((state) => state.nodeLookup.size + state.edgeLookup.size);

  // Reflect a workbench selection CHANGE onto this diagram once (navigation,
  // explorer or properties-form reveal). This is edge triggered: it applies a
  // given workbench selection a single time, when its targets are present on the
  // diagram, and then never re-imposes it. A mere diagram refresh therefore does
  // not fight a selection the diagram makes itself (e.g. an element just created
  // and selected by its creation tool); such selections survive refreshes
  // through the diagram's own preserved selection in the converter. The retry on
  // loadedElementCount is only so a selection requested before the diagram had
  // loaded its elements (opening a diagram to reveal something) still applies
  // once those elements arrive.
  useEffect(() => {
    if (previousSelectionRef.current === selection) {
      return;
    }
    const requestedTargetObjectIds = selection.entries
      .map((entry) => entry.id)
      .filter(
        (id) =>
          getNodes().some((node) => node.data.targetObjectId === id) ||
          getEdges().some((edge) => edge.data?.targetObjectId === id)
      );
    if (requestedTargetObjectIds.length === 0) {
      // The targets are not on the diagram yet; keep this selection pending so a
      // later loadedElementCount change retries it once they have loaded.
      return;
    }
    previousSelectionRef.current = selection;
    const selectedTargetObjectIds = new Set<string>();
    getNodes().forEach((node) => {
      if (node.selected && node.data.targetObjectId) {
        selectedTargetObjectIds.add(node.data.targetObjectId);
      }
    });
    getEdges().forEach((edge) => {
      if (edge.selected && edge.data?.targetObjectId) {
        selectedTargetObjectIds.add(edge.data.targetObjectId);
      }
    });
    const alreadyReflected =
      requestedTargetObjectIds.length === selectedTargetObjectIds.size &&
      requestedTargetObjectIds.every((id) => selectedTargetObjectIds.has(id));
    if (!alreadyReflected) {
      // A selection the diagram itself has just published is applied without being revealed: the
      // modeller is looking at what they have just pressed, and bringing it into the middle of the
      // view would take the canvas away from a gesture they may still be making. Revealing is for a
      // selection made away from the diagram - in the model tree, or through a link - which the
      // modeller has no way of seeing.
      applySelection(selection, !wasPublishedByADiagram(selection));
    }
  }, [selection, loadedElementCount]);

  useEffect(() => {
    const { diagram, cause, referencePosition } = diagramRefreshedEventPayload;

    const convertedDiagram: Diagram = convertDiagram(
      diagram,
      referencePosition,
      nodeConverters,
      diagramDescription,
      store.getState()
    );

    const shouldForceRefreshInternalNodeDimension = convertedDiagram.nodes.some((node) => {
      const prevNode = getNode(node.id);
      return prevNode?.hidden !== node.hidden;
    });

    convertedDiagram.nodes = convertedDiagram.nodes.map((convertedNode) => {
      const currentNode = getNode(convertedNode.id);
      if (
        currentNode &&
        (convertedNode.position.x !== currentNode.position.x ||
          convertedNode.position.y !== currentNode.position.y ||
          convertedNode.width !== currentNode.width ||
          convertedNode.height !== currentNode.height ||
          convertedNode.hidden !== currentNode.hidden ||
          (currentNode && JSON.stringify(convertedNode.data) !== JSON.stringify(currentNode.data)))
      ) {
        if (shouldForceRefreshInternalNodeDimension) {
          return { ...convertedNode, measured: undefined };
        } else {
          return convertedNode;
        }
      } else if (currentNode) {
        return currentNode;
      } else {
        return convertedNode;
      }
    });
    const { nodeLookup } = store.getState();
    // A navigation reveal selects its target through the workbench selection.
    // Nodes keep that selection on their own (node ids are stable across
    // refreshes, so the diagram preserves it), but edge ids are NOT stable, so a
    // revealed edge would be dropped on the first refresh. Honour the workbench
    // selection for an EDGE so an edge reveal survives - but ONLY when the
    // selected element is not also drawn as a node on the diagram. Otherwise a
    // stale workbench selection left on an element that is shown as a node and
    // was just deselected (e.g. the base relationship class after creating an
    // element next to it) would re-select that element's edge occurrence, and
    // the lingering edge selection makes React Flow drop the freshly created
    // node's selection.
    const isEdgeRevealedBySelection = (targetObjectId: string | undefined): boolean =>
      !!targetObjectId &&
      selection.entries.some((entry) => entry.id === targetObjectId) &&
      !getNodes().some((node) => node.data.targetObjectId === targetObjectId);
    if (cause === 'layout') {
      // Preserve edge selection by target object id, not by edge id: edge ids
      // are not stable across refreshes, so keying on the id drops the selection
      // of any selected edge (including one a navigation just revealed) on the
      // first refresh. A given semantic element is selected on only the first
      // edge depicting it.
      const previouslySelectedEdgeTargetObjectIds = new Set<string>();
      getEdges().forEach((edge) => {
        if (edge.selected && edge.data?.targetObjectId) {
          previouslySelectedEdgeTargetObjectIds.add(edge.data.targetObjectId);
        }
      });
      const selectedEdgeTargetObjectIds = new Set<string>();
      const shouldSelectEdge = (edge: Edge<EdgeData>) => {
        if (edge.hidden || !edge.data?.targetObjectId) {
          return false;
        }
        const targetObjectId = edge.data.targetObjectId;
        if (
          !selectedEdgeTargetObjectIds.has(targetObjectId) &&
          (previouslySelectedEdgeTargetObjectIds.has(targetObjectId) || isEdgeRevealedBySelection(targetObjectId))
        ) {
          selectedEdgeTargetObjectIds.add(targetObjectId);
          return true;
        }
        return false;
      };
      setEdges(
        convertedDiagram.edges.map((convertedEdge) => {
          convertedEdge.selected = shouldSelectEdge(convertedEdge);
          return convertedEdge;
        })
      );

      setNodes((previousNodes) => {
        return convertedDiagram.nodes.map((convertedNode) => {
          const previousNode = previousNodes.find((n) => n.id === convertedNode.id);
          if (previousNode) {
            convertedNode.selected = previousNode.selected;
            convertedNode.data.isDraggedNode = previousNode.data.isDraggedNode;
            convertedNode.data.isDragNodeSource = previousNode.data.isDragNodeSource;
            convertedNode.data.isDropNodeTarget = previousNode.data.isDropNodeTarget;
            convertedNode.data.isDropNodeCandidate = previousNode.data.isDropNodeCandidate;
          }
          return convertedNode;
        });
      });
    } else if (cause === 'refresh') {
      const previousDiagram: RawDiagram = {
        nodes,
        edges,
      };

      // If we're refreshing the diagram because of an undo/redo operation we need to update the previous diagram with nodeLayoutData before performing the layout
      previousDiagram.nodes = previousDiagram.nodes.map((previousNode) => {
        const nodeLayoutData = diagramRefreshedEventPayload.diagram.layoutData.nodeLayoutData.find(
          (layoutData) => layoutData.id === previousNode.id
        );
        if (nodeLayoutData) {
          previousNode.position.x = nodeLayoutData.position.x;
          previousNode.position.y = nodeLayoutData.position.y;
          previousNode.width = nodeLayoutData.size.width;
          previousNode.height = nodeLayoutData.size.height;
        }
        return previousNode;
      });

      layout(
        previousDiagram,
        convertedDiagram,
        diagramRefreshedEventPayload.referencePosition,
        diagramDescription.arrangeLayoutDirection,
        (laidOutDiagram) => {
          laidOutDiagram.nodes = laidOutDiagram.nodes.map((node) => {
            if (nodeLookup.get(node.id)) {
              return {
                ...node,
                selected: !!nodeLookup.get(node.id)?.selected,
              };
            }
            return node;
          });

          // Preserve edge selection by target object id, not by edge id: edge
          // ids are not stable across refreshes, so keying on the id drops the
          // selection of any selected edge (including one a navigation just
          // revealed) on the first refresh.
          const selectedEdgeTargetObjectIds = new Set<string>();
          getEdges().forEach((edge) => {
            if (edge.selected && edge.data?.targetObjectId) {
              selectedEdgeTargetObjectIds.add(edge.data.targetObjectId);
            }
          });
          laidOutDiagram.edges = laidOutDiagram.edges.map((edge) =>
            edge.data?.targetObjectId &&
            (selectedEdgeTargetObjectIds.has(edge.data.targetObjectId) ||
              isEdgeRevealedBySelection(edge.data.targetObjectId))
              ? { ...edge, selected: true }
              : edge
          );

          setEdges(laidOutDiagram.edges);
          setNodes(laidOutDiagram.nodes);

          if (!readOnly) {
            synchronizeLayoutData(diagramRefreshedEventPayload.id, 'refresh', laidOutDiagram, 'UNCHANGED');
          }
        }
      );
    }
    if (convertedDiagram.style.background) {
      setBackground(String(convertedDiagram.style.background));
    }
  }, [diagramRefreshedEventPayload, diagramDescription]);

  const { transformBorderNodeChanges } = useBorderChange();
  const { transformUndraggableListNodeChanges, applyMoveChange } = useMoveChange();
  const { applyLastElementSelected } = useLastElementSelectedChange();
  const { transformResizeListNodeChanges, applyResizeByUserState } = useResizeChange();
  const { transformMultiSelectResizeNodeChanges } = useMultiSelectResizeChange();
  const { applyHandleChange } = useHandleChange();
  const { applyResizeHandleChange } = useHandleResizedChange();
  const { layoutOnBoundsChange } = useLayoutOnBoundsChange();
  const { filterReadOnlyChanges } = useFilterReadOnlyChanges();
  const { horizontalHelperLine, verticalHelperLine, applyHelperLines, resetHelperLines } = useHelperLines();
  const { onSelectionChange, selectedElementsIds } = useDiagramSelection();

  const handleNodesChange: OnNodesChange<Node<NodeData>> = useCallback(
    (changes: NodeChange<Node<NodeData>>[]) => {
      const noReadOnlyChanges = filterReadOnlyChanges(changes);
      const isResetChange = changes.find((change) => change.type === 'replace');
      const isSelectChange = changes.find(
        (change) => change.type === 'select' && !change.id.startsWith('edgeAnchorNodeCreationHandles')
      );

      if (
        isResetChange ||
        isSelectChange ||
        (noReadOnlyChanges.length === 1 &&
          noReadOnlyChanges[0]?.type === 'dimensions' &&
          typeof noReadOnlyChanges[0].resizing !== 'boolean')
      ) {
        setNodes((previousNodes) => {
          const newNodes = applyLastElementSelected(changes, previousNodes, selectedElementsIds);
          return applyNodeChanges<Node<NodeData>>(noReadOnlyChanges, newNodes);
        });
      } else {
        resetHelperLines(changes);
        let transformedNodeChanges: NodeChange<Node<NodeData>>[] = transformBorderNodeChanges(noReadOnlyChanges);
        transformedNodeChanges = transformUndraggableListNodeChanges(transformedNodeChanges);
        transformedNodeChanges = applyHelperLines(transformedNodeChanges);
        transformedNodeChanges = transformMultiSelectResizeNodeChanges(transformedNodeChanges);
        transformedNodeChanges = transformResizeListNodeChanges(transformedNodeChanges);

        let newNodes = applyNodeChanges(transformedNodeChanges, nodes);
        newNodes = applyMoveChange(transformedNodeChanges, newNodes);
        newNodes = applyHandleChange(transformedNodeChanges, newNodes);
        newNodes = applyResizeHandleChange(transformedNodeChanges, newNodes);
        newNodes = applyResizeByUserState(transformedNodeChanges, newNodes);

        layoutOnBoundsChange(transformedNodeChanges, newNodes);

        setNodes((previousNodes) => {
          return newNodes.map((newNode) => {
            const previousNode = previousNodes.find((n) => n.id === newNode.id);
            if (previousNode) {
              newNode.data.isDraggedNode = previousNode.data.isDraggedNode;
              newNode.data.isDragNodeSource = previousNode.data.isDragNodeSource;
              newNode.data.isDropNodeTarget = previousNode.data.isDropNodeTarget;
              newNode.data.isDropNodeCandidate = previousNode.data.isDropNodeCandidate;
            }
            return newNode;
          });
        });
      }
    },
    [layoutOnBoundsChange, getNodes, getEdges, selectedElementsIds]
  );

  const { onEdgeSelectedChange } = useSelectEdgeChange();
  const handleEdgesChange: OnEdgesChange<Edge<EdgeData>> = useCallback(
    (changes: EdgeChange<Edge<EdgeData>>[]) => {
      if (!readOnly) {
        onEdgeSelectedChange(changes);
      }
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent<Element>) => {
    onDirectEdit(event);
    onKeyBinding(event);
  }, []);

  const { onNodeMouseEnter, onNodeMouseLeave } = useNodeHover();
  const { onEdgeMouseEnter, onEdgeMouseLeave } = useEdgeHover();

  const handleNodeDrag = useCallback(
    (event: ReactMouseEvent, node: Node<NodeData>, nodes: Node<NodeData>[]) => {
      onNodesDrag(event, node, nodes);
    },
    [onNodesDrag]
  );

  const { nodesDraggable } = useNodesDraggable();

  const { isOpened } = usePalette();

  const { onEdgeContextMenu, onNodeContextMenu, onPaneContextMenu, onSelectionContextMenu } =
    useOnRightClickElement(selectedElementsIds);

  let reactFlowProps: ReactFlowProps<Node<NodeData>, Edge<EdgeData>> = {
    nodes: nodes,
    nodeTypes: nodeTypes,
    onNodesChange: handleNodesChange,
    edges: edges,
    edgeTypes: edgeTypes,
    edgesReconnectable: !readOnly,
    onKeyDown: onKeyDown,
    onConnectEnd: onConnectEnd,
    connectionLineComponent: ConnectionLine,
    onReconnectStart: onReconnectEdgeStart,
    onReconnect: reconnectEdge,
    onReconnectEnd: onReconnectEdgeEnd,
    connectionRadius: 0,
    onEdgesChange: handleEdgesChange,
    onPaneClick: () => {
      // Select the diagram itself when the user left-clicks on the background
      setSelection({ entries: [{ id: diagramRefreshedEventPayload.diagram.id }] });
    },
    onPaneContextMenu: onPaneContextMenu,
    onEdgeContextMenu: onEdgeContextMenu,
    onNodeContextMenu: onNodeContextMenu,
    onSelectionContextMenu: onSelectionContextMenu,
    nodeDragThreshold: 1,
    onDrop: onDrop,
    onDragOver: onDragOver,
    onNodeDrag: handleNodeDrag,
    onNodeDragStart: onNodesDragStart,
    onNodeDragStop: onNodesDragStop,
    onNodeMouseEnter: onNodeMouseEnter,
    onNodeMouseLeave: onNodeMouseLeave,
    onEdgeMouseEnter: onEdgeMouseEnter,
    onEdgeMouseLeave: onEdgeMouseLeave,
    onSelectionChange: onSelectionChange,
    selectionMode: SelectionMode.Partial,
    maxZoom: 40,
    minZoom: 0.1,
    snapToGrid: isSnapToGridEnabled,
    snapGrid: useMemo(() => [GRID_STEP, GRID_STEP], []),
    connectionMode: ConnectionMode.Loose,
    zoomOnDoubleClick: false,
    connectionLineType: ConnectionLineType.SmoothStep,
    nodesDraggable: nodesDraggable && !readOnly,
    tabIndex: -1,
    children: (
      <>
        {isSnapToGridEnabled ? (
          <>
            <Background
              id="small-grid"
              style={{ background }}
              variant={BackgroundVariant.Lines}
              gap={GRID_STEP}
              color={smallGridColor}
            />
            <Background
              id="large-grid"
              variant={BackgroundVariant.Lines}
              gap={10 * GRID_STEP}
              offset={1}
              color={largeGridColor}
            />
          </>
        ) : (
          <Background style={{ background }} color="transparent" />
        )}
        {diagramDescription.toolbar ? <DiagramToolbar diagramToolbar={diagramDescription.toolbar} /> : null}
        {isOpened ? (
          <DiagramPalette
            diagramId={diagramRefreshedEventPayload.diagram.id}
            diagramTargetObjectId={diagramRefreshedEventPayload.diagram.targetObjectId}
          />
        ) : null}
        {diagramDescription.debug ? <DebugPanel reactFlowWrapper={ref} /> : null}
        <ConnectorContextualMenu />
        {isHelperLineEnabled ? <HelperLines horizontal={horizontalHelperLine} vertical={verticalHelperLine} /> : null}
        {isMiniMapVisible && (
          <MiniMap pannable zoomable zoomStep={2} style={{ width: 150, height: 100, opacity: 0.75 }} />
        )}
      </>
    ),
  };

  const { data: reactFlowPropsCustomizers } = useData<Array<ReactFlowPropsCustomizer>>(
    diagramRendererReactFlowPropsCustomizerExtensionPoint
  );
  reactFlowPropsCustomizers.forEach((customizer) => {
    reactFlowProps = customizer(reactFlowProps);
  });

  return <ReactFlow {...reactFlowProps} ref={ref} />;
});
