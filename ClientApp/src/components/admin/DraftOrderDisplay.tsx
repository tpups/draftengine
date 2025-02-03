import React from 'react';
import { 
  Box, 
  Paper, 
  Typography,
  List,
  ListItem,
  Divider
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { Draft, Manager } from '../../types/models';
import { useQuery } from '@tanstack/react-query';
import { managerService } from '../../services/managerService';
import { draftService } from '../../services/draftService';

export const DraftOrderDisplay: React.FC = () => {
  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const { data: activeDraftResponse } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
  });

  const managers = managersResponse?.value ?? [];
  const activeDraft = activeDraftResponse?.value;

  const getManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager?.name ?? '';
  };

  if (!activeDraft) return null;

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Draft Order
      </Typography>

      <List sx={{ mt: 2 }}>
        {activeDraft.draftOrder.map((position, index) => {
          const managerName = getManagerName(position.managerId);
          return (
            <ListItem 
              key={position.pickNumber}
              sx={{ 
                py: 0.5,
                display: 'flex',
                gap: 2,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Typography sx={{ minWidth: 60 }} color="text.secondary">
                Pick {position.pickNumber}:
              </Typography>
              <Typography>
                {managerName}
              </Typography>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
};
