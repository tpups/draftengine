import { Box, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Draft, Manager, Player } from '../types/models';
import { calculateBaseballAge, CURRENT_BASEBALL_SEASON } from '../utils/dateUtils';
import { getDisplayPickNumber } from '../utils/draftUtils';

interface GridPlayer {
  id?: string;
  name: string;
  position: string;
  mlbTeam?: string;
  level?: string;
  age: number | null;
  draftRound?: number | null;
  draftPick?: number | null;
  overallPick?: number | null;
}

interface UserDraftedPlayersProps {
  players: Player[];
  activeDraft?: Draft;
  currentUser?: Manager;
  onPlayerClick: (player: Player) => void;
}

export function UserDraftedPlayers({
  players,
  activeDraft,
  currentUser,
  onPlayerClick
}: UserDraftedPlayersProps) {
  const { theme, mode } = useTheme();

  const userDraftedPlayers = players
    .filter(player => {
      const draftStatus = player.draftStatuses?.find(ds => ds.draftId === activeDraft?.id);
      return draftStatus?.isDrafted && draftStatus.managerId === currentUser?.id;
    })
    .sort((a, b) => {
      const aStatus = a.draftStatuses?.find(ds => ds.draftId === activeDraft?.id);
      const bStatus = b.draftStatuses?.find(ds => ds.draftId === activeDraft?.id);
      return (bStatus?.overallPick ?? 0) - (aStatus?.overallPick ?? 0);
    });

  const gridData: GridPlayer[] = userDraftedPlayers.map(player => {
    const draftStatus = player.draftStatuses?.find(ds => ds.draftId === activeDraft?.id);

    return {
      id: player.id,
      name: player.name,
      position: player.position?.join(', ') || '',
      mlbTeam: player.mlbTeam,
      level: player.level,
      age: calculateBaseballAge(player.birthDate, CURRENT_BASEBALL_SEASON),
      draftRound: draftStatus?.round,
      draftPick: draftStatus && activeDraft ? 
        getDisplayPickNumber(activeDraft, draftStatus.pick, draftStatus.round) : null,
      overallPick: draftStatus?.overallPick
    };
  });

  const columns: GridColDef<GridPlayer>[] = [
    {
      field: 'draftRound',
      headerName: 'Rd',
      width: 40,
      type: 'number' as const
    },
    {
      field: 'draftPick',
      headerName: 'Pick',
      width: 45,
      type: 'number' as const
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 120,
      renderCell: (params: GridRenderCellParams<GridPlayer>) => (
        <Box
          component="span"
          sx={{
            cursor: 'pointer',
            color: 'inherit',
            fontWeight: 500,
            '&:hover': {
              textDecoration: 'underline',
              opacity: 0.9
            }
          }}
          onClick={() => {
            const player = players.find(p => p.id === params.row.id);
            if (player) {
              onPlayerClick(player);
            }
          }}
        >
          {params.row.name}
        </Box>
      )
    },
    {
      field: 'position',
      headerName: 'Pos',
      width: 45
    },
    {
      field: 'level',
      headerName: 'Level',
      width: 45
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 40,
      type: 'number' as const
    },
    {
      field: 'mlbTeam',
      headerName: 'Team',
      width: 45
    }
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: 1,
      height: '100%',
      minWidth: 300,
      maxWidth: 450,
      flex: 1
    }}>
      <Typography variant="h6" sx={{ px: 0.5 }}>
        My Drafted Players ({userDraftedPlayers.length})
      </Typography>
      <DataGrid
        rows={gridData}
        columns={columns}
        autoHeight={false}
        hideFooter={true}
        checkboxSelection={false}
        disableRowSelectionOnClick={true}
        density="compact"
        sx={{
          flex: 1,
          '& .MuiDataGrid-main': {
            width: '100%'
          },
          '& .MuiDataGrid-cell': {
            fontSize: '0.8125rem',
            px: 1
          },
          '& .MuiDataGrid-columnHeader': {
            fontSize: '0.8125rem',
            px: 1,
            fontWeight: 600,
            color: 'inherit',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          },
          bgcolor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
          '& .MuiDataGrid-row': {
            bgcolor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark,
            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
            '&:hover': {
              backgroundColor: mode === 'light' ? theme.colors.action.hover.light : theme.colors.action.hover.dark
            }
          },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark,
            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
            borderBottom: `1px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.text.disabled.dark}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }
        }}
      />
    </Box>
  );
}
