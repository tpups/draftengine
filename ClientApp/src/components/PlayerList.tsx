import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridValueGetter } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert } from '@mui/material';
import { playerService } from '../services/playerService';
import { Player } from '../types/models';

const columns: GridColDef<Player>[] = [
  { 
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 150,
  },
  { 
    field: 'position',
    headerName: 'Position',
    width: 120,
    valueGetter: ({ row }: { row: Player }) => row.position?.join(', '),
  },
  { 
    field: 'mlbTeam',
    headerName: 'Team',
    width: 100,
  },
  { 
    field: 'level',
    headerName: 'Level',
    width: 100,
  },
  { 
    field: 'eta',
    headerName: 'ETA',
    width: 100,
    type: 'number',
  },
  {
    field: 'personalRank',
    headerName: 'My Rank',
    width: 100,
    type: 'number',
  },
  {
    field: 'isDrafted',
    headerName: 'Drafted',
    width: 100,
    type: 'boolean',
  },
  {
    field: 'isHighlighted',
    headerName: 'Highlighted',
    width: 100,
    type: 'boolean',
  },
];

export function PlayerList() {
  const { data: players, isLoading, error } = useQuery({
    queryKey: ['players'],
    queryFn: playerService.getAll,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading players: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 600 }}>
      <DataGrid<Player>
        rows={players ?? []}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25, page: 0 },
          },
          sorting: {
            sortModel: [{ field: 'name', sort: 'asc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50]}
        checkboxSelection
        disableRowSelectionOnClick
        getRowId={(row) => row.id}
      />
    </Box>
  );
}
