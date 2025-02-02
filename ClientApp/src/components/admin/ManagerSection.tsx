import React, { useState } from 'react';
import { 
  Paper, 
  Typography,
  Box,
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ManagerList } from '../ManagerList';
import { useQuery } from '@tanstack/react-query';
import { managerService } from '../../services/managerService';

export const ManagerSection: React.FC = () => {
  const { data: response } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const managerCount = response?.value?.length ?? 0;

  return (
    <Paper sx={{ p: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2,
        gap: 2
      }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Managers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          {managerCount} manager{managerCount !== 1 ? 's' : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s'
            }
          }}
        >
          Add Manager
        </Button>
      </Box>
      <ManagerList 
        dialogOpen={dialogOpen}
        onDialogClose={() => setDialogOpen(false)}
      />
    </Paper>
  );
};
