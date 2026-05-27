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
import { GQLMessage } from '@eclipse-sirius/sirius-components-core';
import { ToolVariable } from '../../dialog/DialogContext.types';

export interface UseDropValue {
  onDrop: (event: React.DragEvent, diagramElementId?: string) => void;
  onDragOver: (event: React.DragEvent) => void;
}

export interface GQLDropOnDiagramPayload {
  __typename: string;
}

export interface GQLDropOnDiagramData {
  dropOnDiagram: GQLDropOnDiagramPayload;
}

export interface GQLDropOnDiagramInput {
  id: string;
  editingContextId: string;
  representationId: string;
  objectIds: string[];
  startingPositionX: number;
  startingPositionY: number;
  diagramTargetElementId: string;
  variables: ToolVariable[];
}

export interface GQLDropOnDiagramVariables {
  input: GQLDropOnDiagramInput;
}

export interface GQLErrorPayload extends GQLDropOnDiagramPayload {
  messages: GQLMessage[];
}

export interface GQLDropOnDiagramSuccessPayload extends GQLDropOnDiagramPayload {
  messages: GQLMessage[];
}

export interface GQLGetDropDialogVariables {
  editingContextId: string;
  representationId: string;
  diagramTargetElementId: string | null;
  objectIds: string[];
}

export interface GQLGetDropDialogData {
  viewer: {
    editingContext: {
      representation: {
        description: GQLRepresentationDescriptionWithDropDialog;
      } | null;
    } | null;
  };
}

export interface GQLRepresentationDescriptionWithDropDialog {
  __typename: string;
  dropDialog?: GQLDropDialogDescriptor | null;
}

export interface GQLDropDialogDescriptor {
  dialogDescriptionId: string;
  initialVariables: GQLDropDialogVariable[];
}

export interface GQLDropDialogVariable {
  name: string;
  value: string;
  type: string;
}
