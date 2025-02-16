import { Box, CircularProgress, Alert, Snackbar, Popover, Paper, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { Player, Manager, ApiResponse, Draft, PaginatedResult, RankingSource, ProspectSource, ProjectionSource } from '../types/models';
import { PickResponse } from '../services/draftService';
import { playerService, PlayerFilters } from '../services/playerService';
import { draftService } from '../services/draftService';
import { managerService } from '../services/managerService';
import { config } from '../config/config';
import { DraftPickSelector } from './DraftPickSelector';
import { PlayerListToolbar } from './PlayerListToolbar';
import { PlayerListGrid } from './PlayerListGrid';
import { PlayerListDialogs } from './PlayerListDialogs';
import { UserDraftedPlayers } from './UserDraftedPlayers';
import { SearchInput } from './SearchInput';
import { PlayerListFilters } from './PlayerListFilters';
import { MLB_TEAMS, LEVELS } from './PlayerListFilters';

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

export function PlayerList() {
  const muiTheme = useMuiTheme();
  const { theme, mode } = useTheme();
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
    staleTime: 0 // Always refetch after invalidation
  });

  const { data: currentPickResponse } = useQuery({
    queryKey: ['currentPick'],
    queryFn: () => draftService.getCurrentPick(),
    enabled: !!activeDraftResponse?.value,
    staleTime: 0 // Always refetch after invalidation
  });

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [filters, setFilters] = useState<PlayerFilters>({
    excludeDrafted: false,
    teams: Object.values(MLB_TEAMS).flatMap(divisions => 
      Object.values(divisions).flat()
    ),
    ageRange: [18, 40],
    playerType: 'all',
    rankingSource: null,
    prospectSource: null,
    projectionConfig: {
      source: null,
      category: null
    }
  });

  const { data: searchResult = { items: [], totalCount: 0 }, isLoading, error } = useQuery<PaginatedResult<Player>, Error>({
    queryKey: ['players', page, pageSize, debouncedSearchTerm, filters, filters.sortField, filters.sortDescending],
    queryFn: () => playerService.search({ 
      searchTerm: debouncedSearchTerm,
      pageNumber: page, 
      pageSize,
      ...filters
    }),
    placeholderData: (prev) => prev, // Keep showing previous data while loading next
    staleTime: 0, // Always refetch after invalidation
    enabled: true, // Always enabled
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent search disruption
    retry: false // Don't retry failed searches
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
      const nextPick = await draftService.getNextPick(activeDraft.activeOverallPick || 0, skipCompleted);
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
  // Gets the current owner of the active pick and determines if they are the original owner
  const getActivePickManager = useCallback(() => {
    if (!activeDraft) return null;

    const round = activeDraft.rounds.find(r => r.roundNumber === activeDraft.activeRound);
    if (!round) return null;

    const pick = round.picks.find(p => p.pickNumber === activeDraft.activePick);
    if (!pick) return null;

    // If the pick has been traded, the current owner is the last manager in the tradedTo array
    // Otherwise, it's the original owner (managerId)
    const currentManagerId = pick.tradedTo?.length ? pick.tradedTo[pick.tradedTo.length - 1] : pick.managerId;
    const manager = managers.find(m => m.id === currentManagerId);
    
    if (!manager) return null;

    // Get the original owner's name
    const originalManager = managers.find(m => m.id === pick.managerId);
    
    // A pick is with its original owner if:
    // 1. It has never been traded (tradedTo is empty), or
    // 2. It has been traded back to the original owner (last tradedTo entry matches original managerId)
    return { 
      name: manager.name,
      isOriginalOwner: currentManagerId === pick.managerId,
      originalOwnerName: originalManager?.name
    };
  }, [activeDraft, managers]);

  // Determines if user can advance to the next pick
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

  const handleUndraftClick = async (playerId: string) => {
    if (!activeDraft) return;

    try {
      // Get the player's draft status to find the pick details
      const player = searchResult.items.find(p => p.id === playerId);
      const draftStatus = player?.draftStatuses?.find(ds => ds.draftId === activeDraft.id);
      if (!draftStatus) return;

      // Toggle the pick status (backend handles both pick and player status)
      const result = await draftService.togglePickComplete(activeDraft.id!, {
        managerId: draftStatus.managerId,
        playerId: playerId,
        overallPickNumber: draftStatus.overallPick
      });

      // Invalidate and refetch all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] }),
        queryClient.invalidateQueries({ queryKey: ['currentPick'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] })
      ]);
      setSnackbar({ open: true, message: 'Player undrafted successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Error undrafting player: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
    }
  };

  const handleDraftClick = async (playerId: string, managerId: string) => {
    if (!activeDraft?.activeRound || !activeDraft?.activePick || !activeDraft?.activeOverallPick) return;

    if (config.debug.enableConsoleLogging) {
      console.log('Starting draft pick for:', {
        playerId,
        managerId,
        round: activeDraft.activeRound,
        pick: activeDraft.activePick
      });
    }

    try {
      if (config.debug.enableConsoleLogging) console.log('Marking pick complete');
      const { activeOverallPick } = activeDraft;
      
      // Mark the pick as complete in the draft (backend will handle marking player as drafted)
      const result = await draftService.togglePickComplete(activeDraft.id!, {
        managerId,
        playerId,
        overallPickNumber: activeOverallPick
      });

      if (!result.value) {
        throw new Error('Failed to draft player. The player may already be drafted.');
      }

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

  // Render data grid
  return (
    <Box sx={{ 
      width: '100%', 
      height: 'calc(100vh - 200px)',
      display: 'flex', 
      gap: 3
    }}>
      <Box sx={{ flex: 3 }}>
        <Box sx={{ height: '100%', position: 'relative' }}>
          <Paper
            elevation={2}
            sx={{ 
              height: '100%',
              p: 0,
              borderRadius: '16px',
              bgcolor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
              display: 'flex',
              flexDirection: 'column',
              position: 'absolute',
              inset: 0
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
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
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                alignItems: 'center'
              }}>
                <PlayerListFilters
                  onFiltersChange={setFilters}
                />
                <Box sx={{ flex: 1 }}>
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search players..."
                  />
                </Box>
              </Box>
            </Box>
            <PlayerListGrid
              gridMode={gridMode}
              players={searchResult.items}
              managers={managers}
              currentUser={currentUser}
              onPlayerClick={(player: Player) => {
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
              onPlayerUndraft={handleUndraftClick}
              canDraft={canDraft}
              activeDraft={activeDraft}
              totalCount={searchResult.totalCount}
              currentPage={page}
              onPaginationChange={(model) => {
                // DataGrid is 0-based, our API is 1-based
                const newPage = model.page + 1;
                console.debug('Pagination change:', { model, newPage, pageSize: model.pageSize });
                setPage(newPage);
                setPageSize(model.pageSize);
              }}
              onSortChange={(field, descending) => {
                setFilters((prev: PlayerFilters) => ({
                  ...prev,
                  sortField: field || undefined,
                  sortDescending: field ? descending : undefined
                }));
              }}
              rankingSource={filters.rankingSource ?? null}
              prospectSource={filters.prospectSource ?? null}
              projectionConfig={filters.projectionConfig ?? { source: null, category: null }}
              onRankingSourceChange={(source) => setFilters((prev: PlayerFilters) => ({ ...prev, rankingSource: source }))}
              onProspectSourceChange={(source) => setFilters((prev: PlayerFilters) => ({ ...prev, prospectSource: source }))}
              onProjectionConfigChange={(config) => setFilters((prev: PlayerFilters) => ({ ...prev, projectionConfig: config }))}
              availableRankingSources={Object.values(RankingSource)}
              availableProspectSources={Object.values(ProspectSource)}
              availableProjectionSources={Object.values(ProjectionSource)}
              availableProjectionCategories={{
                [ProjectionSource.STEAMER]: ['AVG', 'HR', 'RBI', 'SB', 'OPS', 'ERA', 'WHIP', 'K', 'W', 'SV']
              }}
              noRowsOverlay={
                searchTerm ? 
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
                  }}>
                    Search returned no players
                  </Box>
                  :
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
                  }}>
                    No players available
                  </Box>
              }
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
                    if (!draftPick) return;

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
          </Paper>
        </Box>
      </Box>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Paper 
          elevation={2}
          sx={{ 
            p: 4,
            borderRadius: '16px',
            bgcolor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            inset: 0
          }}
        >
          <UserDraftedPlayers
            players={searchResult.items}
            activeDraft={activeDraft}
            currentUser={currentUser}
            onPlayerClick={(player) => {
              setSelectedPlayer(player);
              setDetailsModalOpen(true);
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}
