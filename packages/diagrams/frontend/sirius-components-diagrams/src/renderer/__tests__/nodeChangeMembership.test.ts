/*******************************************************************************
 * Copyright (c) 2026 Denis Nikiforov.
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

import { readFileSync } from 'node:fs';
import { Node, NodeChange, applyNodeChanges } from '@xyflow/react';
import ts from 'typescript';
import { expect, it } from 'vitest';

// Execute the renderer's real callback without mounting unrelated diagram hooks.
const source = ts.createSourceFile(
  'DiagramRenderer.tsx',
  readFileSync(new URL('../DiagramRenderer.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let handler: string | undefined;
function visit(node: ts.Node): void {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === 'handleNodesChange' &&
    node.initializer &&
    ts.isCallExpression(node.initializer)
  ) {
    handler = node.initializer.arguments[0].getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(source);
if (!handler) throw new Error('DiagramRenderer node-change callback not found');
const emitted = ts.transpileModule(`const callback = ${handler};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

const node = (id: string): Node => ({ id, position: { x: 0, y: 0 }, data: {} });

function measureAfterHistory(captured: Node[], live: Node[]): Node[] {
  let current = live;
  const unchanged = (changes: NodeChange[]) => changes;
  const retain = (_changes: NodeChange[], nodes: Node[]) => nodes;
  const context = {
    nodes: captured,
    getNodes: () => current,
    getEdges: () => [],
    setNodes: (update: (nodes: Node[]) => Node[]) => {
      current = update(current);
    },
    filterReadOnlyChanges: unchanged,
    applyNodeChanges,
    applyLastElementSelected: retain,
    selectedElementsIds: [],
    resetHelperLines() {},
    transformBorderNodeChanges: unchanged,
    transformUndraggableListNodeChanges: unchanged,
    applyHelperLines: unchanged,
    transformMultiSelectResizeNodeChanges: unchanged,
    transformResizeListNodeChanges: unchanged,
    applyMoveChange: retain,
    applyHandleChange: retain,
    applyResizeHandleChange: retain,
    applyResizeByUserState: retain,
    layoutOnBoundsChange() {},
    // Other topic branches extend the same callback; keep this focused on membership.
    isPlainChangeBatch: () => false,
    preserveNodeInteractionState: (nodes: Node[]) => nodes,
    isBoundsGestureChange: () => false,
  };
  const callback = Function(...Object.keys(context), `${emitted}\nreturn callback;`)(...Object.values(context));
  callback([
    { id: 'existing', type: 'dimensions', dimensions: { width: 100, height: 50 } },
    { id: 'restored', type: 'dimensions', dimensions: { width: 80, height: 40 } },
  ]);
  expect(current.find(({ id }) => id === 'existing')?.measured).toEqual({ width: 100, height: 50 });
  return current;
}

it('keeps a node restored after the callback was captured when measurements arrive', () => {
  const result = measureAfterHistory([node('existing')], [node('existing'), node('restored')]);
  expect(result.map(({ id }) => id)).toEqual(['existing', 'restored']);
});

it('does not resurrect a node removed after the callback was captured', () => {
  const result = measureAfterHistory([node('existing'), node('removed')], [node('existing')]);
  expect(result.map(({ id }) => id)).toEqual(['existing']);
});
