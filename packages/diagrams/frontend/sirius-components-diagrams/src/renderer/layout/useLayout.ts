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

import { ServerContext, ServerContextValue } from '@eclipse-sirius/sirius-components-core';
import { Edge, Node, useReactFlow } from '@xyflow/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { NodeTypeContext } from '../../contexts/NodeContext';
import { NodeTypeContextValue } from '../../contexts/NodeContext.types';
import { useDiagramDescription } from '../../contexts/useDiagramDescription';
import { GQLReferencePosition } from '../../graphql/subscription/diagramEventSubscription.types';
import { GQLArrangeLayoutDirection } from '../../representation/DiagramRepresentation.types';
import { EdgeData, NodeData } from '../DiagramRenderer.types';
import { useLayoutConfigurations } from './arrange-all/useLayoutConfigurations';
import { useElkLayout } from './elk/useElkLayout';
import { cleanLayoutArea, layout, prepareLayoutArea, prepareLayoutLabels, prepareListNodeLayout } from './layout';
import { RawDiagram } from './layout.types';
import { LayoutRequest, UseLayoutState, UseLayoutValue } from './useLayout.types';

const initialState: UseLayoutState = {
  currentStep: 'INITIAL_STEP',
  hiddenContainer: null,
  previousDiagram: null,
  diagramToLayout: null,
  laidoutDiagram: null,
  referencePosition: null,
  layoutDirection: 'UNDEFINED',
  root: null,
  onLaidoutDiagram: () => {},
};

const isHandleReferencePosition = (causedBy: string) =>
  causedBy === 'InvokeSingleClickOnTwoDiagramElementsToolInput' || causedBy === 'ReconnectEdgeInput';

export const useLayout = (): UseLayoutValue => {
  const { httpOrigin } = useContext<ServerContextValue>(ServerContext);
  const { nodeLayoutHandlers } = useContext<NodeTypeContextValue>(NodeTypeContext);
  const [state, setState] = useState<UseLayoutState>(initialState);
  const { elkLayout } = useElkLayout();
  const { layoutConfigurations } = useLayoutConfigurations();
  const { diagramDescription } = useDiagramDescription();

  const reactFlowInstance = useReactFlow<Node<NodeData>, Edge<EdgeData>>();

  // A layout asked for while one is running waits here instead of being turned away. Laying a
  // diagram out takes several renders and a run of the layout engine, so a gesture that ends in
  // two changes - the shapes it moved coming to rest, then the one it sized coming to rest - asks
  // twice, and the second ask arrives while the first is still under way whenever the browser is
  // busy. Turning it away left the diagram short of what the gesture did, and that is what was
  // then stored. Only the last ask is kept: a later one says everything an earlier one did.
  const waitingRequest = useRef<LayoutRequest | null>(null);

  const layoutAreaPrepared = () => {
    const currentStep = 'LAYOUT';
    setState((prevState) => ({ ...prevState, currentStep }));
  };

  const layoutDiagram = (
    previousLaidoutDiagram: RawDiagram | null,
    diagramToLayout: RawDiagram,
    referencePosition: GQLReferencePosition | null,
    layoutDirection: GQLArrangeLayoutDirection,
    callback: (laidoutDiagram: RawDiagram) => void
  ) => {
    let processedReferencePosition: GQLReferencePosition | null = referencePosition;
    if (processedReferencePosition && !isHandleReferencePosition(processedReferencePosition.causedBy)) {
      let parentNode = reactFlowInstance.getNode(processedReferencePosition.parentId ?? '');
      while (parentNode) {
        processedReferencePosition.positions.forEach((position) => {
          position.x -= parentNode?.position.x ?? 0;
          position.y -= parentNode?.position.y ?? 0;
        });
        parentNode = reactFlowInstance.getNode(parentNode.parentId ?? '');
      }
    }

    const request: LayoutRequest = {
      previousDiagram: previousLaidoutDiagram,
      diagramToLayout,
      referencePosition: processedReferencePosition,
      layoutDirection,
      onLaidoutDiagram: callback,
    };

    if (state.currentStep === 'INITIAL_STEP') {
      setState((prevState) => ({ ...prevState, currentStep: 'BEFORE_LAYOUT', ...request }));
    } else {
      waitingRequest.current = request;
    }
  };

  useEffect(() => {
    if (state.currentStep === 'BEFORE_LAYOUT' && !state.hiddenContainer && state.diagramToLayout) {
      const { hiddenContainer, root } = prepareLayoutArea(state.diagramToLayout, layoutAreaPrepared, httpOrigin);
      setState((prevState) => ({
        ...prevState,
        hiddenContainer: hiddenContainer,
        root: root,
      }));
    } else if (state.currentStep === 'LAYOUT' && state.hiddenContainer && state.diagramToLayout) {
      prepareLayoutLabels(state.previousDiagram, state.diagramToLayout);
      if (
        layoutConfigurations[0] &&
        (diagramDescription?.layoutOption === 'AUTO_LAYOUT' ||
          (diagramDescription?.layoutOption === 'AUTO_UNTIL_MANUAL' && state.diagramToLayout.autoLaidOut))
      ) {
        prepareListNodeLayout(state.previousDiagram, state.diagramToLayout);
        const postLaidoutDiagram = layout(
          { nodes: state.diagramToLayout.nodes, edges: state.diagramToLayout.edges },
          { nodes: state.diagramToLayout.nodes, edges: state.diagramToLayout.edges },
          state.referencePosition,
          state.layoutDirection,
          nodeLayoutHandlers,
          true
        );
        elkLayout(postLaidoutDiagram.nodes, postLaidoutDiagram.edges, layoutConfigurations[0].layoutOptions).then(
          (layoutDiagram) => {
            const updatedLayoutNodes = layoutDiagram.nodes.map((n) => {
              return {
                ...n,
                data: {
                  ...n.data,
                  isNew: false,
                },
              };
            });
            const laidoutDiagram = layout(
              { nodes: updatedLayoutNodes, edges: state.previousDiagram?.edges ?? [] },
              { nodes: updatedLayoutNodes, edges: state.diagramToLayout?.edges ?? [] },
              state.referencePosition,
              state.layoutDirection,
              nodeLayoutHandlers,
              true
            );
            setState((prevState) => ({
              ...prevState,
              diagramToLayout: null,
              laidoutDiagram: laidoutDiagram,
              currentStep: 'AFTER_LAYOUT',
            }));
          }
        );
      } else {
        const laidoutDiagram = layout(
          state.previousDiagram,
          state.diagramToLayout,
          state.referencePosition,
          state.layoutDirection,
          nodeLayoutHandlers,
          false
        );
        setState((prevState) => ({
          ...prevState,
          diagramToLayout: null,
          laidoutDiagram: laidoutDiagram,
          currentStep: 'AFTER_LAYOUT',
        }));
      }
    } else if (state.currentStep === 'AFTER_LAYOUT' && state.hiddenContainer && state.laidoutDiagram) {
      cleanLayoutArea(state.hiddenContainer, state.root);
      state.onLaidoutDiagram(state.laidoutDiagram);
      const waiting = waitingRequest.current;
      waitingRequest.current = null;
      setState(() => (waiting ? { ...initialState, currentStep: 'BEFORE_LAYOUT', ...waiting } : initialState));
    }
  }, [state.currentStep, state.hiddenContainer, state.referencePosition, state.layoutDirection]);

  return {
    layout: layoutDiagram,
  };
};
