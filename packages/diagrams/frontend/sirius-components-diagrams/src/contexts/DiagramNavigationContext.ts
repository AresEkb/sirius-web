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
import React from 'react';
import { DiagramNavigationContextValue } from './DiagramNavigationContext.types';

const value: DiagramNavigationContextValue = {
  navigateOnActivation: () => Promise.resolve(false),
};

export const DiagramNavigationContext = React.createContext<DiagramNavigationContextValue>(value);
