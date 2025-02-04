import { Dialog, DialogTitle, DialogContent, Box, Typography, Paper, IconButton, Popover } from '@mui/material';
import { Manager, Draft, Player } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { managerService } from '../services/managerService';
import { draftService, CurrentPickResponse } from '../services/draftService';
import { playerService } from '../services/playerService';
import EditIcon from '@mui/icons-material/Edit';
import { DraftPickSelector } from './DraftPickSelector';
import { useState, useEffect } from 'react';

interface DraftPlayerModalProps {
  open: boolean;
  onClose: () => void;
  onManagerSelect: (managerId: string) => void;
}

interface ManagerWithPick extends Manager {
  pickNumber: number;
  isCurrentPick: boolean;
  draftedPlayer?: Player;
  isComplete: boolean;
}

export function DraftPlayerModal({ open, onClose, onManagerSelect }: DraftPlayerModalProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedPick, setSelectedPick] = useState<number | null>(null);

  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const { data: activeDraftResponse } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
  });

  const { data: currentPickResponse } = useQuery({
    queryKey: ['currentPick'],
    queryFn: () => draftService.getCurrentPick(),
    enabled: !!activeDraftResponse?.value
  });

  const { data: playersResponse } = useQuery({
    queryKey: ['players'],
    queryFn: () => playerService.getAll(),
  });

  const managers = managersResponse?.value ?? [];
  const activeDraft = activeDraftResponse?.value;
  const currentPick = currentPickResponse?.value;
  const players = playersResponse?.value ?? [];

  // Reset selected pick when modal opens or current pick changes
  useEffect(() => {
    if (open && currentPick) {
      setSelectedRound(currentPick.round);
      setSelectedPick(currentPick.pick);
    }
  }, [open, currentPick]);

  const getCurrentPickManager = () => {
    if (!activeDraft || !currentPick) return null;

    const round = activeDraft.rounds.find(r => r.roundNumber === currentPick.round);
    if (!round) return null;

    const pick = round.picks.find(p => p.pickNumber === currentPick.pick);
    return pick ? managers.find(m => m.id === pick.managerId) : null;
  };

  const currentManager = getCurrentPickManager();

  const getManagersWithPickNumbers = (): ManagerWithPick[] => {
    if (!activeDraft || !selectedRound) return [];

    const round = activeDraft.rounds.find(r => r.roundNumber === selectedRound);
    if (!round) return [];

    return round.picks.map(pick => {
      const manager = managers.find(m => m.id === pick.managerId);
      const draftedPlayer = players.find(p => 
        p.draftStatuses?.some(status => 
          status.isDrafted && 
          status.managerId === pick.managerId && 
          status.round === selectedRound && 
          status.pick === pick.pickNumber &&
          status.draftId === activeDraft.id
        )
      );

      return {
        ...manager!,
        pickNumber: pick.pickNumber,
        isCurrentPick: currentPick?.round === selectedRound && pick.pickNumber === currentPick?.pick,
        draftedPlayer,
        isComplete: pick.isComplete
      };
    });
  };

  const handlePickSelect = (round: number, pick: number) => {
    setSelectedRound(round);
    setSelectedPick(pick);
    setAnchorEl(null);
  };

  const managersInRound = getManagersWithPickNumbers();
  const numColumns = Math.ceil(managersInRound.length / 2);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xl"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography component="span" variant="h6" sx={{ flex: 1 }}>
            Select Manager
          </Typography>
          {selectedRound && currentPick && (
            <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              Round {selectedRound}, Pick {selectedPick}
              {(selectedRound !== currentPick.round || selectedPick !== currentPick.pick) && (
                ` (Current: ${currentPick.round}.${currentPick.pick})`
              )}
            </Typography>
          )}
          <IconButton 
            size="small"
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <EditIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr', // 1 column on mobile
            sm: `repeat(${numColumns}, 1fr)` // Calculated number of columns
          },
          gridTemplateRows: {
            xs: 'auto', // Natural height on mobile
            sm: 'repeat(2, 1fr)' // Exactly 2 rows on larger screens
          },
          gap: 2,
          width: '100%',
          p: 2
        }}>
          {managersInRound.map((manager) => (
            <Paper
              key={`${manager.id}-${manager.pickNumber}`}
              elevation={0}
              sx={{
                p: 1,
                height: '70px',
                cursor: manager.isComplete ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                transition: 'all 0.2s',
                bgcolor: 'grey.100',
                '&:hover': manager.isComplete ? {} : {
                  bgcolor: 'grey.200',
                  transform: 'translateY(-1px)',
                  boxShadow: 1
                },
                ...(manager.isUser && {
                  bgcolor: 'grey.300',
                  '&:hover': manager.isComplete ? {} : {
                    bgcolor: 'grey.400',
                    transform: 'translateY(-1px)',
                    boxShadow: 1
                  }
                }),
                ...(manager.isCurrentPick && {
                  bgcolor: 'warning.light',
                  '&:hover': manager.isComplete ? {} : {
                    bgcolor: 'warning.main',
                    transform: 'translateY(-1px)',
                    boxShadow: 1
                  }
                })
              }}
              onClick={() => !manager.isComplete && onManagerSelect(manager.id!.toString())}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 500,
                    minWidth: '24px'
                  }}
                >
                  {manager.pickNumber}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}
                >
                  {manager.name}
                </Typography>
              </Box>
              {manager.draftedPlayer && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'success.main',
                    fontWeight: 500,
                    ml: 4
                  }}
                >
                  Drafted: {manager.draftedPlayer.name}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      </DialogContent>
      {activeDraft && currentPick && selectedRound && selectedPick && (
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
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
            selectedRound={selectedRound}
            selectedPick={selectedPick}
            onPickSelect={handlePickSelect}
          />
        </Popover>
      )}
    </Dialog>
  );
}
