/*******************************************************************************
 * Copyright (c) 2024, 2026 Obeo.
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

import { IconOverlay } from '@eclipse-sirius/sirius-components-core';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';
import { makeStyles } from 'tss-react/mui';
import { isTool, isToolSection } from '../Palette';
import { GQLPaletteEntry, GQLTool } from '../Palette.types';
import { fuzzyMatch } from './fuzzyMatch';
import { HighlightedLabelProps, PaletteSearchResultProps } from './PaletteSearchResult.types';

const convertToList = (entry: GQLPaletteEntry): GQLTool[] => {
  if (isTool(entry)) {
    return [entry];
  } else if (isToolSection(entry)) {
    return entry.tools.filter(isTool);
  } else {
    return [];
  }
};

const flatToolsFromPaletteEntries = (paletteEntries: GQLPaletteEntry[]): GQLTool[] => {
  return paletteEntries.filter((entry) => isToolSection(entry) || isTool(entry)).flatMap(convertToList);
};

const useLabelStyles = makeStyles()((theme: Theme) => ({
  highlight: {
    backgroundColor: theme.palette.navigation.leftBackground,
  },
  itemText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

const HighlightedLabel = ({ label, textIndicesToHighlight }: HighlightedLabelProps) => {
  const { classes } = useLabelStyles();
  const itemLabel: JSX.Element = (
    <>
      {label.split('').map((value, index) => {
        const shouldHighlight = textIndicesToHighlight.includes(index);
        return (
          <span
            key={value + index}
            data-testid={`${label}-${value}-${index}`}
            className={shouldHighlight ? classes.highlight : ''}>
            {value}
          </span>
        );
      })}
    </>
  );
  return <Typography className={classes.itemText}>{itemLabel}</Typography>;
};

const useStyle = makeStyles()((theme) => ({
  toolListContainer: {
    display: 'grid',
    overflowY: 'auto',
    overflowX: 'hidden',
    gridTemplateColumns: '100%',
  },
  toolList: {
    gridRowStart: 1,
    gridColumnStart: 1,
    width: '100%',
    padding: 0,
  },
  listItemText: {
    '& .MuiListItemText-primary': {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  },
  listItemButton: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  listItemIcon: {
    minWidth: 0,
    marginRight: theme.spacing(2),
  },
}));
export const PaletteSearchResult = ({ palette, onToolClick, searchToolValue }: PaletteSearchResultProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowHeight = 32;
  const viewportHeight = 280;
  const overscan = 4;
  const { classes } = useStyle();

  const toolList: GQLTool[] = useMemo(() => flatToolsFromPaletteEntries(palette.paletteEntries), [palette]);

  const filteredToolList = useMemo(
    () => toolList.filter((tool) => fuzzyMatch(tool.label, searchToolValue).matches),
    [toolList, searchToolValue]
  );

  const firstVisible = Math.max(0, Math.min(Math.floor(scrollTop / rowHeight) - overscan, filteredToolList.length - 1));
  const endVisible = Math.min(
    filteredToolList.length,
    Math.max(firstVisible, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan)
  );

  useEffect(() => {
    setSelectedIndex(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [filteredToolList]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const top = selectedIndex * rowHeight;
    const height = element.clientHeight || viewportHeight;
    if (top < element.scrollTop) {
      element.scrollTop = top;
    } else if (top + rowHeight > element.scrollTop + height) {
      element.scrollTop = top + rowHeight - height;
    }
    setScrollTop(element.scrollTop);
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (filteredToolList.length === 0) {
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev === 0 ? filteredToolList.length - 1 : prev - 1));
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev === filteredToolList.length - 1 ? 0 : prev + 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        // Execute the tool
        const selectedTool = filteredToolList[selectedIndex];
        if (selectedTool) {
          onToolClick(selectedTool);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, filteredToolList, onToolClick]);

  const convertToListItem = (tool: GQLTool, index: number): JSX.Element | null => {
    const matchResult = fuzzyMatch(tool.label, searchToolValue);
    return (
      <Tooltip title={tool.label} key={tool.id} placement="right">
        <ListItemButton
          className={classes.listItemButton}
          sx={{ height: rowHeight, minHeight: rowHeight, boxSizing: 'border-box' }}
          onClick={() => onToolClick(tool)}
          selected={index === selectedIndex}>
          <ListItemIcon className={classes.listItemIcon}>
            <IconOverlay iconURLs={tool.iconURL} alt={tool.label} customIconHeight={16} customIconWidth={16} />
          </ListItemIcon>
          <ListItemText
            primary={<HighlightedLabel label={tool.label} textIndicesToHighlight={matchResult.matchingIndices} />}
          />
        </ListItemButton>
      </Tooltip>
    );
  };

  return (
    <Box
      className={classes.toolListContainer}
      ref={scrollRef}
      sx={{ minHeight: 0, maxHeight: viewportHeight }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      {filteredToolList.length > 0 ? (
        <List className={classes.toolList} component="nav">
          <div aria-hidden="true" style={{ height: firstVisible * rowHeight }} />
          {filteredToolList
            .slice(firstVisible, endVisible)
            .map((tool, index) => convertToListItem(tool, firstVisible + index))}
          <div aria-hidden="true" style={{ height: (filteredToolList.length - endVisible) * rowHeight }} />
        </List>
      ) : (
        <Typography variant="body2" align="center">
          No result
        </Typography>
      )}
    </Box>
  );
};
