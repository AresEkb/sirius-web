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

import { Node, NodeChange } from '@xyflow/react';
import { assert, describe, it } from 'vitest';
import { NodeData } from '../../DiagramRenderer.types';
import { isPlainChangeBatch } from '../nodeChangePredicates';

type Changes = NodeChange<Node<NodeData>>[];

const resizeEnded = { id: 'node', type: 'dimensions', resizing: false, dimensions: { width: 200, height: 100 } };
const dragEnded = { id: 'node', type: 'position', dragging: false, position: { x: 10, y: 20 } };
const selected = { id: 'node', type: 'select', selected: true };
const replaced = { id: 'node', type: 'replace', item: {} };
const measured = { id: 'node', type: 'dimensions', dimensions: { width: 200, height: 100 } };

describe('a batch of node changes', () => {
  it('is plain when nothing in it has come to rest', () => {
    // A selection, a diagram replaced by a refresh, a size the renderer measured rather than a
    // modeller gave: nothing here has to be laid out or written.
    assert.isTrue(isPlainChangeBatch([selected] as Changes));
    assert.isTrue(isPlainChangeBatch([replaced] as Changes));
    assert.isTrue(isPlainChangeBatch([measured] as Changes));
  });

  it('is not plain when a resize in it has ended, whatever else travels with it', () => {
    // A selection is delivered in whichever batch react-flow puts it in, including the one carrying
    // the end of a resize. Read as a plain selection, that batch draws the new size and writes
    // nothing, so the size is gone on the next reload with nothing to show for it.
    assert.isFalse(isPlainChangeBatch([selected, resizeEnded] as Changes));
  });

  it('is not plain when a drag in it has ended, alongside a diagram refresh', () => {
    // A refresh replaces what is drawn whenever the server has something to say, which under load is
    // often - including in the batch that carries a node coming to rest.
    assert.isFalse(isPlainChangeBatch([replaced, dragEnded] as Changes));
  });
});
