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
import { createContext, useContext } from 'react';
import { GQLDiagramRefreshedEventPayload } from '../graphql/subscription/diagramEventSubscription.types';

export const DiagramRefreshContext = createContext<GQLDiagramRefreshedEventPayload | null>(null);

/** The latest server event already being rendered; does not create a subscription. */
export const useDiagramRefresh = () => useContext(DiagramRefreshContext);
