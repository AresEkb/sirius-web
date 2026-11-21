/*******************************************************************************
 * Copyright (c) 2023, 2026 Obeo.
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

import { Node } from '@xyflow/react';
import { expect, it } from 'vitest';
import { NodeData } from '../../DiagramRenderer.types';
import { preserveNodeInteractionState } from '../preserveNodeInteractionState';

const asNodes = (nodes: { id: string; data: object }[]): Node<NodeData>[] => nodes as Node<NodeData>[];

it('preserves interaction flags in node order with linear ID reads', () => {
  let reads = 0;
  const previous = Array.from({ length: 1000 }, (_, index) => ({
    get id() {
      reads++;
      return String(index);
    },
    data: {
      isDraggedNode: true,
      isDragNodeSource: false,
      isDropNodeTarget: index === 1,
      isDropNodeCandidate: true,
    },
  }));
  const next = previous.map((node) => ({ id: node.id, data: { model: 'new', isDraggedNode: false } }));
  reads = 0;
  const result = preserveNodeInteractionState(asNodes(next), asNodes(previous));
  expect(reads).toBeLessThanOrEqual(previous.length * 3);
  expect(result.map((node) => node.id)).toEqual(next.map((node) => node.id));
  expect(result[1]).toBe(next[1]);
  expect(result[1].data).toEqual({ ...previous[1].data, model: 'new' });
  const added = { id: 'added', data: { model: 'added' } };
  expect(preserveNodeInteractionState(asNodes([added]), asNodes(previous))[0]).toBe(added);
  const first = { id: 'duplicate', data: { isDraggedNode: true } };
  const last = { id: 'duplicate', data: { isDraggedNode: false } };
  expect(
    preserveNodeInteractionState(asNodes([{ id: 'duplicate', data: {} }]), asNodes([first, last]))[0].data.isDraggedNode
  ).toBe(true);
});
