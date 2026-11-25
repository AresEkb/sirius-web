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

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { useTreeFilters } from '../useTreeFilters';
import { GQLGetAllTreeFiltersData, UseTreeFilterValue } from '../useTreeFilters.types';

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useQuery,
}));
vi.mock('@eclipse-sirius/sirius-components-core', () => ({
  useMultiToast: () => ({ addErrorMessage: vi.fn() }),
}));

const filters = [{ id: 'filter', label: 'Filter', defaultState: true }];
const cases: { name: string; data: GQLGetAllTreeFiltersData | undefined; loading: boolean }[] = [
  { name: 'revoked editing context', data: { viewer: { editingContext: null } }, loading: false },
  {
    name: 'missing representation description',
    data: { viewer: { editingContext: { representationDescription: null } } },
    loading: false,
  },
  { name: 'pending query', data: undefined, loading: true },
];

function readFilters(): UseTreeFilterValue | undefined {
  let result: UseTreeFilterValue | undefined;
  function Probe() {
    result = useTreeFilters('project', 'explorer://');
    return null;
  }
  renderToString(createElement(Probe));
  return result;
}

test.each(cases)('returns no filters for $name', ({ data, loading }) => {
  useQuery.mockReturnValue({ data, loading });
  expect(readFilters()).toEqual({ treeFilters: [], loading });
});

test('preserves available tree filters', () => {
  useQuery.mockReturnValue({
    data: {
      viewer: {
        editingContext: {
          representationDescription: { __typename: 'TreeDescription', id: 'explorer://', filters },
        },
      },
    },
    loading: false,
  });
  expect(readFilters()).toEqual({ treeFilters: filters, loading: false });
});
