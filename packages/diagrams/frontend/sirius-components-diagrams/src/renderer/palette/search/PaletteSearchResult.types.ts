/*******************************************************************************
 * Copyright (c) 2024 Obeo.
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

import { GQLPalette, GQLTool } from '../Palette.types';
export interface PaletteSearchResultProps {
  onToolClick: (tool: GQLTool) => void;
  palette: GQLPalette;
  searchToolValue: string;
}

export interface HighlightedLabelProps {
  label: string;
  textToHighlight: string;
}