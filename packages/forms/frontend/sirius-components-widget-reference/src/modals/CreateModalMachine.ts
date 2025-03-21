/*******************************************************************************
 * Copyright (c) 2023, 2025 Obeo.
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

import { GQLTreeItem } from '@eclipse-sirius/sirius-components-trees';
import { assign, Machine } from 'xstate';
import {
  ChildCreationDescription,
  Domain,
  GQLCreateElementInReferenceMutationData,
  GQLCreateElementInReferencePayload,
  GQLCreateElementInReferenceSuccessPayload,
  GQLGetChildCreationDescriptionsQueryData,
  GQLGetDomainsQueryData,
  GQLGetRootObjectCreationDescriptionsQueryData,
} from './CreateModal.types';

export interface CreateModalStateSchema {
  states: {
    createModal: {
      states: {
        selectContainmentMode: {};
        selectContainer: {};
        loadingChildCreationDescription: {};
        loadingDomains: {};
        loadingRootObjectCreationDescriptions: {};
        validForChild: {};
        validForRoot: {};
        creatingChild: {};
        creatingRoot: {};
        success: {};
      };
    };
  };
}

export type SchemaValue = {
  createModal:
    | 'selectContainmentMode'
    | 'selectContainer'
    | 'loadingDomains'
    | 'loadingChildCreationDescription'
    | 'loadingRootObjectCreationDescriptions'
    | 'validForChild'
    | 'validForRoot'
    | 'creatingChild'
    | 'creatingRoot'
    | 'success';
};

export interface CreateModalContext {
  domains: Domain[];
  selectedDomainId: string;
  selectedChildCreationDescriptionId: string;
  creationDescriptions: ChildCreationDescription[];
  newObjectId: string | null;
  containerSelected: GQLTreeItem | null;
  containerId: string | null;
  containerKind: string | null;
}

export type FetchedDomainsEvent = { type: 'HANDLE_FETCHED_DOMAINS'; data: GQLGetDomainsQueryData };
export type FetchedChildCreationDescriptionsEvent = {
  type: 'HANDLE_FETCHED_CHILD_CREATION_DESCRIPTIONS';
  data: GQLGetChildCreationDescriptionsQueryData;
};
export type ChangeChildCreationDescriptionEvent = {
  type: 'CHANGE_CHILD_CREATION_DESCRIPTION';
  childCreationDescriptionId: string;
};
export type ChangeContainerSelectionEvent = {
  type: 'CHANGE_CONTAINER';
  container: GQLTreeItem;
};
export type ChangeContainmentModeEvent = {
  type: 'CHANGE_CONTAINMENT_MODE';
  containment: boolean;
  containerId: string | null;
  containerKind: string | null;
};
export type FetchedRootObjectCreationDescriptionsEvent = {
  type: 'HANDLE_FETCHED_ROOT_OBJECT_CREATION_DESCRIPTIONS';
  data: GQLGetRootObjectCreationDescriptionsQueryData;
};
export type ChangeDomainEvent = {
  type: 'CHANGE_DOMAIN';
  domainId: string;
};

export type CreateChildEvent = { type: 'CREATE_CHILD' };
export type CreateRootEvent = { type: 'CREATE_ROOT' };
export type HandleCreateElementResponseEvent = {
  type: 'HANDLE_CREATE_ELEMENT_RESPONSE';
  data: GQLCreateElementInReferenceMutationData;
};

export type CreateModalEvent =
  | FetchedDomainsEvent
  | FetchedRootObjectCreationDescriptionsEvent
  | FetchedChildCreationDescriptionsEvent
  | ChangeContainmentModeEvent
  | ChangeDomainEvent
  | ChangeChildCreationDescriptionEvent
  | CreateChildEvent
  | CreateRootEvent
  | HandleCreateElementResponseEvent
  | ChangeContainerSelectionEvent;

const isCreateElementSuccessPayload = (
  payload: GQLCreateElementInReferencePayload
): payload is GQLCreateElementInReferenceSuccessPayload => {
  return payload.__typename === 'CreateElementInReferenceSuccessPayload';
};

export const createModalMachine = Machine<CreateModalContext, CreateModalStateSchema, CreateModalEvent>(
  {
    id: 'CreateModal',
    type: 'parallel',
    context: {
      domains: [],
      selectedDomainId: '',
      selectedChildCreationDescriptionId: '',
      creationDescriptions: [],
      newObjectId: null,
      containerSelected: null,
      containerId: null,
      containerKind: null,
    },
    states: {
      createModal: {
        initial: 'selectContainmentMode',
        states: {
          selectContainmentMode: {
            on: {
              CHANGE_CONTAINMENT_MODE: [
                {
                  cond: 'isContainmentReference',
                  target: 'loadingChildCreationDescription',
                  actions: 'updateContainment',
                },
                {
                  target: 'selectContainer',
                },
              ],
            },
          },
          selectContainer: {
            on: {
              CHANGE_CONTAINER: [
                {
                  actions: 'updateContainer',
                  cond: 'isRootContainer',
                  target: 'loadingDomains',
                },
                {
                  actions: 'updateContainer',
                  target: 'loadingChildCreationDescription',
                },
              ],
            },
          },
          loadingChildCreationDescription: {
            on: {
              HANDLE_FETCHED_CHILD_CREATION_DESCRIPTIONS: [
                {
                  target: 'validForChild',
                  actions: 'updateChildCreationDescriptions',
                },
              ],
              CHANGE_CONTAINER: [
                {
                  actions: 'updateContainer',
                  cond: 'isRootContainer',
                  target: 'loadingDomains',
                },
                {
                  actions: 'updateContainer',
                  target: 'loadingChildCreationDescription',
                },
              ],
            },
          },
          loadingDomains: {
            on: {
              HANDLE_FETCHED_DOMAINS: [
                {
                  actions: 'updateDomains',
                  target: 'loadingRootObjectCreationDescriptions',
                },
              ],
              CHANGE_CONTAINER: [
                {
                  actions: 'updateContainer',
                  cond: 'isRootContainer',
                  target: 'loadingDomains',
                },
                {
                  actions: 'updateContainer',
                  target: 'loadingChildCreationDescription',
                },
              ],
            },
          },
          loadingRootObjectCreationDescriptions: {
            on: {
              CHANGE_DOMAIN: [
                {
                  actions: 'updateDomain',
                },
              ],
              HANDLE_FETCHED_ROOT_OBJECT_CREATION_DESCRIPTIONS: [
                {
                  target: 'validForRoot',
                  actions: 'updateRootChildCreationDescriptions',
                },
              ],
            },
          },
          validForChild: {
            on: {
              CHANGE_CONTAINER: [
                {
                  actions: 'updateContainer',
                  cond: 'isRootContainer',
                  target: 'loadingDomains',
                },
                {
                  actions: 'updateContainer',
                  target: 'loadingChildCreationDescription',
                },
              ],
              CHANGE_CHILD_CREATION_DESCRIPTION: [
                {
                  actions: 'updateChildCreationDescription',
                },
              ],
              CHANGE_DOMAIN: [
                {
                  actions: 'updateDomain',
                  target: 'loadingRootObjectCreationDescriptions',
                },
              ],
              CREATE_CHILD: [
                {
                  target: 'creatingChild',
                },
              ],
            },
          },
          validForRoot: {
            on: {
              CHANGE_CONTAINER: [
                {
                  actions: 'updateContainer',
                  cond: 'isRootContainer',
                  target: 'loadingDomains',
                },
                {
                  actions: 'updateContainer',
                  target: 'loadingChildCreationDescription',
                },
              ],
              CHANGE_CHILD_CREATION_DESCRIPTION: [
                {
                  actions: 'updateChildCreationDescription',
                },
              ],
              CHANGE_DOMAIN: [
                {
                  actions: 'updateDomain',
                  target: 'loadingRootObjectCreationDescriptions',
                },
              ],
              CREATE_ROOT: [
                {
                  target: 'creatingRoot',
                },
              ],
            },
          },
          creatingChild: {
            on: {
              HANDLE_CREATE_ELEMENT_RESPONSE: [
                {
                  cond: 'isResponseCreateElementSuccessful',
                  target: 'success',
                  actions: 'updateNewElementId',
                },
                {
                  target: 'validForChild',
                },
              ],
            },
          },
          creatingRoot: {
            on: {
              HANDLE_CREATE_ELEMENT_RESPONSE: [
                {
                  cond: 'isResponseCreateElementSuccessful',
                  target: 'success',
                  actions: 'updateNewElementId',
                },
                {
                  target: 'validForRoot',
                },
              ],
            },
          },
          success: {
            type: 'final',
          },
        },
      },
    },
  },
  {
    guards: {
      isResponseCreateElementSuccessful: (_, event) => {
        const { data } = event as HandleCreateElementResponseEvent;
        return data.createElementInReference.__typename === 'CreateElementInReferenceSuccessPayload';
      },
      isContainmentReference: (_, event) => {
        const { containment } = event as ChangeContainmentModeEvent;
        return containment;
      },
      isRootContainer: (_, event) => {
        const { container } = event as ChangeContainerSelectionEvent;
        return container.kind === 'siriusWeb://document';
      },
    },
    actions: {
      updateDomains: assign((_, event) => {
        const { data } = event as FetchedDomainsEvent;
        const { domains } = data.viewer.editingContext;
        const selectedDomainId = domains[0]?.id || '';
        return { domains, selectedDomainId };
      }),
      updateDomain: assign((_, event) => {
        const { domainId } = event as ChangeDomainEvent;
        return { selectedDomainId: domainId };
      }),
      updateChildCreationDescriptions: assign((_, event) => {
        const { data } = event as FetchedChildCreationDescriptionsEvent;
        const { referenceWidgetChildCreationDescriptions } = data.viewer.editingContext;
        const selectedChildCreationDescriptionId = referenceWidgetChildCreationDescriptions[0]?.id || '';
        return { creationDescriptions: referenceWidgetChildCreationDescriptions, selectedChildCreationDescriptionId };
      }),
      updateRootChildCreationDescriptions: assign((_, event) => {
        const { data } = event as FetchedRootObjectCreationDescriptionsEvent;
        const { referenceWidgetRootCreationDescriptions } = data.viewer.editingContext;
        const selectedChildCreationDescriptionId = referenceWidgetRootCreationDescriptions[0]?.id || '';
        return { creationDescriptions: referenceWidgetRootCreationDescriptions, selectedChildCreationDescriptionId };
      }),
      updateChildCreationDescription: assign((_, event) => {
        const { childCreationDescriptionId } = event as ChangeChildCreationDescriptionEvent;
        return { selectedChildCreationDescriptionId: childCreationDescriptionId };
      }),
      updateContainment: assign((_, event) => {
        const { containerKind, containerId } = event as ChangeContainmentModeEvent;
        return {
          containerId: containerId,
          containerKind: containerKind,
        };
      }),
      updateContainer: assign((_, event) => {
        const { container } = event as ChangeContainerSelectionEvent;
        return {
          containerSelected: container,
          containerId: container.id,
          containerKind: container.kind,
        };
      }),
      updateNewElementId: assign((_, event) => {
        const { data } = event as HandleCreateElementResponseEvent;
        if (isCreateElementSuccessPayload(data.createElementInReference)) {
          const { object } = data.createElementInReference;
          return { newObjectId: object.id };
        }
        return {};
      }),
    },
  }
);
