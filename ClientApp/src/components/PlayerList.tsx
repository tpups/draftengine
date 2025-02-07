import { Box, CircularProgress, Alert, Snackbar, Popover } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Player, Manager, ApiResponse, Draft } from '../types/models';
import { PickResponse } from '../services/draftService';
import { playerService } from '../services/playerService';
import { draftService } from '../services/draftService';
import { managerService } from '../services/managerService';
import { config } from '../config/config';

// Helper function to log pick state
const logPickState = (activeDraft: Draft | undefined | null, context: string) => {
  if (!config.debug.enableConsoleLogging) return;

  console.log(`[${context}] Pick State:`, {
    active: activeDraft ? {
      round: activeDraft.activeRound,
      pick: activeDraft.activePick,
      overall: activeDraft.activeOverallPick
    } : null
  });
};
import { DraftPickSelector } from './DraftPickSelector';
import { PlayerListToolbar } from './PlayerListToolbar';
import { PlayerListGrid } from './PlayerListGrid';
import { PlayerListDialogs } from './PlayerListDialogs';

export function PlayerList() {
  // State
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // Initialize gridMode from localStorage or default to 'prep'
  const [gridMode, setGridMode] = useState<'prep' | 'draft'>(() => {
    const savedMode = localStorage.getItem('gridMode');
    return (savedMode === 'draft' || savedMode === 'prep') ? savedMode : 'prep';
  });

  // Update localStorage when gridMode changes
  const handleGridModeChange = (mode: 'prep' | 'draft') => {
    setGridMode(mode);
    localStorage.setItem('gridMode', mode);
  };
  const [pickSelectorAnchor, setPickSelectorAnchor] = useState<HTMLElement | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Queries
  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
    staleTime: 0 // Always refetch after invalidation
  });

  const { data: activeDraftResponse } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
    enabled: gridMode === 'draft',
    staleTime: 0 // Always refetch after invalidation
  });

  const { data: currentPickResponse } = useQuery({
    queryKey: ['currentPick'],
    queryFn: () => draftService.getCurrentPick(),
    enabled: !!activeDraftResponse?.value,
    staleTime: 0 // Always refetch after invalidation
  });

  const { data: players = [], isLoading, error } = useQuery({
    queryKey: ['players'],
    queryFn: () => playerService.getAll(),
    staleTime: 0 // Always refetch after invalidation
  });
  const managers = managersResponse?.value ?? [];
  const activeDraft = activeDraftResponse?.value;
  const currentPick = currentPickResponse?.value;
  const currentUser = useMemo(() => 
    managersResponse?.value?.find((m: Manager) => m.isUser), 
    [managersResponse?.value]
  );

  // Mutations
  const advancePickMutation = useMutation<ApiResponse<PickResponse>, Error, boolean>({
    mutationFn: async (skipCompleted) => {
      if (!activeDraft) throw new Error('No active draft found');
      const nextPick = await draftService.getNextPick(activeDraft.activeOverallPick, skipCompleted);
      if (nextPick.value) {
        await draftService.updateActivePick(nextPick.value);
      }
      return nextPick;
    },
    onSuccess: async (response) => {
  if (config.debug.enableConsoleLogging) {
    console.log('Advanced to pick:', response.value);
  }
      // Invalidate and refetch all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['currentPick'] }),
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] })
      ]);
      
      // Now get the fresh data
      const updatedDraft = queryClient.getQueryData<{ value: Draft }>(['activeDraft']);
      logPickState(updatedDraft?.value, 'After Advance Pick');
      setSnackbar({ open: true, message: 'Advanced to next pick', severity: 'success' });
    },
    onError: (error) => {
      if (config.debug.enableConsoleLogging) console.error('Error advancing pick:', error);
      setSnackbar({ 
        open: true, 
        message: `Error advancing pick: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  });

  // Callbacks
  const getActivePickManager = useCallback(() => {
    if (!activeDraft) return null;

    const round = activeDraft.rounds.find(r => r.roundNumber === activeDraft.activeRound);
    if (!round) return null;

    const pick = round.picks.find(p => p.pickNumber === activeDraft.activePick);
    const manager = pick ? managers.find(m => m.id === pick.managerId) : null;
    return manager ? { name: manager.name } : null;
  }, [activeDraft, managers]);

  // Determines if user can advance to the next pick
  // Returns false if:
  // 1. No active draft or current pick exists
  // 2. User is at the last pick of the last round
  // For snake drafts, considers reversed pick order in even rounds
  const canAdvance = useCallback(() => {
    if (!activeDraft?.activeRound || !activeDraft?.activePick) return false;
    
    // Get the last round
    const lastRound = activeDraft.rounds[activeDraft.rounds.length - 1];
    if (!lastRound) return false;

    const isLastPick = activeDraft.activeRound === lastRound.roundNumber && 
      activeDraft.activePick === (lastRound.roundNumber % 2 === 0 && activeDraft.isSnakeDraft
        ? Math.min(...lastRound.picks.map(p => p.pickNumber))
        : Math.max(...lastRound.picks.map(p => p.pickNumber)));

    return !isLastPick;
  }, [activeDraft]);

  // Determines if user can skip to the next incomplete pick
  // Returns false if:
  // 1. No active draft or current pick exists
  // 2. Currently on the active pick (prevents skipping current pick)
  // 3. No incomplete picks remain after current pick
  // For snake drafts, considers reversed pick order in even rounds when searching
  const canSkipToIncomplete = useCallback(() => {
    if (!activeDraft?.activeRound || !activeDraft?.activePick || !activeDraft?.currentOverallPick) return false;
    
    // Disable if we're on the current pick
    if (activeDraft.activeOverallPick === activeDraft.currentOverallPick) {
      return false;
    }
    
    // Check if there are any incomplete picks after active pick
    const hasIncomplete = activeDraft.rounds.some((round) => {
      const activeRound = activeDraft.activeRound!;
      if (round.roundNumber < activeRound) return false;
      if (round.roundNumber > activeRound) return round.picks.some(p => !p.isComplete);
      
      const picks = round.roundNumber % 2 === 0 && activeDraft.isSnakeDraft
        ? [...round.picks].sort((a, b) => b.pickNumber - a.pickNumber)
        : [...round.picks].sort((a, b) => a.pickNumber - b.pickNumber);
        
      return picks
        .slice(picks.findIndex(p => p.pickNumber === activeDraft.activePick) + 1)
        .some(p => !p.isComplete);
    });

    return hasIncomplete;
  }, [activeDraft]);

  // Determines if a player can be drafted with the active pick
  // Returns false if:
  // 1. No active draft exists
  // 2. Pick is not found
  // 3. Pick is already complete
  const canDraft = useCallback((playerId: string) => {
    if (!activeDraft?.activeRound || !activeDraft?.activePick) return false;

    // Get the pick we're trying to draft from
    const draftRound = activeDraft.rounds.find(r => r.roundNumber === activeDraft.activeRound);
    if (!draftRound) return false;

    const pick = draftRound.picks.find(p => p.pickNumber === activeDraft.activePick);
    if (!pick) return false;

    // Can't draft if pick is already complete
    if (pick.isComplete) return false;

    return true;
  }, [activeDraft]);

  // Handles the draft pick process
  // 1. Marks the pick as complete in the draft (backend will handle marking player as drafted)
  // 2. Advances to next pick (handled by backend)
  // 3. Refreshes all relevant queries to sync UI state
  // Includes detailed logging in debug mode
  const handleDraftClick = async (playerId: string, managerId: string) => {
    if (!activeDraft?.activeRound || !activeDraft?.activePick || !activeDraft?.activeOverallPick) return;

    if (config.debug.enableConsoleLogging) {
      console.log('Starting draft for:', {
        playerId,
        managerId,
        round: activeDraft.currentRound,
        pick: activeDraft.currentPick
      });
    }

    try {
      if (config.debug.enableConsoleLogging) console.log('Marking pick complete');
      const { activeOverallPick } = activeDraft;
      
      // Mark the pick as complete in the draft (backend will handle marking player as drafted)
      await draftService.markPickComplete(activeDraft.id!, {
        managerId,
        playerId,
        overallPickNumber: activeOverallPick
      });

      if (config.debug.enableConsoleLogging) console.log('Refetching queries');
      // Invalidate and refetch all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] }),
        queryClient.invalidateQueries({ queryKey: ['currentPick'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] })
      ]);
      
      // Now get the fresh data
      const updatedDraft = queryClient.getQueryData<{ value: Draft }>(['activeDraft']);
      logPickState(updatedDraft?.value, 'After Draft Complete');
      setSnackbar({ open: true, message: 'Player drafted successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error drafting player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const handlePlayerCreate = async (player: Omit<Player, 'id'>) => {
    try {
      await playerService.create(player);
      await queryClient.invalidateQueries({ queryKey: ['players'] });
      setAddDialogOpen(false);
      setSnackbar({ open: true, message: 'Player created successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error creating player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const handleResetDraft = async () => {
    if (!activeDraft) return;
    
    try {
      await draftService.resetDraft(activeDraft.id!);
      
      // Invalidate and refetch all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] }),
        queryClient.invalidateQueries({ queryKey: ['currentPick'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] })
      ]);
      setSnackbar({ open: true, message: 'Draft status reset successfully', severity: 'success' });
      setResetDialogOpen(false);
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error resetting draft status: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const handleSaveEdit = async (updatedPlayer: Player) => {
    try {
      const response = await playerService.update(updatedPlayer.id!, updatedPlayer);
      if (response) {
        await queryClient.invalidateQueries({ queryKey: ['players'] });
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
        await queryClient.invalidateQueries({ queryKey: ['players'] });
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
      await queryClient.invalidateQueries({ queryKey: ['players'] });
      setSnackbar({ open: true, message: 'Highlight status updated', severity: 'success' });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error updating highlight status: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

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
        <PlayerListToolbar
          gridMode={gridMode}
          onGridModeChange={handleGridModeChange}
          onAddPlayer={() => setAddDialogOpen(true)}
          onResetDraft={() => setResetDialogOpen(true)}
          activeDraft={activeDraft}
          onAdvancePick={(skipCompleted) => advancePickMutation.mutate(skipCompleted)}
          onPickSelectorClick={(event) => setPickSelectorAnchor(event.currentTarget)}
          canAdvance={canAdvance()}
          canSkipToIncomplete={canSkipToIncomplete()}
          getActivePickManager={getActivePickManager}
        />
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <Alert severity="info">No players available</Alert>
        </Box>
        <PlayerListDialogs
          addDialogOpen={addDialogOpen}
          onAddDialogClose={() => setAddDialogOpen(false)}
          onPlayerCreate={handlePlayerCreate}
          resetDialogOpen={resetDialogOpen}
          onResetDialogClose={() => setResetDialogOpen(false)}
          onResetConfirm={handleResetDraft}
          selectedPlayer={selectedPlayer}
          detailsDialogOpen={detailsModalOpen}
          onDetailsDialogClose={() => setDetailsModalOpen(false)}
          editDialogOpen={editModalOpen}
          onEditDialogClose={() => setEditModalOpen(false)}
          onPlayerSave={handleSaveEdit}
          activeDraft={activeDraft}
        />
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
      <PlayerListToolbar
        gridMode={gridMode}
        onGridModeChange={handleGridModeChange}
        onAddPlayer={() => setAddDialogOpen(true)}
        onResetDraft={() => setResetDialogOpen(true)}
        activeDraft={activeDraft}
        onAdvancePick={(skipCompleted) => advancePickMutation.mutate(skipCompleted)}
        onPickSelectorClick={(event) => setPickSelectorAnchor(event.currentTarget)}
        canAdvance={canAdvance()}
        canSkipToIncomplete={canSkipToIncomplete()}
        getActivePickManager={getActivePickManager}
      />
      <PlayerListGrid
        gridMode={gridMode}
        players={players}
        managers={managers}
        currentUser={currentUser}
        onPlayerClick={(player) => {
          setSelectedPlayer(player);
          setDetailsModalOpen(true);
        }}
        onPlayerEdit={(player) => {
          setSelectedPlayer(player);
          setEditModalOpen(true);
        }}
        onPlayerDelete={handleDelete}
        onPlayerHighlight={handleToggleHighlight}
        onPlayerDraft={handleDraftClick}
        canDraft={canDraft}
        activeDraft={activeDraft}
      />
      {activeDraft?.activeRound && activeDraft?.activePick && (
        <Popover
          open={Boolean(pickSelectorAnchor)}
          anchorEl={pickSelectorAnchor}
          onClose={() => setPickSelectorAnchor(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <DraftPickSelector
            activeDraft={activeDraft}
            currentRound={activeDraft.activeRound}
            currentPick={activeDraft.activePick}
            selectedRound={activeDraft.activeRound}
            selectedPick={activeDraft.activePick}
            onPickSelect={async (round: number, pick: number) => {
              if (!activeDraft) return;

              const draftRound = activeDraft.rounds.find(r => r.roundNumber === round);
              if (!draftRound) return;

              const draftPick = draftRound.picks.find(p => p.pickNumber === pick);
              if (!draftPick || draftPick.isComplete) return;

              if (config.debug.enableConsoleLogging) {
                console.log('Pick selector: Setting active pick to:', { round, pick });
                console.log('Draft round picks:', draftRound.picks);
              }

              try {
                // Calculate overall pick number
                const totalManagers = activeDraft.draftOrder.length;
                const overallPickNumber = ((round - 1) * totalManagers) + 
                  (round % 2 === 0 && activeDraft.isSnakeDraft 
                    ? totalManagers - pick + 1 
                    : pick);

                // Update backend state
                await draftService.updateActivePick({ round, pick, overallPickNumber });
                
                // Invalidate and refetch all queries
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['currentPick'] }),
                  queryClient.invalidateQueries({ queryKey: ['activeDraft'] })
                ]);
                
                // Now get the fresh data
                const updatedDraft = queryClient.getQueryData<{ value: Draft }>(['activeDraft']);
                logPickState(updatedDraft?.value, 'After Pick Selection');
                setPickSelectorAnchor(null);
              } catch (error) {
                setSnackbar({ 
                  open: true, 
                  message: `Error updating active pick: ${error instanceof Error ? error.message : 'Unknown error'}`, 
                  severity: 'error' 
                });
              }
            }}
          />
        </Popover>
      )}
      <PlayerListDialogs
        addDialogOpen={addDialogOpen}
        onAddDialogClose={() => setAddDialogOpen(false)}
        onPlayerCreate={handlePlayerCreate}
        resetDialogOpen={resetDialogOpen}
        onResetDialogClose={() => setResetDialogOpen(false)}
        onResetConfirm={handleResetDraft}
        selectedPlayer={selectedPlayer}
        detailsDialogOpen={detailsModalOpen}
        onDetailsDialogClose={() => setDetailsModalOpen(false)}
        editDialogOpen={editModalOpen}
        onEditDialogClose={() => setEditModalOpen(false)}
        onPlayerSave={handleSaveEdit}
        activeDraft={activeDraft}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
