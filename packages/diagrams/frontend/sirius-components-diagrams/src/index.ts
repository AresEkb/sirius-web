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

export { DiagramContext } from './contexts/DiagramContext';
export type { DiagramContextValue } from './contexts/DiagramContext.types';
export { NodeTypeContext } from './contexts/NodeContext';
export type { NodeTypeContextValue, NodeTypeContributionElement } from './contexts/NodeContext.types';
export { convertBorderNodePosition } from './converter/convertBorderNodes';
export { convertLineStyle, isListLayoutStrategy } from './converter/convertDiagram';
export { AlignmentMap } from './converter/convertDiagram.types';
export type { IConvertEngine, INodeConverter } from './converter/ConvertEngine.types';
export { convertHandles } from './converter/convertHandles';
export { convertInsideLabel, convertLabelStyle, convertOutsideLabels } from './converter/convertLabel';
export { diagramDialogContributionExtensionPoint } from './dialog/DialogContextExtensionPoints';
export type {
  DiagramDialogComponentProps,
  DiagramDialogContribution,
  DiagramDialogVariable,
} from './dialog/DialogContextExtensionPoints.types';
export { useDialog } from './dialog/useDialog';
export type { UseDialogValue } from './dialog/useDialog.types';
export type { GQLNodeDescription } from './graphql/query/nodeDescriptionFragment.types';
export type { GQLDiagram, GQLHandleLayoutData, GQLNodeLayoutData } from './graphql/subscription/diagramFragment.types';
export type { GQLEdge } from './graphql/subscription/edgeFragment.types';
export { GQLViewModifier } from './graphql/subscription/nodeFragment.types';
export type { GQLNode, GQLNodeStyle } from './graphql/subscription/nodeFragment.types';
export type { ActionProps } from './renderer/actions/Action.types';
export { diagramNodeActionOverrideContributionExtensionPoint } from './renderer/actions/DiagramNodeActionExtensionPoints';
export type { DiagramNodeActionOverrideContribution } from './renderer/actions/DiagramNodeActionExtensionPoints.types';
export { ManageVisibilityContext } from './renderer/actions/visibility/ManageVisibilityContextProvider';
export type { ManageVisibilityContextValue } from './renderer/actions/visibility/ManageVisibilityContextProvider.types';
export { useConnectionLineNodeStyle } from './renderer/connector/useConnectionLineNodeStyle';
export { useConnectorNodeStyle } from './renderer/connector/useConnectorNodeStyle';
export { BorderNodePosition as BorderNodePosition } from './renderer/DiagramRenderer.types';
export type { Diagram, EdgeData, NodeData, ReactFlowPropsCustomizer } from './renderer/DiagramRenderer.types';
export { diagramRendererReactFlowPropsCustomizerExtensionPoint } from './renderer/DiagramRendererExtensionPoints';
export { DiagramDirectEditInput } from './renderer/direct-edit/DiagramDirectEditInput';
export type { DiagramDirectEditInputProps } from './renderer/direct-edit/DiagramDirectEditInput.types';
export { useDiagramDirectEdit } from './renderer/direct-edit/useDiagramDirectEdit';
export { useDrop } from './renderer/drop/useDrop';
export { useDropNode } from './renderer/dropNode/useDropNode';
export { useDropNodeStyle } from './renderer/dropNode/useDropNodeStyle';
export { ConnectionCreationHandles } from './renderer/handles/ConnectionCreationHandles';
export { ConnectionHandles } from './renderer/handles/ConnectionHandles';
export type { ConnectionHandle } from './renderer/handles/ConnectionHandles.types';
export { ConnectionTargetHandle } from './renderer/handles/ConnectionTargetHandle';
export { useRefreshConnectionHandles } from './renderer/handles/useRefreshConnectionHandles';
export { Label } from './renderer/Label';
export { computePreviousPosition, computePreviousSize } from './renderer/layout/bounds';
export type { ForcedDimensions } from './renderer/layout/layout.types';
export * from './renderer/layout/layoutBorderNodes';
export type { ILayoutEngine, INodeLayoutHandler } from './renderer/layout/LayoutEngine.types';
export * from './renderer/layout/layoutNode';
export { defaultHeight, defaultWidth } from './renderer/layout/layoutParams';
export { useLayout } from './renderer/layout/useLayout';
export { NodeContext } from './renderer/node/NodeContext';
export type { NodeContextValue } from './renderer/node/NodeContext.types';
export { NodeTypeContribution } from './renderer/node/NodeTypeContribution';
export type { DiagramNodeType } from './renderer/node/NodeTypes.types';
export type {
  PaletteAppearanceSectionContributionComponentProps,
  PaletteAppearanceSectionContributionProps,
} from './renderer/palette/appearance/extensions/PaletteAppearanceSectionContribution.types';
export { paletteAppearanceSectionExtensionPoint } from './renderer/palette/appearance/extensions/PaletteAppearanceSectionExtensionPoints';
export { LabelAppearancePart } from './renderer/palette/appearance/label/LabelAppearancePart';
export { useResetNodeAppearance } from './renderer/palette/appearance/useResetNodeAppearance';
export { AppearanceColorPicker } from './renderer/palette/appearance/widget/AppearanceColorPicker';
export { AppearanceNumberTextfield } from './renderer/palette/appearance/widget/AppearanceNumberTextfield ';
export { AppearanceSelect } from './renderer/palette/appearance/widget/AppearanceSelect';
export { DiagramElementPalette } from './renderer/palette/DiagramElementPalette';
export type { DiagramPaletteToolComponentProps } from './renderer/palette/extensions/DiagramPaletteTool.types';
export type {
  DiagramPaletteToolContributionComponentProps,
  DiagramPaletteToolContributionProps,
} from './renderer/palette/extensions/DiagramPaletteToolContribution.types';
export { diagramPaletteToolExtensionPoint } from './renderer/palette/extensions/DiagramPaletteToolExtensionPoints';
export type { DiagramPanelActionProps } from './renderer/panel/DiagramPanel.types';
export { diagramPanelActionExtensionPoint } from './renderer/panel/DiagramPanelExtensionPoints';
export type { IElementSVGExportHandler } from './renderer/panel/experimental-svg-export/SVGExportEngine.types';
export { svgExportIElementSVGExportHandlerExtensionPoint } from './renderer/panel/experimental-svg-export/SVGExportHandlerExtensionPoints';
export type { GQLToolVariable, GQLToolVariableType } from './renderer/tools/useInvokePaletteTool.types';
export { DiagramRepresentation } from './representation/DiagramRepresentation';
export type { GQLDiagramDescription } from './representation/DiagramRepresentation.types';

