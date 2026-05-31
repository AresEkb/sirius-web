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

import { Selection } from '@eclipse-sirius/sirius-components-core';

/*
 * A selection made on a diagram is published to the rest of the editor and comes back to the
 * diagram as any other selection would, with nothing to say where it was made. The diagram cannot
 * tell it from a selection made in the model tree or followed from a link, and so brings what was
 * selected into the middle of the view - taking the canvas away from the very gesture that made
 * the selection. What a diagram publishes is therefore noted as it goes out and recognised when it
 * comes back: it is applied like any other selection, but never revealed, since the modeller is
 * plainly already looking at what they have just pressed.
 */
let lastPublished: Selection | null = null;
let publishedAt = 0;

/**
 * How long a selection published by a diagram goes on being recognised as its own, in
 * milliseconds. What comes back is not always what went out - a gesture that takes hold of one
 * lane marks the swimlane it belongs to as well, and the editor may answer with the object behind
 * what was pressed rather than with the element itself - so a selection arriving in the moment
 * after a diagram published one is taken to be the answer to it. Nothing else changes the
 * selection that quickly: a press in the model tree, or a link followed from a form, is a separate
 * act of the modeller's, seconds apart.
 */
const STILL_OURS = 1_000;

/** Note the selection a diagram is publishing to the rest of the editor. */
export const publishedByADiagram = (selection: Selection): void => {
  lastPublished = selection;
  publishedAt = performance.now();
};

/** Whether `selection` is one a diagram has just published, or the editor's answer to it. */
export const wasPublishedByADiagram = (selection: Selection): boolean => {
  if (!lastPublished) {
    return false;
  }
  if (performance.now() - publishedAt < STILL_OURS) {
    return true;
  }
  if (lastPublished.entries.length !== selection.entries.length) {
    return false;
  }
  const published = new Set(lastPublished.entries.map((entry) => entry.id));
  return selection.entries.every((entry) => published.has(entry.id));
};
