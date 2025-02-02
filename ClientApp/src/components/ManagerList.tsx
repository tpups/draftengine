import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Checkbox, FormControlLabel, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { managerService } from '../services/managerService';
import { Manager } from '../types/models';
import { useState } from 'react';

export function ManagerList() {
  const initialManagerState: Omit<Manager, 'id'> = {
    name: '',
    teamName: '',
    email: '',
    isUser: false
  };

  const [editManager, setEditManager] = useState<Manager | null>(null);

  // All hooks at the top level
  const [open, setOpen] = useState(false);
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
      setOpen(false);
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
      setOpen(false);
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
    setOpen(false);
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
    <Dialog open={open} onClose={handleClose}>
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
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
      height: 'calc(100vh - 200px)', // Adjust for AppBar and padding
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2 
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        width: '100%'
      }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
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
      <DataGrid
        rows={sortManagers(managers)}
        autoHeight={false}
        getRowClassName={(params) => params.row.isUser ? 'user-manager-row' : ''}
        sx={{
          width: '100%',
          flex: 1,
          '& .MuiDataGrid-main': {
            width: '100%'
          },
          '& .user-manager-row': {
            bgcolor: 'primary.light',
            '&:hover': {
              bgcolor: 'primary.light',
            }
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
                  color: 'primary.main',
                  '&:hover': {
                    transform: 'scale(1.2)',
                    transition: 'transform 0.2s'
                  }
                }} />}
                label="Edit"
                onClick={() => {
                  setEditManager(params.row);
                  setOpen(true);
                }}
                title="Edit this manager"
              />,
              <GridActionsCellItem
                icon={<DeleteIcon sx={{ 
                  color: 'error.main',
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
