/*******************************************************************************
 * Copyright (c) 2024 Obeo.
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

type UpdateNodeInternals = (ids: string[]) => void;
type Batch = Map<string, Set<symbol>>;
const pending = new WeakMap<object, Batch>();

// React Flow already uses a frame to measure handles. Combine requests before that frame.
export const scheduleHandleRefresh = (key: object, updateNodeInternals: UpdateNodeInternals, id: string) => {
  let batch = pending.get(key);
  if (!batch) {
    const currentBatch: Batch = new Map();
    batch = currentBatch;
    pending.set(key, currentBatch);
    queueMicrotask(() => {
      if (pending.get(key) !== currentBatch) {
        return;
      }
      pending.delete(key);
      const ids = [...currentBatch.keys()];
      currentBatch.clear();
      if (ids.length > 0) {
        updateNodeInternals(ids);
      }
    });
  }
  const token = Symbol();
  const requests = batch.get(id) ?? new Set<symbol>();
  batch.set(id, requests);
  requests.add(token);
  return () => {
    if (pending.get(key) !== batch) {
      return;
    }
    requests.delete(token);
    if (!requests.size) {
      batch.delete(id);
    }
    if (!batch.size) {
      pending.delete(key);
    }
  };
};
