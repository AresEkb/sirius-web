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
import { NodeData } from '../../DiagramRenderer.types';
import { DiagramNodeType } from '../../node/NodeTypes.types';
import { FreeFormNodeLayoutHandler } from '../FreeFormNodeLayoutHandler';
import { layout } from '../layout';

type TestNode = Node<NodeData, DiagramNodeType>;

/**
 * A node as it reaches the layout: the size beside it is the size the server has stored for it,
 * which is what the converter measures it at until the layout says otherwise.
 */
const buildNode = (storedHeight: number, defaultHeight: number): TestNode =>
  ({
    id: 'node',
    type: 'freeFormNode',
    position: { x: 0, y: 0 },
    width: 150,
    height: storedHeight,
    measured: { width: 150, height: storedHeight },
    data: {
      isNew: false,
      isBorderNode: false,
      resizedByUser: false,
      defaultWidth: 150,
      defaultHeight,
      targetObjectId: 'node',
      targetObjectKind: '',
      targetObjectLabel: 'node',
      descriptionId: 'node-description',
      outsideLabels: {},
      insideLabel: null,
      style: {},
      connectionHandles: [],
      isListChild: false,
      areChildNodesDraggable: true,
      nodeAppearanceData: { gqlStyle: {}, customizedStyleProperties: [] },
    },
  } as unknown as TestNode);

describe('the size a laid-out node is measured at', () => {
  it('is the size the layout gave it, not the one the server last stored', () => {
    // A node is measured at whatever size came with it from the server, and the layout then works
    // out the size it is actually drawn at - larger, for instance, once something has been added
    // inside it. Until the new size has made the round trip and come back, the two disagree, and a
    // resize begun in that window starts from the stored size rather than from the edge the
    // modeller is pulling: the drag is short by the whole of the difference, and the node ends up
    // smaller than it was asked to be.
    const node = buildNode(70, 300);

    const laidOut = layout(
      null,
      { nodes: [node], edges: [] },
      null,
      'UNDEFINED',
      [new FreeFormNodeLayoutHandler()],
      false
    );

    const laidOutNode = laidOut.nodes[0]!;
    assert.deepEqual(
      { height: laidOutNode.height, measured: laidOutNode.measured?.height },
      { height: 300, measured: 300 }
    );
  });
});
