import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Checkbox, FormControlLabel, Typography, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { managerService } from '../services/managerService';
import { Manager } from '../types/models';
import { useState } from 'react';

interface ManagerListProps {
  dialogOpen: boolean;
  onDialogClose: () => void;
}

export function ManagerList({ dialogOpen, onDialogClose }: ManagerListProps) {
  const muiTheme = useMuiTheme();
  const { theme, mode } = useTheme();
  const initialManagerState: Omit<Manager, 'id'> = {
    name: '',
    teamName: '',
    email: '',
    isUser: false
  };

  const [editManager, setEditManager] = useState<Manager | null>(null);
  const [newManager, setNewManager] = useState<Omit<Manager, 'id'>>(initialManagerState);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const queryClient = useQueryClient();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const hasUserManager = response?.value?.some(m => m.isUser) ?? false;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      setSnackbar({ open: true, message: 'Manager deleted successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: `Error deleting manager: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (manager: Manager) => managerService.update(manager.id!, manager),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      onDialogClose();
      setEditManager(null);
      setSnackbar({ open: true, message: 'Manager updated successfully', severity: 'success' });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      const apiError = errorMessage.includes('Bad Request') 
        ? JSON.parse(errorMessage.split('Bad Request: ')[1]).error
        : errorMessage;
      setSnackbar({ 
        open: true, 
        message: apiError,
        severity: 'error' 
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: (manager: Omit<Manager, 'id'>) => managerService.create(manager),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      onDialogClose();
      setNewManager(initialManagerState);
      setSnackbar({ open: true, message: 'Manager created successfully', severity: 'success' });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      const apiError = errorMessage.includes('Bad Request') 
        ? JSON.parse(errorMessage.split('Bad Request: ')[1]).error
        : errorMessage;
      setSnackbar({ 
        open: true, 
        message: apiError,
        severity: 'error' 
      });
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this manager?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    createMutation.mutate(newManager);
  };

  const handleUpdate = () => {
    if (editManager) {
      updateMutation.mutate(editManager);
    }
  };

  const handleClose = () => {
    onDialogClose();
    setNewManager(initialManagerState);
    setEditManager(null);
  };

  const managers = response?.value ?? [];

  const sortManagers = (managers: Manager[]) => {
    return [...managers].sort((a, b) => {
      if (a.isUser && !b.isUser) return -1;
      if (!a.isUser && b.isUser) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const renderManagerDialog = () => (
    <Dialog open={dialogOpen} onClose={handleClose}>
      <DialogTitle>{editManager ? 'Edit Manager' : 'Add New Manager'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Name"
            value={editManager?.name ?? newManager.name}
            onChange={(e) => editManager 
              ? setEditManager({ ...editManager, name: e.target.value })
              : setNewManager({ ...newManager, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Team Name"
            value={editManager?.teamName ?? newManager.teamName}
            onChange={(e) => editManager
              ? setEditManager({ ...editManager, teamName: e.target.value })
              : setNewManager({ ...newManager, teamName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Email"
            value={editManager?.email ?? newManager.email}
            onChange={(e) => editManager
              ? setEditManager({ ...editManager, email: e.target.value })
              : setNewManager({ ...newManager, email: e.target.value })}
            fullWidth
            type="email"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editManager?.isUser ?? newManager.isUser}
                onChange={(e) => editManager
                  ? setEditManager({ ...editManager, isUser: e.target.checked })
                  : setNewManager({ ...newManager, isUser: e.target.checked })}
                disabled={hasUserManager && !(editManager?.isUser ?? newManager.isUser)}
              />
            }
            label="Is Current User"
          />
          {hasUserManager && !newManager.isUser && (
            <Typography variant="caption" color="text.secondary">
              A user manager already exists. Only one manager can be marked as the current user.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={editManager ? handleUpdate : handleCreate}
          variant="contained" 
          disabled={!(editManager?.name ?? newManager.name)}
        >
          {editManager ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error">
        Error loading managers: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  // Render empty state
  if (!managers || managers.length === 0) {
    return (
      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <Alert severity="info">No managers available</Alert>
        </Box>
        {renderManagerDialog()}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    );
  }

  // Render data grid
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2 
    }}>
      <DataGrid
        rows={sortManagers(managers)}
        autoHeight={false}
        hideFooter={true}
        disableVirtualization={false}
        getRowClassName={(params) => params.row.isUser ? 'user-manager-row' : ''}
        sx={{
          width: '100%',
          flex: 1,
          bgcolor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
          '& .MuiDataGrid-main': {
            width: '100%'
          },
          '& .MuiDataGrid-cell': {
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
          },
          '& .MuiDataGrid-columnHeader': {
            fontSize: '1rem',
            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark,
            borderBottom: `1px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.text.disabled.dark}`
          },
          '& .MuiDataGrid-row': {
            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
            '&:hover': {
              backgroundColor: mode === 'light' ? theme.colors.action.hover.light : theme.colors.action.hover.dark
            }
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.3rem'
          },
          '& .user-manager-row': {
            bgcolor: mode === 'light' ? theme.colors.pickState.active.light : theme.colors.pickState.active.dark,
            '& .MuiDataGrid-cell': {
              color: theme.colors.text.primary.light
            },
            '&:hover': {
              bgcolor: mode === 'light' ? theme.colors.pickState.active.light : theme.colors.pickState.active.dark,
            }
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: `1px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.text.disabled.dark}`,
            backgroundColor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark
          }
        }}
        columns={[
          {
            field: 'name',
            headerName: 'Name',
            width: 200
          },
          {
            field: 'teamName',
            headerName: 'Team',
            width: 150
          },
          {
            field: 'email',
            headerName: 'Email',
            width: 200
          },
          {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            getActions: (params) => [
              <GridActionsCellItem
                icon={<EditIcon sx={{ 
                  color: mode === 'light' ? theme.colors.pickState.current.light : theme.colors.pickState.current.dark,
                  '&:hover': {
                    transform: 'scale(1.2)',
                    transition: 'transform 0.2s'
                  }
                }} />}
                label="Edit"
                onClick={() => {
                  setEditManager(params.row);
                  onDialogClose(); // Close any existing dialog first
                  setTimeout(() => onDialogClose(), 0); // Then open with edit mode
                }}
                title="Edit this manager"
              />,
              <GridActionsCellItem
                icon={<DeleteIcon sx={{ 
                  color: mode === 'light' ? theme.colors.pickState.selected.light : theme.colors.pickState.selected.dark,
                  '&:hover': {
                    transform: 'scale(1.2)',
                    transition: 'transform 0.2s'
                  }
                }} />}
                label="Delete"
                onClick={() => handleDelete(params.id.toString())}
                title="Delete this manager"
              />
            ]
          }
        ]}
      />
      {renderManagerDialog()}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
