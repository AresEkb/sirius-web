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

/** The size a node had when the resize now under way was begun. */
export interface SizeAtGestureStart {
  width: number | undefined;
  height: number | undefined;
}

/** Which axes the resize now under way has carried. */
export interface CarriedAxes {
  width: boolean;
  height: boolean;
}

/** A gesture that has not carried anything yet. */
export const nothingCarriedYet: CarriedAxes = { width: false, height: false };

const hasMoved = (reported: number | undefined, atStart: number | undefined): boolean =>
  reported !== undefined && Math.round(reported) !== Math.round(atStart ?? 0);

/**
 * Which axes the resize has carried, given what it had carried until now and what this change
 * reports.
 *
 * A resize control on one side reports both dimensions, the side it does not carry at the size the
 * node already has: without telling the two apart, an edge standing still would be offered the
 * alignments of every node it happens to be flush with, and the height of a lane could not be dragged
 * without a line being drawn down its right-hand side, marking nothing the gesture could snap to.
 *
 * <p>
 * An axis that has moved once stays carried for the rest of the gesture, rather than being read
 * against where it began each time. An edge carried away and back again - by the modeller, or by a
 * snap onto a neighbour that happens to stand exactly where the edge started - is still the edge
 * being dragged, and reading it as standing still would take away the very line it has just been
 * snapped to: the alignment would flicker and be gone at the moment it is being used.
 * </p>
 */
export const axesCarriedSoFar = (
  carried: CarriedAxes,
  reported: { width?: number; height?: number },
  atStart: SizeAtGestureStart
): CarriedAxes => ({
  width: carried.width || hasMoved(reported.width, atStart.width),
  height: carried.height || hasMoved(reported.height, atStart.height),
});
