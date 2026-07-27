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

import { assert, describe, it } from 'vitest';
import { axesCarriedSoFar, nothingCarriedYet } from '../carriedAxes';

const startedAt = { width: 400, height: 300 };

describe('the axes a resize carries', () => {
  it('are none of them before anything has moved', () => {
    assert.deepEqual(axesCarriedSoFar(nothingCarriedYet, { width: 400, height: 300 }, startedAt), {
      width: false,
      height: false,
    });
  });

  it('leave out the side the control does not carry', () => {
    // A control on one side reports both dimensions, the side it does not carry at the size the node
    // already has. A lane whose height is being dragged must not be offered a line down its
    // right-hand side, which marks nothing this gesture could snap to.
    assert.deepEqual(axesCarriedSoFar(nothingCarriedYet, { width: 400, height: 360 }, startedAt), {
      width: false,
      height: true,
    });
  });

  it('keep an axis that has moved once, even where it comes back to where it began', () => {
    // An edge carried away from where it started and back again - by the modeller, or by a snap onto
    // a neighbour that happens to stand exactly there - is still the edge being dragged. Reading it
    // as standing still takes away the very line it has just been snapped to, so the alignment
    // flickers and is gone at the moment the modeller is using it.
    const carried = axesCarriedSoFar(nothingCarriedYet, { width: 340, height: 300 }, startedAt);

    assert.deepEqual(axesCarriedSoFar(carried, { width: 400, height: 300 }, startedAt), {
      width: true,
      height: false,
    });
  });
});
