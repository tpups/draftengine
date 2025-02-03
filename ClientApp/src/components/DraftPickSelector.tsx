import { Box, Paper, Tooltip, Typography } from '@mui/material';
import { Draft, Manager, DraftPosition } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { managerService } from '../services/managerService';
import { config } from '../config/config';

interface DraftPickSelectorProps {
  activeDraft: Draft;
  currentRound: number;
  currentPick: number;
  selectedRound: number;
  selectedPick: number;
  onPickSelect: (round: number, pick: number) => void;
}

export function DraftPickSelector({
  activeDraft,
  currentRound,
  currentPick,
  selectedRound,
  selectedPick,
  onPickSelect
}: DraftPickSelectorProps) {
  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const managers = managersResponse?.value ?? [];

  const getManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager?.name ?? '';
  };

  const getDisplayPickNumber = (round: number, actualPickNumber: number) => {
    const totalManagers = activeDraft.draftOrder.length;
    if (round % 2 === 0 && activeDraft.isSnakeDraft) {
      return totalManagers - actualPickNumber + 1;
    }
    return actualPickNumber;
  };

  // Build pick availability dictionary
  const getPickAvailability = () => {
    const availability: Record<number, { [key: number]: boolean; pickOrder: number[] }> = {};

    activeDraft.rounds.forEach(round => {
      const roundNum = round.roundNumber;
      availability[roundNum] = {
        pickOrder: round.picks.map(p => p.pickNumber),
      };

      round.picks.forEach(pick => {
        const isAvailable = (() => {
          // Can't select completed picks
          if (pick.isComplete) return false;

          // Can't select picks beyond current overall pick
          if (pick.overallPickNumber > activeDraft.currentOverallPick) return false;

          // Past picks are available
          return true;
        })();

        availability[roundNum][pick.pickNumber] = isAvailable;
      });
    });

    if (config.debug.enableConsoleLogging) {
      console.log('Pick Availability:', availability);
    }

    return availability;
  };

  const pickAvailability = getPickAvailability();

  const isPickAvailable = (round: number, pickNumber: number) => {
    return pickAvailability[round]?.[pickNumber] ?? false;
  };

  const getPickStyle = (round: number, pickNumber: number, pick: DraftPosition) => {
    const isSelected = round === selectedRound && pickNumber === selectedPick;
    const isCurrent = pick.overallPickNumber === activeDraft.currentOverallPick;
    const isActive = pick.overallPickNumber === activeDraft.activeOverallPick;
    const isAvailable = isPickAvailable(round, pickNumber);
    const isSnakeRound = round % 2 === 0 && activeDraft.isSnakeDraft;

    return {
      width: '80px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: isAvailable ? 'pointer' : 'default',
      bgcolor: isSelected ? 'primary.main' : 
               isCurrent ? 'warning.light' :
               isActive ? 'info.light' :
               isAvailable ? (isSnakeRound ? 'grey.100' : 'background.paper') : 'grey.200',
      color: isSelected ? 'common.white' : 
             isAvailable ? 'text.primary' : 'text.disabled',
      ...(!isAvailable ? {} : {
        '&:hover': {
          bgcolor: isSelected ? 'primary.dark' : 
                  isCurrent ? 'warning.main' : 
                  isActive ? 'info.main' :
                  isSnakeRound ? 'grey.200' : 'action.hover',
          transform: 'translateY(-1px)',
          transition: 'all 0.2s'
        }
      }),
      borderLeft: round === 1 || !isSnakeRound ? 1 : 0,
      borderRight: isSnakeRound ? 1 : 0,
      borderColor: 'divider'
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
                  bgcolor: 'primary.light',
                  borderRadius: '4px 4px 0 0',
                  color: 'primary.contrastText'
                }}
              >
                <Typography variant="caption" sx={{ color: 'primary.contrastText', fontWeight: 500 }}>
                  {pick.pickNumber}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Separator */}
          <Box sx={{ 
            height: '2px', 
            bgcolor: 'primary.light', 
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
                  const managerName = getManagerName(pick.managerId);
                  return (
                    <Tooltip
                      key={`${round.roundNumber}-${pick.pickNumber}`}
                      title={`Round ${round.roundNumber}, Pick ${displayNumber} (Overall #${pick.overallPickNumber}) - ${managerName}`}
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
