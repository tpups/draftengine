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
      round: activeDraft.currentRound,
      pick: activeDraft.currentPick
    } : null,
    current: currentPick ? {
      round: currentPick.round,
      pick: currentPick.pick
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
  const [gridMode, setGridMode] = useState<'prep' | 'draft'>('prep');
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
    onSuccess: (response) => {
      if (config.debug.enableConsoleLogging) console.log('Advanced to pick:', response.value);
      queryClient.invalidateQueries({ queryKey: ['currentPick'] });
      logPickState(activeDraft, response.value, 'After Advance Pick');
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

  const canSkipToIncomplete = useCallback(() => {
    if (!activeDraft || !currentPick) return false;
    
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
      await Promise.all([
        draftService.markPickComplete(activeDraft.id!, {
          roundNumber: activeDraft.currentRound,
          managerId
        }),
        playerService.markAsDrafted(selectedPlayerId, {
          draftedBy: managerId,
          round: activeDraft.currentRound,
          pick: activeDraft.currentPick
        })
      ]);

      if (config.debug.enableConsoleLogging) console.log('Advancing to next pick');
      // Advance to next pick
      await advancePickMutation.mutateAsync(false);

      if (config.debug.enableConsoleLogging) console.log('Invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['activeDraft'] });
      queryClient.invalidateQueries({ queryKey: ['currentPick'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      logPickState(activeDraft, currentPick, 'After Draft Complete');
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
      queryClient.invalidateQueries({ queryKey: ['players'] });
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
      queryClient.invalidateQueries({ queryKey: ['activeDraft'] });
      queryClient.invalidateQueries({ queryKey: ['currentPick'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
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
          onGridModeChange={setGridMode}
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
        onGridModeChange={setGridMode}
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
                // Update backend state
                await draftService.updateActivePick({ round, pick });
                // Update frontend cache
                queryClient.setQueryData(['currentPick'], { value: { round, pick } });
                logPickState(activeDraft, { round, pick }, 'After Pick Selection');
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
