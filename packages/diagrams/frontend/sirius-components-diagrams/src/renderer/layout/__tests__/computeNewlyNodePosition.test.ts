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

import { Node } from '@xyflow/react';
import { assert, describe, it } from 'vitest';
import { GQLReferencePosition } from '../../../graphql/subscription/diagramEventSubscription.types';
import { NodeData } from '../../DiagramRenderer.types';
import { DiagramNodeType } from '../../node/NodeTypes.types';
import { computeNewlyNodePosition } from '../layoutNode';

type TestNode = Node<NodeData, DiagramNodeType>;

/**
 * A node as the converter builds it. `isNew` says the server sent no layout data for the node, which is what
 * decides whether the node has a position of its own or has to be given one.
 */
const buildNode = (
  id: string,
  position: { x: number; y: number },
  isNew: boolean,
  isBorderNode: boolean = false,
  parentId: string | undefined = undefined
): TestNode =>
  ({
    id,
    type: 'rectangleNode',
    position,
    parentId,
    width: 120,
    height: 80,
    data: {
      isNew,
      isBorderNode,
      targetObjectId: id,
      targetObjectKind: '',
      targetObjectLabel: id,
      descriptionId: 'node-description',
    },
  } as unknown as TestNode);

/**
 * The reference position of a tool invoked on a node: it names the node, and the point it carries is a point
 * on that node rather than where the new node goes.
 */
const referencePositionOn = (parentId: string): GQLReferencePosition => ({
  parentId,
  positions: [],
  causedBy: 'test',
});

describe('computeNewlyNodePosition', () => {
  it('leaves a node the server placed where the server placed it', () => {
    // A tool can work out where the element it creates belongs and store that itself, in which case the node
    // arrives with layout data of its own. Working out a place beside the node the tool was invoked on would
    // drop the arrangement the tool made - two branches drawn from one gateway would land on top of one
    // another - and that placement is written back, so what the tool decided is lost rather than unseen.
    const source = buildNode('source', { x: 260, y: 240 }, false);
    const placedByTheServer = buildNode('created', { x: 370, y: 335 }, false);

    const newlyAdded = computeNewlyNodePosition(
      [source, placedByTheServer],
      [source],
      referencePositionOn('source'),
      'UNDEFINED'
    );

    assert.deepEqual(
      newlyAdded.map((node) => ({ id: node.id, position: node.position })),
      [{ id: 'created', position: { x: 370, y: 335 } }]
    );
  });

  it('places a node at the point the tool was invoked at when that point is its own', () => {
    // A tool invoked on the canvas is invoked where the new node goes, and nothing about the node being
    // placed by the server changes that: the point the modeller pointed at is the answer, and a position
    // the server worked out for want of a better one must not take its place.
    const placedByTheServer = buildNode('created', { x: 30, y: 30 }, false);

    const newlyAdded = computeNewlyNodePosition(
      [placedByTheServer],
      [],
      { parentId: '', positions: [{ x: 260, y: 200 }], causedBy: 'test' },
      'UNDEFINED'
    );

    assert.deepEqual(
      newlyAdded.map((node) => ({ id: node.id, position: node.position })),
      [{ id: 'created', position: { x: 260, y: 200 } }]
    );
  });

  it('reads where a border node goes off the border it is attached to, wherever the server put it', () => {
    // A border node stands on the edge of what it is attached to, and its position is read off that edge
    // below rather than taken as it comes. A position the server worked out is no answer to that question,
    // so a border node goes on being placed the way it always was.
    const host = buildNode('source', { x: 260, y: 240 }, false);
    const onTheBorder = buildNode('created', { x: 370, y: 335 }, false, true);

    const newlyAdded = computeNewlyNodePosition(
      [host, onTheBorder],
      [host],
      referencePositionOn('source'),
      'UNDEFINED'
    );

    assert.notDeepEqual(
      newlyAdded.map((node) => node.position),
      [{ x: 370, y: 335 }]
    );
  });

  it('places a child where the container palette was opened, when nothing stands there', () => {
    // A tool invoked on a container creates the new node inside it, and the point the palette was opened at is
    // a point within that container: it is where the modeller pointed, so it is where the node goes.
    const holder = buildNode('holder', { x: 0, y: 0 }, false);
    const child = buildNode('created', { x: 0, y: 0 }, true, false, 'holder');

    const newlyAdded = computeNewlyNodePosition(
      [holder, child],
      [holder],
      { parentId: 'holder', positions: [{ x: 60, y: 30 }], causedBy: 'test' },
      'UNDEFINED'
    );

    assert.deepEqual(
      newlyAdded.map((node) => ({ id: node.id, position: node.position })),
      [{ id: 'created', position: { x: 60, y: 30 } }]
    );
  });

  it('steps a child clear of the sibling already standing where the container palette was opened', () => {
    // Every child added from a container's own palette is created at the point that palette was opened at, so
    // the second one lands on the first and the two are drawn one over the other. The place is taken, so the
    // new child is laid beside what holds it instead.
    const holder = buildNode('holder', { x: 0, y: 0 }, false);
    const standing = buildNode('first', { x: 30, y: 30 }, false, false, 'holder');
    const child = buildNode('created', { x: 0, y: 0 }, true, false, 'holder');

    const newlyAdded = computeNewlyNodePosition(
      [holder, standing, child],
      [holder, standing],
      { parentId: 'holder', positions: [{ x: 60, y: 30 }], causedBy: 'test' },
      'UNDEFINED'
    );

    assert.deepEqual(
      newlyAdded.map((node) => ({ id: node.id, position: node.position })),
      [{ id: 'created', position: { x: 175, y: 30 } }]
    );
  });

  it('leaves the children of a container where they stand when the container is opened again', () => {
    // Expanding a collapsed container shows its children again, and they reach the diagram the way newly
    // created nodes do: absent a moment ago, present now. They are not new - the server sends the place each
    // of them was left at - and the point the expand tool was invoked at is a point on the collapsed
    // container's name band, no answer to where any of them goes. Read as newly created they would all be
    // carried to that band, and since the layout is written back the arrangement the modeller made would be
    // lost rather than merely mislaid.
    const holder = buildNode('holder', { x: 340, y: 240 }, false);
    const first = buildNode('first', { x: 60, y: 40 }, false, false, 'holder');
    const second = buildNode('second', { x: 205, y: 40 }, false, false, 'holder');

    const newlyAdded = computeNewlyNodePosition(
      [holder, first, second],
      [holder],
      { parentId: 'holder', positions: [{ x: 30, y: 40 }], causedBy: 'test' },
      'UNDEFINED'
    );

    assert.deepEqual(
      newlyAdded.map((node) => ({ id: node.id, position: node.position })),
      [
        { id: 'first', position: { x: 60, y: 40 } },
        { id: 'second', position: { x: 205, y: 40 } },
      ]
    );
  });

  it('places a node the server sent no layout data for beside the node it was drawn from', () => {
    // The ordinary case: the server names the element and leaves where it goes to the diagram, so the node
    // is laid beside what it was drawn from rather than at the origin the converter had to give it.
    const source = buildNode('source', { x: 260, y: 240 }, false);
    const unplaced = buildNode('created', { x: 0, y: 0 }, true);

    const newlyAdded = computeNewlyNodePosition(
      [source, unplaced],
      [source],
      referencePositionOn('source'),
      'UNDEFINED'
    );

    assert.deepEqual(
      newlyAdded.map((node) => ({ id: node.id, position: node.position })),
      [{ id: 'created', position: { x: 405, y: 240 } }]
    );
  });
});
