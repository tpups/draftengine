import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { playerService } from '../services/playerService';
import { Player } from '../types/models';
import { useState, useCallback } from 'react';
import { PlayerDetailsModal } from './PlayerDetailsModal';
import { calculatePreciseAge, calculateBaseballAge, CURRENT_BASEBALL_SEASON } from '../utils/dateUtils';

export function PlayerList() {
  const initialPlayerState: Omit<Player, 'id'> = {
    name: '',
    position: [],
    rank: {},
    prospectRank: {},
    mlbTeam: '',
    level: '',
    birthDate: '',
    eta: null,
    prospectRisk: {},
    personalRiskAssessment: '',
    scoutingGrades: {},
    personalGrades: {
      hit: null,
      rawPower: null,
      gamePower: null,
      run: null,
      arm: null,
      field: null,
      fastball: null,
      slider: null,
      curve: null,
      changeup: null,
      control: null,
      command: null
    },
    isDrafted: false,
    draftRound: null,
    draftPick: null,
    draftedBy: null,
    isHighlighted: false,
    notes: null,
    personalRank: null
  };

  // All hooks at the top level
  const [open, setOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState<Omit<Player, 'id'>>(initialPlayerState);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const handlePlayerClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setDetailsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setDetailsModalOpen(false);
    setSelectedPlayer(null);
  }, []);

  const queryClient = useQueryClient();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const data = await playerService.getAll();
      console.log('API Response:', {
        raw: data,
        value: data?.value,
        firstPlayer: data?.value?.[0],
        playerIds: data?.value?.map(p => ({
          id: p.id,
          idType: typeof p.id,
          idLength: p.id?.length
        }))
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: playerService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setSnackbar({ open: true, message: 'Player deleted successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: `Error deleting player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: playerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setOpen(false);
      setNewPlayer(initialPlayerState);
      setSnackbar({ open: true, message: 'Player created successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: `Error creating player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  });

  const handleDelete = (id: string) => {
    console.log('Delete request details:', {
      rawId: id,
      idType: typeof id,
      idLength: id.length,
      idValue: id
    });
    
    if (window.confirm('Are you sure you want to delete this player?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    createMutation.mutate(newPlayer);
  };

  const handleClose = () => {
    setOpen(false);
    setNewPlayer(initialPlayerState);
  };

  const players = response?.value ?? [];
  const gridData = players.map(player => ({
    id: player.id,
    name: player.name,
    mlbTeam: player.mlbTeam,
    level: player.level,
    rank: player.rank?.['steamer_2025'] || null,
    currentAge: calculatePreciseAge(player.birthDate),
    baseballAge: calculateBaseballAge(player.birthDate, CURRENT_BASEBALL_SEASON),
    position: player.position?.join(', ') || ''
  }));

  const renderAddPlayerDialog = () => (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Add New Player</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Name"
            value={newPlayer.name}
            onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Team"
            value={newPlayer.mlbTeam}
            onChange={(e) => setNewPlayer({ ...newPlayer, mlbTeam: e.target.value })}
            fullWidth
          />
          <TextField
            label="Level"
            value={newPlayer.level}
            onChange={(e) => setNewPlayer({ ...newPlayer, level: e.target.value })}
            fullWidth
          />
          <TextField
            label="Birth Date"
            type="date"
            value={newPlayer.birthDate}
            onChange={(e) => setNewPlayer({ ...newPlayer, birthDate: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Position(s)"
            placeholder="e.g., SS, 2B"
            value={newPlayer.position?.join(', ') || ''}
            onChange={(e) => setNewPlayer({ 
              ...newPlayer, 
              position: e.target.value.split(',').map(p => p.trim()).filter(p => p)
            })}
            fullWidth
            helperText="Enter positions separated by commas"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleCreate} 
          variant="contained" 
          disabled={!newPlayer.name}
        >
          Create
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
        Error loading players: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  // Render empty state
  if (!players || players.length === 0) {
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
            Add Player
          </Button>
        </Box>
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <Alert severity="info">No players available</Alert>
        </Box>
        {renderAddPlayerDialog()}
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
            Add Player
          </Button>
      </Box>
      <DataGrid
        rows={gridData}
        autoHeight={false}
        sx={{
          width: '100%',
          flex: 1,
          '& .MuiDataGrid-main': {
            width: '100%'
          }
        }}
        columns={[
          {
            field: 'rank',
            headerName: 'Rank',
            width: 80,
            type: 'number'
          },
          {
            field: 'name',
            headerName: 'Name',
            width: 200,
            renderCell: (params) => (
              <Box
                component="span"
                sx={{
                  cursor: 'pointer',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                onClick={() => {
                  const player = players.find(p => p.id === params.row.id);
                  if (player) {
                    handlePlayerClick(player);
                  }
                }}
              >
                {params.value}
              </Box>
            )
          },
          {
            field: 'position',
            headerName: 'Position',
            width: 120
          },
          {
            field: 'currentAge',
            headerName: 'Age',
            width: 80,
            type: 'number',
            valueFormatter: (params: { value: number | null }) => params.value?.toFixed(1) ?? ''
          },
          {
            field: 'baseballAge',
            headerName: `Baseball Age ${CURRENT_BASEBALL_SEASON}`,
            width: 160,
            type: 'number'
          },
          {
            field: 'mlbTeam',
            headerName: 'Team',
            width: 100
          },
          {
            field: 'level',
            headerName: 'Level',
            width: 100
          },
          {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            getActions: (params) => [
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
                title="Delete this player"
              />
            ]
          }
        ]}
      />
      {renderAddPlayerDialog()}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
      <PlayerDetailsModal
        player={selectedPlayer}
        open={detailsModalOpen}
        onClose={handleCloseModal}
      />
    </Box>
  );
}
