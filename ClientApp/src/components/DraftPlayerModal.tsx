import { Dialog, DialogTitle, DialogContent, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Manager } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { managerService } from '../services/managerService';

interface DraftPlayerModalProps {
  open: boolean;
  onClose: () => void;
  onManagerSelect: (managerId: string) => void;
}

export function DraftPlayerModal({ open, onClose, onManagerSelect }: DraftPlayerModalProps) {
  const { data: response } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
  });

  const managers = response?.value ?? [];

  const sortManagers = (managers: Manager[]) => {
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
      <DialogTitle>Select Manager</DialogTitle>
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
                width: 200,
                renderCell: (params) => (
                  <Box
                    component="span"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                    onClick={() => {
                      if (params.row.id) {
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
                width: 200
              }
            ]}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
