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
import { useCallback, useRef } from 'react';
import { UseRubberBandSelectionValue } from './useRubberBandSelection.types';

/**
 * Tracks the rubber band - the selection rectangle the user drags over the background - so that the
 * selection it produces can be corrected while it is in progress.
 *
 * React Flow selects every edge connected to a node the rectangle covers, including the edges whose
 * other end is outside it. An edge belongs to the region the user is taking only when both of its
 * ends do, so `isEdgeSelectableByBand` states that rule and the caller drops the others.
 *
 * @author dnikiforov
 */
export const useRubberBandSelection = (): UseRubberBandSelectionValue => {
  const active = useRef<boolean>(false);

  const onSelectionStart = useCallback(() => {
    active.current = true;
  }, []);

  const onSelectionEnd = useCallback(() => {
    active.current = false;
  }, []);

  const isBandActive = useCallback(() => active.current, []);

  return {
    onSelectionStart,
    onSelectionEnd,
    isBandActive,
  };
};
