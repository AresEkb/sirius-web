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

export interface DiagramNavigationContextValue {
  /**
   * Navigates from a graphical object that was activated (double-clicked) on
   * the diagram. Resolves to true when the object links somewhere and the
   * navigation was performed (for example a node referencing another diagram
   * opened it), or false when the object links nowhere - in which case the
   * diagram falls back to its default activation behaviour.
   */
  navigateOnActivation: (objectId: string) => Promise<boolean>;
}
