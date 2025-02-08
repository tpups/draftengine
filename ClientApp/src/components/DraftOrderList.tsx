import React from 'react';
import { Box, Typography, List, ListItem, Paper, IconButton, Stack, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Manager } from '../types/models';

interface DraftOrderListProps {
  managers: Manager[];
  selectedManagers: string[];
  onOrderChange: (newOrder: string[]) => void;
  maxSlots?: number;
}

export const DraftOrderList: React.FC<DraftOrderListProps> = ({
  managers,
  selectedManagers,
  onOrderChange,
  maxSlots = 5,
}) => {
  const muiTheme = useMuiTheme();
  const { theme, mode } = useTheme();
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState<number | null>(null);

  const handleDragStart = (event: React.DragEvent, managerId: string) => {
    event.dataTransfer.setData('text/plain', managerId);
    setDraggedId(managerId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setIsDraggingOver(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDragEnter = (index: number) => {
    setIsDraggingOver(index);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(null);
  };

  const handleDrop = (event: React.DragEvent, slotIndex: number) => {
    event.preventDefault();
    setIsDraggingOver(null);
    const draggedId = event.dataTransfer.getData('text/plain');
    
    if (!draggedId) return;

    const newOrder = [...selectedManagers];
    const draggedIndex = newOrder.indexOf(draggedId);

    if (draggedIndex === -1) {
      // Insert new manager at slot
      newOrder.splice(slotIndex, 0, draggedId);
      // Remove any managers that exceed maxSlots
      if (newOrder.length > maxSlots) {
        newOrder.length = maxSlots;
      }
    } else {
      // Reorder existing manager
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(slotIndex, 0, draggedId);
    }

    onOrderChange(newOrder);
  };

  const handleRemoveManager = (index: number) => {
    const newOrder = [...selectedManagers];
    newOrder.splice(index, 1);
    onOrderChange(newOrder);
  };

  const handleAddManager = (managerId: string) => {
    if (selectedManagers.length >= maxSlots) return;

    const newOrder = [...selectedManagers];
    newOrder.push(managerId);
    onOrderChange(newOrder);
  };

  const handleMoveManager = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...selectedManagers];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    
    const [removed] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, removed);
    onOrderChange(newOrder);
  };

  const availableManagers = managers.filter(
    manager => !selectedManagers.includes(manager.id || '')
  );

  const listItemSx = {
    height: '72px',
    p: 2,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '&:last-child': {
      borderBottom: 'none',
    },
  };

  return (
    <Box sx={{ display: 'flex', gap: 4, height: 500 }}>
      {/* Left Column - Available Managers */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" gutterBottom>
          Available Managers
        </Typography>
        <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <List sx={{ p: 0, flex: 1, overflow: 'auto' }}>
            {availableManagers.map(manager => (
              <ListItem
                key={manager.id}
                draggable
                onDragStart={(e) => handleDragStart(e, manager.id || '')}
                onDragEnd={handleDragEnd}
                sx={{
                  ...listItemSx,
                  cursor: 'move',
                  opacity: draggedId === manager.id ? 0.5 : 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DragIndicatorIcon sx={{ color: 'action.active' }} />
                  <Typography>{manager.name}</Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleAddManager(manager.id || '')}
                  disabled={selectedManagers.length >= maxSlots}
                >
                  <ArrowForwardIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      {/* Right Column - Draft Order */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" gutterBottom>
          Draft Order
        </Typography>
        <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <List sx={{ p: 0, flex: 1, overflow: 'auto' }}>
            {Array.from({ length: maxSlots }, (_, index) => {
              const manager = managers.find(m => m.id === selectedManagers[index]);
              const isOccupied = !!manager;

              return (
                <ListItem
                  key={index}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  sx={{
                    ...listItemSx,
                    bgcolor: isDraggingOver === index ? 'action.hover' : 'inherit',
                    transition: 'all 0.2s ease',
                    border: isDraggingOver === index ? '2px dashed' : 'none',
                    borderColor: isDraggingOver === index ? theme.colors.pickState.selected : undefined,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {isOccupied && (
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveManager(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveManager(index, 'down')}
                          disabled={index === selectedManagers.length - 1}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                    <Typography sx={{ minWidth: 60, color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark }}>
                      Pick {index + 1}:
                    </Typography>
                    {isOccupied ? (
                      <>
                        <Typography sx={{ flex: 1 }}>{manager.name}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveManager(index)}
                        >
                          <CloseIcon />
                        </IconButton>
                      </>
                    ) : (
                      <Typography color="text.secondary">Empty</Typography>
                    )}
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      </Box>
    </Box>
  );
};
