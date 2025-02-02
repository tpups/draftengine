import { Dialog, DialogTitle, DialogContent, Box, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Manager, Draft } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { managerService } from '../services/managerService';
import { draftService, CurrentPickResponse } from '../services/draftService';

interface DraftPlayerModalProps {
  open: boolean;
  onClose: () => void;
  onManagerSelect: (managerId: string) => void;
}

export function DraftPlayerModal({ open, onClose, onManagerSelect }: DraftPlayerModalProps) {
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

  const managers = managersResponse?.value ?? [];
  const activeDraft = activeDraftResponse?.value;
  const currentPick = currentPickResponse?.value;

  const getCurrentPickManager = () => {
    if (!activeDraft || !currentPick) return null;

    const round = activeDraft.rounds.find(r => r.roundNumber === currentPick.round);
    if (!round) return null;

    const pick = round.picks.find(p => p.pickNumber === currentPick.pick);
    return pick ? managers.find(m => m.id === pick.managerId) : null;
  };

  const currentManager = getCurrentPickManager();

  const sortManagers = (managers: Manager[]) => {
    // If we have a current manager, only show them
    if (currentManager) {
      return managers.filter(m => m.id === currentManager.id);
    }

    // Otherwise show all managers sorted with user first
    return [...managers].sort((a, b) => {
      if (a.isUser && !b.isUser) return -1;
      if (!a.isUser && b.isUser) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Select Manager
        {currentPick && (
          <Typography variant="subtitle1" color="text.secondary">
            Round {currentPick.round}, Pick {currentPick.pick}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ height: 400, width: '100%', mt: 2 }}>
          <DataGrid
            rows={sortManagers(managers)}
            getRowClassName={(params) => params.row.isUser ? 'user-manager-row' : ''}
            sx={{
              '& .user-manager-row': {
                bgcolor: 'primary.light',
                '&:hover': {
                  bgcolor: 'primary.light',
                }
              }
            }}
            columns={[
              {
                field: 'name',
                headerName: 'Name',
                flex: 1,
                renderCell: (params) => (
                  <Box
                    component="span"
                    sx={{
                      cursor: currentManager?.id === params.row.id ? 'pointer' : 'not-allowed',
                      color: currentManager?.id === params.row.id ? 'primary.main' : 'text.disabled',
                      '&:hover': {
                        textDecoration: currentManager?.id === params.row.id ? 'underline' : 'none'
                      }
                    }}
                    onClick={() => {
                      if (params.row.id && currentManager?.id === params.row.id) {
                        onManagerSelect(params.row.id.toString());
                      }
                    }}
                  >
                    {params.value}
                  </Box>
                )
              },
              {
                field: 'teamName',
                headerName: 'Team',
                flex: 1
              }
            ]}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
