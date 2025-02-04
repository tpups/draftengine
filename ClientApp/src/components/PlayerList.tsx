import { Box, CircularProgress, Alert, Snackbar, Popover } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Player, Manager, ApiResponse, Draft } from '../types/models';
import { CurrentPickResponse } from '../services/draftService';
import { playerService } from '../services/playerService';
import { draftService } from '../services/draftService';
import { managerService } from '../services/managerService';
import { config } from '../config/config';

// Helper function to log pick state
const logPickState = (activeDraft: Draft | undefined | null, currentPick: CurrentPickResponse | undefined | null, context: string) => {
  if (!config.debug.enableConsoleLogging) return;

  console.log(`[${context}] Pick State:`, {
    active: activeDraft ? {
      round: activeDraft.activeRound,
      pick: activeDraft.activePick,
      overall: activeDraft.activeOverallPick
    } : null,
    current: currentPick ? {
      round: currentPick.round,
      pick: currentPick.pick,
      overall: currentPick.overallPickNumber
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
  const [draftModalOpen, setDraftModalOpen] = useState(false);
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

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['players'],
    queryFn: () => playerService.getAll(),
  });

  const players = response?.value ?? [];
  const managers = managersResponse?.value ?? [];
  const activeDraft = activeDraftResponse?.value;
  const currentPick = currentPickResponse?.value;
  const currentUser = useMemo(() => 
    managersResponse?.value?.find((m: Manager) => m.isUser), 
    [managersResponse?.value]
  );

  // Mutations
  const advancePickMutation = useMutation<ApiResponse<CurrentPickResponse>, Error, boolean>({
    mutationFn: (skipCompleted) => draftService.advancePick(skipCompleted),
    onSuccess: async (response) => {
      if (config.debug.enableConsoleLogging) console.log('Advanced to pick:', response.value);
      // Refetch both queries and wait for them to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['currentPick'] }),
        queryClient.refetchQueries({ queryKey: ['activeDraft'] })
      ]);
      
      // Now get the fresh data
      const updatedDraft = queryClient.getQueryData<{ value: Draft }>(['activeDraft']);
      logPickState(updatedDraft?.value, response.value, 'After Advance Pick');
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
  const getCurrentPickManager = useCallback(() => {
    if (!activeDraft || !currentPick) return null;

    const round = activeDraft.rounds.find(r => r.roundNumber === currentPick.round);
    if (!round) return null;

    const pick = round.picks.find(p => p.pickNumber === currentPick.pick);
    const manager = pick ? managers.find(m => m.id === pick.managerId) : null;
    return manager ? { name: manager.name } : null;
  }, [activeDraft, currentPick, managers]);

  // Determines if user can advance to the next pick
  // Returns false if:
  // 1. No active draft or current pick exists
  // 2. User is at the last pick of the last round
  // For snake drafts, considers reversed pick order in even rounds
  const canAdvance = useCallback(() => {
    if (!activeDraft || !currentPick) return false;
    
    // Get the last round
    const lastRound = activeDraft.rounds[activeDraft.rounds.length - 1];
    const isLastPick = currentPick.round === lastRound.roundNumber && 
      currentPick.pick === (lastRound.roundNumber % 2 === 0 && activeDraft.isSnakeDraft
        ? Math.min(...lastRound.picks.map(p => p.pickNumber))
        : Math.max(...lastRound.picks.map(p => p.pickNumber)));

    return !isLastPick;
  }, [activeDraft, currentPick]);

  // Determines if user can skip to the next incomplete pick
  // Returns false if:
  // 1. No active draft or current pick exists
  // 2. Currently on the active pick (prevents skipping current pick)
  // 3. No incomplete picks remain after current pick
  // For snake drafts, considers reversed pick order in even rounds when searching
  const canSkipToIncomplete = useCallback(() => {
    if (!activeDraft || !currentPick) return false;
    
    // Disable if we're on the current pick
    if (activeDraft.activeOverallPick === activeDraft.currentOverallPick) {
      return false;
    }
    
    // Check if there are any incomplete picks after current pick
    const hasIncomplete = activeDraft.rounds.some((round, i) => {
      if (round.roundNumber < currentPick.round) return false;
      if (round.roundNumber > currentPick.round) return round.picks.some(p => !p.isComplete);
      
      const picks = round.roundNumber % 2 === 0 && activeDraft.isSnakeDraft
        ? [...round.picks].sort((a, b) => b.pickNumber - a.pickNumber)
        : [...round.picks].sort((a, b) => a.pickNumber - b.pickNumber);
        
      return picks
        .slice(picks.findIndex(p => p.pickNumber === currentPick.pick) + 1)
        .some(p => !p.isComplete);
    });

    return hasIncomplete;
  }, [activeDraft, currentPick]);

  // Determines if a player can be drafted with the current pick
  // Returns false if:
  // 1. No active draft, current pick, or round exists
  // 2. Pick is already complete
  // 3. Selected pick is in a future round
  // 4. In current round:
  //    - For normal rounds: if pick number > current pick
  //    - For snake rounds: if pick number < current pick (reversed order)
  const canDraft = useCallback((playerId: string) => {
    if (!activeDraft || !currentPick || !activeDraft.currentRound || !activeDraft.currentPick) return false;

    // Get the pick we're trying to draft from
    const draftRound = activeDraft.rounds.find(r => r.roundNumber === currentPick.round);
    if (!draftRound) return false;

    const pick = draftRound.picks.find(p => p.pickNumber === currentPick.pick);
    if (!pick) return false;

    // Can't draft if pick is already complete
    if (pick.isComplete) return false;

    // Can't draft if selected pick is in a future round
    if (currentPick.round > activeDraft.currentRound) return false;

    // For current round, need to compare based on snake order
    if (currentPick.round === activeDraft.currentRound) {
      if (currentPick.round % 2 === 0 && activeDraft.isSnakeDraft) {
        // In snake rounds, higher numbers come first
        if (currentPick.pick < activeDraft.currentPick) return false;
      } else {
        // In normal rounds, lower numbers come first
        if (currentPick.pick > activeDraft.currentPick) return false;
      }
    }

    return true;
  }, [activeDraft, currentPick]);

  // Handles the draft pick process
  // 1. Marks the pick as complete in the draft
  // 2. Updates the player's draft status
  // 3. Advances to next pick (handled by backend)
  // 4. Refreshes all relevant queries to sync UI state
  // Includes detailed logging in debug mode
  const handleDraft = async (managerId: string) => {
    if (!selectedPlayerId || !activeDraft || !activeDraft.currentRound || !activeDraft.currentPick) return;

    if (config.debug.enableConsoleLogging) {
      console.log('Starting draft for:', {
        playerId: selectedPlayerId,
        managerId,
        round: activeDraft.currentRound,
        pick: activeDraft.currentPick
      });
    }

    try {
      if (config.debug.enableConsoleLogging) console.log('Marking pick complete and player as drafted');
      await draftService.markPickComplete(activeDraft.id!, {
        roundNumber: activeDraft.currentRound,
        managerId,
        playerId: selectedPlayerId
      });

      // No need to advance pick here since the backend will handle it
      await playerService.markAsDrafted(selectedPlayerId, {
        draftedBy: managerId,
        round: activeDraft.currentRound,
        pick: activeDraft.currentPick
      });

      if (config.debug.enableConsoleLogging) console.log('Refetching queries');
      // Refetch all queries and wait for them to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['activeDraft'] }),
        queryClient.refetchQueries({ queryKey: ['currentPick'] }),
        queryClient.refetchQueries({ queryKey: ['players'] })
      ]);
      
      // Now get the fresh data
      const updatedDraft = queryClient.getQueryData<{ value: Draft }>(['activeDraft']);
      const updatedPick = queryClient.getQueryData<{ value: CurrentPickResponse }>(['currentPick']);
      logPickState(updatedDraft?.value, updatedPick?.value, 'After Draft Complete');
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

  const handlePlayerCreate = async (player: Omit<Player, 'id'>) => {
    try {
      await playerService.create(player);
      await queryClient.refetchQueries({ queryKey: ['players'] });
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
      
      // Refetch all queries and wait for them to complete
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['activeDraft'] }),
        queryClient.refetchQueries({ queryKey: ['currentPick'] }),
        queryClient.refetchQueries({ queryKey: ['players'] })
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
      if (response?.value) {
        await queryClient.refetchQueries({ queryKey: ['players'] });
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
        await queryClient.refetchQueries({ queryKey: ['players'] });
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
      await queryClient.refetchQueries({ queryKey: ['players'] });
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
          currentPick={currentPick}
          activeDraft={activeDraft}
        onAdvancePick={(skipCompleted) => advancePickMutation.mutate(skipCompleted)}
          onPickSelectorClick={(event) => setPickSelectorAnchor(event.currentTarget)}
          canAdvance={canAdvance()}
          canSkipToIncomplete={canSkipToIncomplete()}
          getCurrentPickManager={getCurrentPickManager}
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
          draftDialogOpen={draftModalOpen}
          onDraftDialogClose={() => setDraftModalOpen(false)}
          onManagerSelect={handleDraft}
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
        currentPick={currentPick}
        activeDraft={activeDraft}
        onAdvancePick={(skipCompleted) => advancePickMutation.mutate(skipCompleted)}
        onPickSelectorClick={(event) => setPickSelectorAnchor(event.currentTarget)}
        canAdvance={canAdvance()}
        canSkipToIncomplete={canSkipToIncomplete()}
        getCurrentPickManager={getCurrentPickManager}
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
        onPlayerDraft={(id) => {
          setSelectedPlayerId(id);
          setDraftModalOpen(true);
        }}
        canDraft={canDraft}
      />
      {activeDraft && currentPick && (
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
            currentRound={currentPick.round}
            currentPick={currentPick.pick}
            selectedRound={currentPick.round}
            selectedPick={currentPick.pick}
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
                
                // Refetch queries and wait for them to complete
                await Promise.all([
                  queryClient.refetchQueries({ queryKey: ['currentPick'] }),
                  queryClient.refetchQueries({ queryKey: ['activeDraft'] })
                ]);
                
                // Now get the fresh data
                const updatedDraft = queryClient.getQueryData<{ value: Draft }>(['activeDraft']);
                logPickState(updatedDraft?.value, { round, pick, overallPickNumber }, 'After Pick Selection');
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
        draftDialogOpen={draftModalOpen}
        onDraftDialogClose={() => setDraftModalOpen(false)}
        onManagerSelect={handleDraft}
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
