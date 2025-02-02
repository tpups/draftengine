import React from 'react';
import { 
  Paper, 
  Typography
} from '@mui/material';
import { ManagerList } from '../ManagerList';

export const ManagerSection: React.FC = () => {
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Managers
      </Typography>
      <ManagerList />
    </Paper>
  );
};
