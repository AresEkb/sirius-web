/*******************************************************************************
 * Copyright (c) 2023, 2024 Obeo.
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

import { DiagramEdgeTypes } from './EdgeTypes.types';
import { SmoothStepEdgeWrapper } from './SmoothStepEdgeWrapper';
import { SmartStepEdgeWrapper } from './SmartStepEdgeWrapper';

export const edgeTypes: DiagramEdgeTypes = {
  smartStepEdge: SmartStepEdgeWrapper,
  smoothStepEdge: SmoothStepEdgeWrapper,
};
