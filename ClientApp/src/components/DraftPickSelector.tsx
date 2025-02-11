import { Box, Paper, Tooltip, Typography, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { Draft, Manager, DraftPosition } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { managerService } from '../services/managerService';
import { config } from '../config/config';

/**
 * Props for the DraftPickSelector component
 * @property activeDraft - The current active draft
 * @property currentRound - The round number of the current pick
 * @property currentPick - The pick number within the current round
 * @property selectedRound - The round number of the selected pick
 * @property selectedPick - The pick number of the selected pick
 * @property onPickSelect - Callback when a pick is selected
 */
interface DraftPickSelectorProps {
  activeDraft: Draft;
  currentRound: number;
  currentPick: number;
  selectedRound: number;
  selectedPick: number;
  currentUser?: Manager;
  onPickSelect: (round: number, pick: number) => void;
}

export function DraftPickSelector({
  activeDraft,
  currentRound,
  currentPick,
  selectedRound,
  selectedPick,
  currentUser,
  onPickSelect
}: DraftPickSelectorProps) {
  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
    staleTime: 0
  });
  const muiTheme = useMuiTheme();
  const { theme, mode } = useTheme();

  const managers = managersResponse?.value ?? [];

  const getManagerName = (pick: DraftPosition) => {
    // If the pick has been traded, use the most recent manager in the TradedTo array
    const currentManagerId = pick.tradedTo?.length ? pick.tradedTo[pick.tradedTo.length - 1] : pick.managerId;
    const manager = managers.find(m => m.id === currentManagerId);
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
   * Builds a dictionary of pick availability for the draft board
   * A pick is available if:
   * - It is not beyond the higher of current and active overall pick
   * 
   * For snake drafts:
   * - Even rounds have reversed pick order but maintain sequential overall numbers
   * - Pick availability follows the same rules regardless of round type
   * 
   * Returns an object mapping:
   * - round number → {
   *     pickOrder: number[], // Order of picks in this round
   *     [pickNumber]: boolean // Availability of each pick
   *   }
   */
  const getPickAvailability = () => {
    const availability: Record<number, { [key: number]: boolean; pickOrder: number[] }> = {};

    activeDraft.rounds.forEach(round => {
      const roundNum = round.roundNumber;
      availability[roundNum] = {
        pickOrder: round.picks.map(p => p.pickNumber),
      };

      round.picks.forEach(pick => {
        const isAvailable = (() => {
          // Can select picks as long as they are not beyond the higher of current and active overall pick
          const maxAllowedPick = Math.max(activeDraft.currentOverallPick, activeDraft.activeOverallPick);
          return pick.overallPickNumber <= maxAllowedPick;
        })();

        availability[roundNum][pick.pickNumber] = isAvailable;
      });
    });

    if (config.debug.enableConsoleLogging) {
      //console.log('Pick Availability:', availability);
      console.log('Active Overall Pick:', activeDraft.activeOverallPick);
      console.log('Current Overall Pick:', activeDraft.currentOverallPick);
    }

    return availability;
  };

  const pickAvailability = getPickAvailability();

  const isPickAvailable = (round: number, pickNumber: number) => {
    return pickAvailability[round]?.[pickNumber] ?? false;
  };

  /**
   * Determines the visual style for a pick cell
   * Visual States:
   * - Selected: Blue background (primary.main)
   * - Current Pick: Orange background (warning.light)
   * - Active Pick: Light blue background (info.light)
   * - Available Pick: White or light grey based on round type
   * - Unavailable Pick: Grey background (grey.200)
   * - Completed Pick: Green outline (success.main)
   * 
   * Hover Effects:
   * - Only available picks show hover effects
   * - Slight elevation and color change on hover
   * - Different hover colors based on pick state
   * 
   * Border Rules:
   * - Left border for first round and normal rounds
   * - Right border for snake rounds
   * - Creates visual separation between normal and snake rounds
   */
  const getPickStyle = (round: number, pickNumber: number, pick: DraftPosition) => {
    const isSelected = round === selectedRound && pickNumber === selectedPick;
    const isCurrent = pick.overallPickNumber === activeDraft.currentOverallPick;
    const isActive = pick.overallPickNumber === activeDraft.activeOverallPick;
    const isAvailable = isPickAvailable(round, pickNumber);
    const isSnakeRound = round % 2 === 0 && activeDraft.isSnakeDraft;
    const isTraded = pick.tradedTo?.length > 0;

    return {
      width: '80px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: isAvailable ? 'pointer' : 'default',
      bgcolor: isActive ? theme.colors.pickState.active.light :
               isSelected ? theme.colors.primary.main :
               isCurrent ? (pick.managerId === currentUser?.id ? theme.colors.primary.dark : theme.colors.primary.dark) :
               isAvailable ? (mode === 'light' ? 
                 (isSnakeRound ? theme.colors.background.elevated.light : theme.colors.background.paper.light) :
                 (isSnakeRound ? theme.colors.background.paper.dark : theme.colors.background.elevated.dark)
               ) : theme.colors.background.elevated.dark,
      color: isActive ? theme.colors.text.primary.light :
             isSelected || isCurrent ? theme.colors.primary.contrastText :
             isAvailable ? (mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark) : 
             theme.colors.text.disabled.dark,
      ...(!isAvailable ? {} : {
        '&:hover': {
          bgcolor: isActive ? theme.colors.pickState.active.light :
                  isSelected ? theme.colors.primary.dark :
                  isCurrent ? theme.colors.primary.dark : 
                  mode === 'light' ? 
                    (isSnakeRound ? theme.colors.background.elevated.dark : theme.colors.action.hover.light) :
                    (isSnakeRound ? theme.colors.background.elevated.dark : theme.colors.action.hover.dark),
          transform: 'translateY(-1px)',
          transition: 'all 0.2s'
        }
      }),
      borderLeft: round === 1 || !isSnakeRound ? 1 : 0,
      borderRight: isSnakeRound ? 1 : 0,
      borderColor: 'divider',
      outline: pick.isComplete ? '2px solid' : 'none',
      outlineColor: theme.colors.primary.main,
      outlineOffset: '-2px',
      // Add italic style for traded picks
      fontStyle: isTraded ? 'italic' : 'normal'
    };
  };

  const maxPicksPerRound = Math.max(...activeDraft.rounds.map(r => r.picks.length));

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex' }}>
        {/* Round number column */}
        <Box sx={{ width: '60px', mr: 1 }}>
          <Box sx={{ height: '24px', mb: 1 }} /> {/* Spacer for header row */}
          <Box sx={{ 
            display: 'grid',
            gap: 0.5,
            gridTemplateRows: `repeat(${activeDraft.rounds.length}, 32px)`
          }}>
          {activeDraft.rounds.map((round) => (
            <Box 
              key={`round-${round.roundNumber}`}
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pr: 1
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                R{round.roundNumber}
              </Typography>
            </Box>
          ))}
          </Box>
        </Box>

        {/* Main grid */}
        <Box sx={{ flex: 1 }}>
          {/* Pick numbers header */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${maxPicksPerRound}, 80px)`,
            mb: 0,
            gap: 0.5
          }}>
            {activeDraft.rounds[0].picks.map((pick) => (
              <Box 
                key={`header-${pick.pickNumber}`}
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '24px',
                  bgcolor: theme.colors.background.elevated.dark,
                  borderRadius: '4px 4px 0 0',
                  borderBottom: `2px solid ${theme.colors.primary.main}`
                }}
              >
                <Typography variant="caption" sx={{ color: theme.colors.text.primary.dark, fontWeight: 500 }}>
                  {pick.pickNumber}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Separator */}
          <Box sx={{ 
            height: '2px', 
            bgcolor: theme.colors.primary.main, 
            mb: 1 
          }} />

          {/* Grid content */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${maxPicksPerRound}, 80px)`,
            gap: 0.5
          }}>
            {activeDraft.rounds.map((round) => (
              <Box key={round.roundNumber} sx={{ display: 'contents' }}>
                {round.picks.map((pick) => {
                  const isAvailable = isPickAvailable(round.roundNumber, pick.pickNumber);
                  const displayNumber = getDisplayPickNumber(round.roundNumber, pick.pickNumber);
                  const managerName = getManagerName(pick);
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
                        onClick={() => isAvailable && onPickSelect(round.roundNumber, pick.pickNumber)}
                      >
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.75rem',
                            maxWidth: '76px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            fontWeight: 500
                          }}
                        >
                          {managerName}
                        </Typography>
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
