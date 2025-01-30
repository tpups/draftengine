import { useQuery } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert } from '@mui/material';
import { playerService } from '../services/playerService';
import { Player } from '../types/models';

export function PlayerList() {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const data = await playerService.getAll();
      console.log('API Response:', {
        raw: data,
        value: data?.value,
        firstPlayer: data?.value?.[0]
      });
      return data;
    },
  });

  const players = response?.value ?? [];

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

  if (!players || players.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Alert severity="info">No players available</Alert>
      </Box>
    );
  }

  // Transform data to only include fields we want to display
  const gridData = players.map(player => ({
    id: player.id,
    name: player.name,
    mlbTeam: player.mlbTeam,
    level: player.level
  }));

  console.log('Rendering DataGrid with data:', gridData);

  return (
    <Box sx={{ width: '100%', height: 600, display: 'flex', flexDirection: 'column' }}>
      <DataGrid
        rows={gridData}
        columns={[
          {
            field: 'name',
            headerName: 'Name',
            width: 200
          },
          {
            field: 'mlbTeam',
            headerName: 'Team',
            width: 100
          },
          {
            field: 'level',
            headerName: 'Level',
            width: 100
          }
        ]}
      />
    </Box>
  );
}