// Metamodel
export { DiagramDescriptionContext } from './contexts/DiagramDescriptionContext';
export { useDiagramDescription } from './contexts/useDiagramDescription';
export { convertDiagram } from './converter/convertDiagram';
export { DialogContextProvider } from './dialog/DialogContext';
export type { GQLUserResizableDirection } from './graphql/query/nodeDescriptionFragment.types';
export { diagramEventSubscription } from './graphql/subscription/diagramEventSubscription';
export type {
  GQLDiagramEventPayload,
  GQLDiagramRefreshedEventPayload,
} from './graphql/subscription/diagramEventSubscription.types';
export type * from './graphql/subscription/labelFragment.types';
export type {
  FreeFormLayoutStrategy,
  ILayoutStrategy,
  ListLayoutStrategy,
} from './graphql/subscription/nodeFragment.types';
export { PinIcon } from './icons/PinIcon';
export { UnpinIcon } from './icons/UnpinIcon';
export { ActionsContainer } from './renderer/actions/ActionsContainer';
export type { ActionsContainerProps } from './renderer/actions/ActionsContainer.types';
export { ManageVisibilityContextProvider } from './renderer/actions/visibility/ManageVisibilityContextProvider';
export { useAdjustSize } from './renderer/adjust-size/useAdjustSize';
export { useBorderChange } from './renderer/border/useBorderChange';
export { ConnectorContextProvider } from './renderer/connector/ConnectorContext';
export { ConnectorContextualMenu } from './renderer/connector/ConnectorContextualMenu';
export { useConnector } from './renderer/connector/useConnector';
export { DebugPanel } from './renderer/debug/DebugPanel';
export { useDiagramDelete } from './renderer/delete/useDiagramDelete';
export type {
  DiagramRendererProps,
  EdgeLabel,
  HeaderPosition,
  InsideLabel,
  LabelAppearanceData,
  LabelOverflowStrategy,
  OutsideLabel,
} from './renderer/DiagramRenderer.types';
export { DiagramDirectEditContextProvider } from './renderer/direct-edit/DiagramDirectEditContext';
export { useNodesDraggable } from './renderer/drag/useNodesDraggable';
export { DropNodeContextProvider } from './renderer/dropNode/DropNodeContext';
export { useDropDiagramStyle } from './renderer/dropNode/useDropDiagramStyle';
export { ConnectionLine } from './renderer/edge/ConnectionLine';
export { MarkerDefinitions } from './renderer/edge/MarkerDefinitions';
export type { MultiLabelEdgeData } from './renderer/edge/MultiLabelEdge.types';
export { SmartStepEdgeWrapper } from './renderer/edge/SmartStepEdgeWrapper';
export { SmoothStepEdgeWrapper } from './renderer/edge/SmoothStepEdgeWrapper';
export { useFadeDiagramElements } from './renderer/fade/useFadeDiagramElements';
export { useInitialFitToScreen } from './renderer/fit-to-screen/useInitialFitToScreen';
export { FullscreenContextProvider } from './renderer/fullscreen/FullscreenContext';
export { useHandleChange } from './renderer/handles/useHandleChange';
export { useHandleResizedChange } from './renderer/handles/useHandleResizedChange';
export { HelperLines } from './renderer/helper-lines/HelperLines';
export { useHelperLines } from './renderer/helper-lines/useHelperLines';
export { useNodeHover } from './renderer/hover/useNodeHover';
export { useFilterReadOnlyChanges } from './renderer/layout-events/useFilterReadOnlyChanges';
export { useLayoutOnBoundsChange } from './renderer/layout-events/useLayoutOnBoundsChange';
export type { RawDiagram } from './renderer/layout/layout.types';
export { useSynchronizeLayoutData } from './renderer/layout/useSynchronizeLayoutData';
export { useMoveChange } from './renderer/move/useMoveChange';
export { NodeContextProvider } from './renderer/node/NodeContext';
export { Resizer } from './renderer/node/Resizer';
export type { ResizerProps } from './renderer/node/Resizer.types';
export { useNodeType } from './renderer/node/useNodeType';
export {
  DiagramElementPaletteContext,
  DiagramElementPaletteContextProvider,
} from './renderer/palette/contexts/DiagramElementPaletteContext';
export type { DiagramElementPaletteContextValue } from './renderer/palette/contexts/DiagramElementPaletteContext.types';
export { DiagramPaletteContextProvider } from './renderer/palette/contexts/DiagramPaletteContext';
export { DiagramPalette } from './renderer/palette/DiagramPalette';
export { GroupPalette } from './renderer/palette/group-tool/GroupPalette';
export { useGroupPalette } from './renderer/palette/group-tool/useGroupPalette';
export type {
  GQLPalette,
  GQLPaletteDivider,
  GQLPaletteEntry,
  GQLSingleClickOnDiagramElementTool,
  GQLTool,
  GQLToolSection,
  PaletteProps,
} from './renderer/palette/Palette.types';
export { useDiagramElementPalette } from './renderer/palette/useDiagramElementPalette';
export { useDiagramPalette } from './renderer/palette/useDiagramPalette';
export { usePaletteContents } from './renderer/palette/usePaletteContents';
export { DiagramPanel } from './renderer/panel/DiagramPanel';
export { usePinDiagramElements } from './renderer/pin/usePinDiagramElements';
export { useReconnectEdge } from './renderer/reconnect-edge/useReconnectEdge';
export { useResizeChange } from './renderer/resize/useResizeChange';
export { useDiagramSelection } from './renderer/selection/useDiagramSelection';
export { useShiftSelection } from './renderer/selection/useShiftSelection';
export { useSnapToGrid } from './renderer/snap-to-grid/useSnapToGrid';
export { DiagramToolExecutorContextProvider } from './renderer/tools/DiagramToolExecutorContext';
export type {
  GQLDiagramDescriptionData,
  GQLDiagramDescriptionVariables,
} from './representation/DiagramRepresentation.types';
export { StoreContextProvider } from './representation/StoreContext';
export { useDiagramSubscription } from './representation/useDiagramSubscription';
export type { UseDiagramSubscriptionValue } from './representation/useDiagramSubscription.types';
export { useStore } from './representation/useStore';
