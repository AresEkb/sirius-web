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
import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';
import { ToastContextValue } from '../contexts/ToastContext.types';
import { Variant } from './MultiToast.types';

// Levels reach the toast from two sides: the backend sends the upper case names of its
// message enum, while the local helpers below build a message by hand. Folding the case
// here keeps a hand-written level from silently falling through to the default variant.
const getVariantFromMessageLevel = (level: string): Variant => {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return 'error';
    case 'INFO':
      return 'info';
    case 'WARNING':
      return 'warning';
    case 'SUCCESS':
      return 'success';
    default:
      return 'default';
  }
};

export const useMultiToast = () => {
  const { enqueueSnackbar } = useContext<ToastContextValue>(ToastContext);

  const addMessages = (messages) =>
    messages.map((message) => enqueueSnackbar(message.body, { variant: getVariantFromMessageLevel(message.level) }));

  const addErrorMessage = (message: string) => addMessages([{ body: message, level: 'error' }]);

  return {
    addErrorMessage,
    addMessages,
  };
};
