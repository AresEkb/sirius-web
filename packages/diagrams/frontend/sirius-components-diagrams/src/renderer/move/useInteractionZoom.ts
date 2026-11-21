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
import { useStore } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const useInteractionZoom = (readOnly: boolean) => {
  const [active, setActive] = useState(false);
  const zoom = useStore((state) => (active ? state.transform[2] : 1));
  useEffect(() => {
    if (!active) {
      return;
    }
    const stop = () => setActive(false);
    const events = ['mouseup', 'touchend', 'touchcancel', 'pointercancel', 'blur'];
    for (const event of events) {
      window.addEventListener(event, stop, true);
    }
    return () => {
      for (const event of events) {
        window.removeEventListener(event, stop, true);
      }
    };
  }, [active]);

  const begin = () => {
    if (!readOnly && !active) {
      // The drag and resize handlers read the scale during the same input event.
      flushSync(() => setActive(true));
    }
  };
  return { zoom, begin };
};
