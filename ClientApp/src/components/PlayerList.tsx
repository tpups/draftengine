import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridActionsCellItem, GridRowParams, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import GavelIcon from '@mui/icons-material/Gavel';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { playerService } from '../services/playerService';
import { draftService } from '../services/draftService';
import { Player, Manager } from '../types/models';
import { useState, useCallback, useMemo } from 'react';
import { PlayerDetailsModal } from './PlayerDetailsModal';
import { DraftPlayerModal } from './DraftPlayerModal';
import { PlayerEditModal } from './PlayerEditModal';
import { managerService } from '../services/managerService';
import { calculatePreciseAge, calculateBaseballAge, CURRENT_BASEBALL_SEASON } from '../utils/dateUtils';

// Define the grid row type
interface GridPlayer {
  id?: string;
  name: string;
  position: string;
  mlbTeam?: string;
  level?: string;
  rank: number | null;
  age: number | null;
  draftingManagerName: string;
  isDrafted?: boolean;
  draftRound?: number | null;
  draftPick?: number | null;
  draftedBy?: string | null;
  isHighlighted?: boolean;
  notes?: string | null;
  personalRank?: number | null;
  starsRating?: number | null;
}

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

  const queryClient = useQueryClient();

  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const { data: activeDraftResponse } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
    enabled: gridMode === 'draft'
  });

  const { data: currentPickResponse } = useQuery({
    queryKey: ['currentPick'],
    queryFn: () => draftService.getCurrentPick(),
    enabled: !!activeDraftResponse?.value
  });

  const currentUser = useMemo(() => 
    managersResponse?.value?.find((m: Manager) => m.isUser), 
    [managersResponse?.value]
  );

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['players'],
    queryFn: () => playerService.getAll(),
  });

  const players = response?.value ?? [];
  const managers = managersResponse?.value ?? [];
  const activeDraft = activeDraftResponse?.value;
  const currentPick = currentPickResponse?.value;

  const getCurrentPickManager = useCallback(() => {
    if (!activeDraft || !currentPick) return null;

    const round = activeDraft.rounds.find(r => r.roundNumber === currentPick.round);
    if (!round) return null;

    const pick = round.picks.find(p => p.pickNumber === currentPick.pick);
    return pick ? managers.find(m => m.id === pick.managerId) : null;
  }, [activeDraft, currentPick, managers]);

  const canDraft = useCallback((playerId: string) => {
    if (!activeDraft || !currentPick || !currentUser) return false;
    
    const currentManager = getCurrentPickManager();
    return currentManager?.id === currentUser.id;
  }, [activeDraft, currentPick, currentUser, getCurrentPickManager]);

  const gridData: GridPlayer[] = players.map(player => {
    const draftingManager = player.draftedBy 
      ? managers.find((m: Manager) => m.id === player.draftedBy)
      : null;

    return {
      id: player.id,
      name: player.name,
      mlbTeam: player.mlbTeam,
      level: player.level,
      rank: player.rank?.['steamer_2025'] || null,
      age: calculateBaseballAge(player.birthDate, CURRENT_BASEBALL_SEASON),
      position: player.position?.join(', ') || '',
      draftingManagerName: draftingManager?.name ?? '',
      isDrafted: player.isDrafted,
      draftRound: player.draftRound,
      draftPick: player.draftPick,
      draftedBy: player.draftedBy,
      isHighlighted: player.isHighlighted,
      notes: player.notes,
      personalRank: player.personalRank,
      starsRating: player.starsRating
    };
  });

  const getRowClassName = (params: GridRowParams<GridPlayer>) => {
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

  const handleDraft = async (managerId: string) => {
    if (!selectedPlayerId || !activeDraft || !currentPick) return;

    try {
      await Promise.all([
        draftService.markPickComplete(activeDraft.id!, {
          roundNumber: currentPick.round,
          managerId
        }),
        playerService.markAsDrafted(selectedPlayerId, {
          draftedBy: managerId,
          round: currentPick.round,
          pick: currentPick.pick
        })
      ]);

  queryClient.invalidateQueries({ queryKey: ['activeDraft'] });
  queryClient.invalidateQueries({ queryKey: ['currentPick'] });
  queryClient.invalidateQueries({ queryKey: ['players'] });
      setDraftModalOpen(false);
      setSelectedPlayerId(null);
      setSnackbar({ open: true, message: 'Player drafted successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error drafting player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const handleEdit = (gridPlayer: GridPlayer) => {
    // Convert grid data back to Player format
    const player: Player = {
      ...gridPlayer,
      position: gridPlayer.position.split(', ').filter(Boolean),
      rank: gridPlayer.rank ? { 'steamer_2025': gridPlayer.rank } : {}
    };
    setSelectedPlayer(player);
    setEditModalOpen(true);
  };

  const handlePlayerClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setDetailsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setDetailsModalOpen(false);
    setSelectedPlayer(null);
  }, []);

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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        await playerService.delete(id);
        queryClient.invalidateQueries({ queryKey: ['players'] });
        setSnackbar({ open: true, message: 'Player deleted successfully', severity: 'success' });
      } catch (error) {
        setSnackbar({ 
          open: true, 
          message: `Error deleting player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          severity: 'error' 
        });
      }
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

  const handleResetDraft = async () => {
    if (!activeDraft) return;
    
    if (window.confirm('Are you sure you want to reset all draft status? This cannot be undone.')) {
      try {
        await draftService.resetDraft(activeDraft.id!);
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] });
        queryClient.invalidateQueries({ queryKey: ['currentPick'] });
        queryClient.invalidateQueries({ queryKey: ['players'] });
        setSnackbar({ open: true, message: 'Draft status reset successfully', severity: 'success' });
      } catch (error) {
        setSnackbar({ 
          open: true, 
          message: `Error resetting draft status: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          severity: 'error' 
        });
      }
    }
  };

  const renderAddPlayerDialog = () => (
    <Dialog open={open} onClose={() => setOpen(false)}>
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
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button 
          onClick={() => {
            playerService.create(newPlayer).then(() => {
              queryClient.invalidateQueries({ queryKey: ['players'] });
              setOpen(false);
              setNewPlayer(initialPlayerState);
              setSnackbar({ open: true, message: 'Player created successfully', severity: 'success' });
            }).catch((error) => {
              setSnackbar({ 
                open: true, 
                message: `Error creating player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
                severity: 'error' 
              });
            });
          }}
          variant="contained" 
          disabled={!newPlayer.name}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );

  const columns: GridColDef<GridPlayer>[] = [
    {
      field: 'rank',
      headerName: 'Rank',
      width: 80,
      type: 'number' as const
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params: GridRenderCellParams<GridPlayer>) => (
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
          {params.row.name}
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
      type: 'number' as const
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
      getActions: (params: GridRowParams<GridPlayer>) => {
        if (gridMode === 'draft') {
          if (!params.row.isDrafted) {
            const canMakePick = canDraft(params.row.id!);
            return [
              <GridActionsCellItem
                icon={<GavelIcon sx={{ 
                  color: canMakePick ? 'primary.main' : 'text.disabled',
                  '&:hover': canMakePick ? {
                    transform: 'scale(1.2)',
                    transition: 'transform 0.2s'
                  } : {}
                }} />}
                disabled={!canMakePick}
                onClick={() => {
                  setSelectedPlayerId(params.row.id!.toString());
                  setDraftModalOpen(true);
                }}
                label="Draft"
                title={canMakePick ? "Draft this player" : "Not your pick"}
              />
            ];
          }
          return [];
        }

        return [
          <GridActionsCellItem
            icon={params.row.isHighlighted ? (
              <StarIcon sx={{ 
                color: 'warning.main',
                '&:hover': {
                  transform: 'scale(1.2)',
                  transition: 'transform 0.2s'
                }
              }} />
            ) : (
              <StarBorderIcon sx={{ 
                color: 'warning.main',
                '&:hover': {
                  transform: 'scale(1.2)',
                  transition: 'transform 0.2s'
                }
              }} />
            )}
            label="Toggle Highlight"
            onClick={() => handleToggleHighlight(params.row.id!.toString())}
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
            onClick={() => handleDelete(params.row.id!.toString())}
            title="Delete this player"
          />
        ];
      }
    },
    ...(gridMode === 'draft' ? [
      {
        field: 'draftRound',
        headerName: 'Round',
        width: 80,
      type: 'number' as const
      },
      {
        field: 'draftPick',
        headerName: 'Pick',
        width: 80,
      type: 'number' as const
      },
      {
        field: 'draftingManagerName',
        headerName: 'Drafted By',
        width: 150,
      }
    ] : [])
  ];

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
      height: 'calc(100vh - 200px)',
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2 
    }}>
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
          {gridMode === 'draft' && currentPick && (
            <Typography variant="subtitle1" sx={{ ml: 2, display: 'inline' }}>
              Round {currentPick.round}, Pick {currentPick.pick}
              {getCurrentPickManager()?.name && ` - ${getCurrentPickManager()?.name}'s Pick`}
            </Typography>
          )}
        </Box>
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
        columns={columns}
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
