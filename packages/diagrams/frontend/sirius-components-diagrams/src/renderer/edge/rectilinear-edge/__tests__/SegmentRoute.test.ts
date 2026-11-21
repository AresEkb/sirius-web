/*******************************************************************************
 * Copyright (c) 2025, 2026 Obeo.
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
import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { clipSegmentRoute, getTerminalSide, RouteNode } from '../SegmentRoute';

const node = (x: number, y: number, width: number, height: number): RouteNode =>
  ({ width, height, internals: { positionAbsolute: { x, y } } } as RouteNode);

describe('clipSegmentRoute', () => {
  it('clips both terminals and removes bends covered by the enlarged node', () => {
    const source = node(0, 0, 50, 60);
    const target = node(100, 50, 40, 40);
    const clipped = clipSegmentRoute(
      [
        { x: 20, y: 10 },
        { x: 45, y: 10 },
        { x: 45, y: 70 },
        { x: 110, y: 70 },
      ],
      source,
      target
    );
    expect(clipped).toEqual([
      { x: 45, y: 60 },
      { x: 45, y: 70 },
      { x: 100, y: 70 },
    ]);
    expect(getTerminalSide(clipped[0]!, clipped[1]!)).toBe(Position.Bottom);
    expect(getTerminalSide(clipped[2]!, clipped[1]!)).toBe(Position.Left);
  });
});
