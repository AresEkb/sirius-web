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
import { IconOverlay, KeyBinding, useSelection } from '@eclipse-sirius/sirius-components-core';
import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import { makeStyles } from 'tss-react/mui';
import { DefaultMenuItemProps } from './DefaultMenuItem.types';
import { useInvokeContextMenuEntry } from './useInvokeContextMenuEntry';
import { GQLInvokeSingleClickTreeItemContextMenuEntrySuccessPayload } from './useInvokeSingleClickContextMenuEntry.types';

const useDefaultMenuItemStyle = makeStyles()((theme) => ({
  entryLabelItem: {
    marginRight: theme.spacing(1),
  },
}));

export const DefaultMenuItem = ({
  editingContextId,
  treeId,
  item,
  entry,
  readOnly,
  selectTreeItems,
  expandTreeItems,
  onClick,
}: DefaultMenuItemProps) => {
  const { classes } = useDefaultMenuItemStyle();
  const { invokeContextMenuEntry } = useInvokeContextMenuEntry();
  const { setSelection } = useSelection();

  // When the executor asks to reveal and select the tree items it created (for
  // example a folder it just grouped), expand the requested items and select the
  // new ones so they are immediately visible and configurable.
  const onSuccess = (payload: GQLInvokeSingleClickTreeItemContextMenuEntrySuccessPayload) => {
    if (payload.treeItemIdsToExpand.length > 0) {
      expandTreeItems(payload.treeItemIdsToExpand);
    }
    if (payload.newSelection && payload.newSelection.entries.length > 0) {
      const entries = payload.newSelection.entries.map((selectionEntry) => ({ id: selectionEntry.id }));
      setSelection({ entries });
      selectTreeItems(entries.map((selectionEntry) => selectionEntry.id));
    }
  };

  return (
    <MenuItem
      onClick={() => invokeContextMenuEntry(editingContextId, treeId, item.id, entry, onClick, onSuccess)}
      data-testid={`context-menu-entry-${entry.label}`}
      disabled={readOnly}>
      <ListItemIcon>
        {entry.iconURL.length > 0 ? (
          <IconOverlay iconURLs={entry.iconURL} alt={entry.label} title={entry.label} />
        ) : (
          <Box sx={(theme) => ({ marginRight: `${theme.spacing(2)}px` })} />
        )}
      </ListItemIcon>
      <ListItemText primary={entry.label} className={entry.keyBindings[0] ? classes.entryLabelItem : ''} />
      {entry.keyBindings[0] ? (
        <KeyBinding keyBinding={entry.keyBindings[0]} data-testid={`key-binding-${entry.label}`} />
      ) : null}
    </MenuItem>
  );
};
