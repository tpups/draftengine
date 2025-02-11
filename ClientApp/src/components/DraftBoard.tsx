import { Box, Paper, Tooltip, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { Draft, Manager, DraftPosition, Player, DraftStatus } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { playerService } from '../services/playerService';

interface DraftBoardProps {
  activeDraft: Draft;
  managers: Manager[];
}

export function DraftBoard({
  activeDraft,
  managers
}: DraftBoardProps) {
  const { theme, mode } = useTheme();

  const { data: playersResponse } = useQuery({
    queryKey: ['players'],
    queryFn: () => playerService.getAll(),
    staleTime: 0
  });

  const players = playersResponse ?? [];

  if (!activeDraft) {
    return (
    <Box sx={{ p: 2, maxWidth: '100%', width: 'fit-content' }}>
        <Typography variant="h6">
          No active draft found
        </Typography>
      </Box>
    );
  }

  const getManagerName = (pick: DraftPosition) => {
    // If the pick has been traded, use the most recent manager in the TradedTo array
    const currentManagerId = pick.tradedTo?.length ? pick.tradedTo[pick.tradedTo.length - 1] : pick.managerId;
    const manager = managers.find(m => m.id === currentManagerId);
    return manager?.name ?? '';
  };

  const getOriginalManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager?.name ?? '';
  };

  const getTradeHistory = (pick: DraftPosition) => {
    if (!pick.tradedTo?.length) return '';

    const history = pick.tradedTo.map(managerId => {
      const manager = managers.find(m => m.id === managerId);
      return manager?.name ?? 'Unknown Manager';
    });

    const originalManager = managers.find(m => m.id === pick.managerId);
    return `Original: ${originalManager?.name ?? 'Unknown'}\nTrade History:\n${history.join('\n')}`;
  };

  const getPlayerName = (pick: DraftPosition, roundNumber: number) => {
    const player = players.find((p: Player) => {
      const draftStatus = p.draftStatuses?.find((ds: DraftStatus) => 
        ds.draftId === activeDraft.id && 
        ds.round === roundNumber && 
        ds.pick === pick.pickNumber
      );
      return draftStatus?.isDrafted;
    });
    return player?.name ?? '';
  };

  /**
   * Calculates the display pick number based on draft type
   * For snake drafts:
   * - Even rounds reverse the pick order (e.g., pick 12 becomes pick 1)
   * - Odd rounds maintain normal order
   */
  const getDisplayPickNumber = (round: number, actualPickNumber: number) => {
    const totalManagers = activeDraft.draftOrder.length;
    if (round % 2 === 0 && activeDraft.isSnakeDraft) {
      return totalManagers - actualPickNumber + 1;
    }
    return actualPickNumber;
  };

  /**
   * Determines the visual style for a pick cell
   * Visual States:
   * - Current Pick: Red outline
   * - Completed Pick: Blue outline with player name
   * - Normal Pick: Light background
   * 
   * Border Rules:
   * - Left border for first round and normal rounds
   * - Right border for snake rounds
   * - Creates visual separation between normal and snake rounds
   */
  const getPickStyle = (round: number, pickNumber: number, pick: DraftPosition) => {
    const isCurrent = pick.overallPickNumber === activeDraft.currentOverallPick;
    const isSnakeRound = round % 2 === 0 && activeDraft.isSnakeDraft;
    const playerName = getPlayerName(pick, round);
    const isUserPick = managers.find(m => m.id === pick.managerId)?.isUser;
    const isTraded = pick.tradedTo?.length > 0;
    
    // Check if the pick is currently owned by its original owner
    const currentOwner = pick.tradedTo?.length ? pick.tradedTo[pick.tradedTo.length - 1] : pick.managerId;
    const isWithOriginalOwner = currentOwner === pick.managerId;
    
    // Only consider it traded if it's not with its original owner
    const isCurrentlyTraded = isTraded && !isWithOriginalOwner;

    return {
      width: '160px',
      height: '64px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      bgcolor: isCurrentlyTraded ? 
        (mode === 'light' ? theme.colors.pickState.traded.light : theme.colors.pickState.traded.dark) :
        (mode === 'light' ? 
          (isSnakeRound ? theme.colors.background.elevated.light : theme.colors.background.paper.light) :
          (isSnakeRound ? theme.colors.background.paper.dark : theme.colors.background.elevated.dark)),
      color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
      borderLeft: round === 1 || !isSnakeRound ? 1 : 0,
      borderRight: isSnakeRound ? 1 : 0,
      borderColor: 'divider',
      outline: isCurrent ? '2px solid' : pick.isComplete ? '2px solid' : 'none',
      outlineColor: isCurrent ? theme.colors.pickState.selected.light : theme.colors.primary.main,
      outlineOffset: '-2px',
      p: 1,
      // Add italic style for traded picks
      fontStyle: isTraded ? 'italic' : 'normal'
    };
  };

  const maxPicksPerRound = Math.max(...activeDraft.rounds.map(r => r.picks.length));

  return (
    <Box sx={{ p: 2, maxWidth: '100%', width: 'fit-content' }}>
      <Box sx={{ display: 'flex' }}>
        {/* Round number column */}
        <Box sx={{ width: '60px', mr: 1 }}>
          {/* Empty cell between column headers and row headers */}
          <Box sx={{ 
            height: '72px', 
            bgcolor: theme.colors.secondary.dark,
            borderRadius: '4px',
            visibility: 'hidden'
          }} />
          <Box sx={{ 
            display: 'grid',
            gap: 0.5,
            gridTemplateRows: `repeat(${activeDraft.rounds.length}, 64px)`,
            mt: 0.5
          }}>
          {activeDraft.rounds.map((round) => (
            <Box 
              key={`round-${round.roundNumber}`}
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pr: 1,
                bgcolor: theme.colors.secondary.dark,
                borderRadius: '4px',
                minHeight: '64px'
              }}
            >
              <Typography variant="h6" sx={{ color: theme.colors.text.primary.dark, fontWeight: 600 }}>
                R{round.roundNumber}
              </Typography>
            </Box>
          ))}
          </Box>
        </Box>

        {/* Main grid */}
        <Box sx={{ 
          flex: 1, 
          overflowX: 'auto',
          '& > *': {
            minWidth: 'min-content'
          }
        }}>
          <Box sx={{ width: 'fit-content' }}>
            {/* Pick numbers header */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: `repeat(${maxPicksPerRound}, 160px)`,
              gap: 0.5
            }}>
              {activeDraft.rounds[0].picks.map((pick) => (
                <Box 
                  key={`header-${pick.pickNumber}`}
                  sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '72px',
                    bgcolor: theme.colors.secondary.dark,
                    borderRadius: '4px',
                    borderBottom: 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body1" sx={{ color: theme.colors.text.primary.dark, opacity: 0.8 }}>
                      {getOriginalManagerName(activeDraft.draftOrder[pick.pickNumber - 1].managerId)}
                    </Typography>
                    <Typography variant="h6" sx={{ color: theme.colors.text.primary.dark, fontWeight: 600 }}>
                      {pick.pickNumber}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

          </Box>

          {/* Grid content */}
          <Box sx={{ 
            mt: 0.5,
            display: 'grid',
            gridTemplateColumns: `repeat(${maxPicksPerRound}, 160px)`,
            gap: 0.5
          }}>
            {activeDraft.rounds.map((round) => (
              <Box key={round.roundNumber} sx={{ display: 'contents' }}>
                {round.picks.map((pick) => {
                  const displayNumber = getDisplayPickNumber(round.roundNumber, pick.pickNumber);
                  const managerName = getManagerName(pick);
                  const playerName = getPlayerName(pick, round.roundNumber);
                  const tradeHistory = getTradeHistory(pick);
                  const tooltipTitle = `Round ${round.roundNumber}, Pick ${displayNumber} (Overall #${pick.overallPickNumber})${tradeHistory ? `\n\n${tradeHistory}` : ''}`;
                  return (
                    <Tooltip
                      key={`${round.roundNumber}-${pick.pickNumber}`}
                      title={tooltipTitle}
                      arrow
                    >
                      <Paper
                        elevation={0}
                        sx={getPickStyle(round.roundNumber, pick.pickNumber, pick)}
                      >
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.75rem',
                            maxWidth: '152px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            fontWeight: 500,
                            opacity: 0.8
                          }}
                        >
                          {managerName}
                        </Typography>
                        {playerName && (
                          <Typography 
                            variant="body2"
                            sx={{ 
                              maxWidth: '152px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textAlign: 'center',
                              fontWeight: 600
                            }}
                          >
                            {playerName}
                          </Typography>
                        )}
                      </Paper>
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
