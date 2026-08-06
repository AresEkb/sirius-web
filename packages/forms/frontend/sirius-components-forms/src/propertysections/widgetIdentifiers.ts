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
import { GQLWidget } from '../form/FormEventFragments.types';

/**
 * Returns the identifier of the DOM element holding the value of the given widget.
 *
 * @param widget the widget
 * @return the identifier to set on the input element of the widget
 */
export const getWidgetInputId = (widget: GQLWidget): string => `${widget.id}-input`;

/**
 * Returns the identifier of the DOM element displaying the label of the given widget.
 *
 * @param widget the widget
 * @return the identifier set on the label element of the widget
 */
export const getWidgetLabelId = (widget: GQLWidget): string => `${widget.id}-label`;
