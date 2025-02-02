import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, ToggleButtonGroup, ToggleButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import GavelIcon from '@mui/icons-material/Gavel';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { playerService } from '../services/playerService';
import { Player } from '../types/models';
import { useState, useCallback, useMemo } from 'react';
import { PlayerDetailsModal } from './PlayerDetailsModal';
import { DraftPlayerModal } from './DraftPlayerModal';
import { PlayerEditModal } from './PlayerEditModal';
import { managerService } from '../services/managerService';
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<'prep' | 'draft'>('prep');

  const handlePlayerClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setDetailsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setDetailsModalOpen(false);
    setSelectedPlayer(null);
  }, []);

  const queryClient = useQueryClient();

  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const currentUser = useMemo(() => 
    managersResponse?.value?.find(m => m.isUser), 
    [managersResponse?.value]
  );

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

  const resetDraftMutation = useMutation({
    mutationFn: playerService.resetDraftStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setSnackbar({ open: true, message: 'Draft status reset successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: `Error resetting draft status: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  });

  const draftMutation = useMutation({
    mutationFn: ({ playerId, managerId }: { playerId: string; managerId: string }) => 
      playerService.markAsDrafted(playerId, { draftedBy: managerId, round: 0, pick: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setDraftModalOpen(false);
      setSelectedPlayerId(null);
      setSnackbar({ open: true, message: 'Player drafted successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: `Error drafting player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  });

  const handleDraft = (managerId: string) => {
    if (selectedPlayerId) {
      draftMutation.mutate({ playerId: selectedPlayerId, managerId });
    }
  };

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
  const managers = managersResponse?.value ?? [];
  const gridData = players.map(player => {
    const draftingManager = player.draftedBy 
      ? managers.find(m => m.id === player.draftedBy)
      : null;

    return {
      ...player,
      id: player.id,
      name: player.name,
      mlbTeam: player.mlbTeam,
      level: player.level,
      rank: player.rank?.['steamer_2025'] || null,
      age: calculateBaseballAge(player.birthDate, CURRENT_BASEBALL_SEASON),
      position: player.position?.join(', ') || '',
      draftingManagerName: draftingManager?.name ?? ''
    };
  });

  const getRowClassName = (params: any) => {
    const classes: string[] = [];
    
    if (params.row.isHighlighted) {
      classes.push('highlighted');
    }
    
    if (params.row.isDrafted) {
      if (params.row.draftedBy === currentUser?.id) {
        classes.push('drafted-by-user');
      } else {
        classes.push('drafted-by-other');
      }
    }
    
    return classes.join(' ');
  };

  const handleResetDraft = () => {
    if (window.confirm('Are you sure you want to reset all draft status? This cannot be undone.')) {
      resetDraftMutation.mutate();
    }
  };

  const renderModeToggle = () => (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <ToggleButtonGroup
        value={gridMode}
        exclusive
        onChange={(_, newMode) => {
          if (newMode !== null) {
            setGridMode(newMode);
          }
        }}
        aria-label="grid mode"
      >
        <ToggleButton value="prep" aria-label="prep mode">
          Prep Mode
        </ToggleButton>
        <ToggleButton value="draft" aria-label="draft mode">
          Draft Mode
        </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {gridMode === 'draft' && (
        <Button
          variant="outlined"
          color="warning"
          onClick={handleResetDraft}
          sx={{
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s'
            }
          }}
        >
          Reset Draft Status
        </Button>
      )}
    </Box>
  );

  const handleEdit = (gridPlayer: any) => {
    // Convert grid data back to Player format
    const player: Player = {
      ...gridPlayer,
      position: gridPlayer.position ? gridPlayer.position.split(', ') : []
    };
    setSelectedPlayer(player);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedPlayer: Player) => {
    try {
      const response = await playerService.update(updatedPlayer.id!, updatedPlayer);
      if (response?.value) {
        queryClient.invalidateQueries({ queryKey: ['players'] });
        setEditModalOpen(false);
        setSelectedPlayer(null);
        setSnackbar({ open: true, message: 'Player updated successfully', severity: 'success' });
      } else {
        throw new Error('Failed to update player');
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error updating player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const handleToggleHighlight = async (id: string) => {
    try {
      await playerService.toggleHighlight(id);
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setSnackbar({ open: true, message: 'Highlight status updated', severity: 'success' });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error updating highlight status: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const renderActionButtons = (params: any) => {
    if (gridMode === 'prep') {
      return [
        <GridActionsCellItem
          icon={params.row.isHighlighted ? (
            <StarIcon 
              sx={{ 
                color: 'warning.main',
                '&:hover': {
                  transform: 'scale(1.2)',
                  transition: 'transform 0.2s'
                }
              }}
            />
          ) : (
            <StarBorderIcon 
              sx={{ 
                color: 'warning.main',
                '&:hover': {
                  transform: 'scale(1.2)',
                  transition: 'transform 0.2s'
                }
              }}
            />
          )}
          label="Toggle Highlight"
          onClick={() => handleToggleHighlight(params.id.toString())}
          title="Toggle highlight status"
        />,
        <GridActionsCellItem
          icon={<EditIcon sx={{ 
            color: 'primary.main',
            '&:hover': {
              transform: 'scale(1.2)',
              transition: 'transform 0.2s'
            }
          }} />}
          label="Edit"
          onClick={() => handleEdit(params.row)}
          title="Edit this player"
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
          title="Delete this player"
        />
      ];
    }

    if (!params.row.isDrafted) {
      return [
        <GridActionsCellItem
          icon={<GavelIcon sx={{ 
            color: 'primary.main',
            '&:hover': {
              transform: 'scale(1.2)',
              transition: 'transform 0.2s'
            }
          }} />}
          label="Draft"
          onClick={() => {
            setSelectedPlayerId(params.id.toString());
            setDraftModalOpen(true);
          }}
          title="Draft this player"
        />
      ];
    }

    return [];
  };

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
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={gridMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) {
                setGridMode(newMode);
              }
            }}
            aria-label="grid mode"
          >
            <ToggleButton value="prep" aria-label="prep mode">
              Prep Mode
            </ToggleButton>
            <ToggleButton value="draft" aria-label="draft mode">
              Draft Mode
            </ToggleButton>
          </ToggleButtonGroup>
          <Box>
            {gridMode === 'prep' ? (
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
            ) : (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleResetDraft}
                sx={{
                  '&:hover': {
                    transform: 'scale(1.05)',
                    transition: 'transform 0.2s'
                  }
                }}
              >
                Reset Draft Status
              </Button>
            )}
          </Box>
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
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={gridMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) {
              setGridMode(newMode);
            }
          }}
          aria-label="grid mode"
        >
          <ToggleButton value="prep" aria-label="prep mode">
            Prep Mode
          </ToggleButton>
          <ToggleButton value="draft" aria-label="draft mode">
            Draft Mode
          </ToggleButton>
        </ToggleButtonGroup>
        <Box>
          {gridMode === 'prep' ? (
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
          ) : (
            <Button
              variant="outlined"
              color="warning"
              onClick={handleResetDraft}
              sx={{
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s'
                }
              }}
            >
              Reset Draft Status
            </Button>
          )}
        </Box>
      </Box>
      <DataGrid
        getRowClassName={getRowClassName}
        rows={gridData}
        autoHeight={false}
        sx={{
          width: '100%',
          flex: 1,
          '& .MuiDataGrid-main': {
            width: '100%'
          },
          '& .highlighted': {
            bgcolor: 'warning.light',
            '&:hover': {
              bgcolor: 'warning.light',
            },
            '&.drafted-by-user': {
              bgcolor: 'success.main',
              '&:hover': {
                bgcolor: 'success.main',
              }
            },
            '&.drafted-by-other': {
              bgcolor: 'warning.main',
              '&:hover': {
                bgcolor: 'warning.main',
              }
            }
          },
          '& .drafted-by-user': {
            bgcolor: 'success.light',
            '&:hover': {
              bgcolor: 'success.light',
            }
          },
          '& .drafted-by-other': {
            bgcolor: 'warning.light',
            '&:hover': {
              bgcolor: 'warning.light',
            }
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
            field: 'age',
            headerName: 'Age',
            width: 80,
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
            getActions: renderActionButtons
          },
          ...(gridMode === 'draft' ? [
            {
              field: 'draftingManagerName',
              headerName: 'Drafted By',
              width: 150,
            }
          ] : [])
        ]}
      />
      <DraftPlayerModal
        open={draftModalOpen}
        onClose={() => {
          setDraftModalOpen(false);
          setSelectedPlayerId(null);
        }}
        onManagerSelect={handleDraft}
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
      <PlayerEditModal
        player={selectedPlayer}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedPlayer(null);
        }}
        onSave={handleSaveEdit}
      />
    </Box>
  );
}
