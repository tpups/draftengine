import { Box, Paper, Typography } from '@mui/material';
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
      flex: 0.4,
      type: 'number' as const,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'draftPick',
      headerName: 'Pick',
      flex: 0.4,
      type: 'number' as const,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 2.5,
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
      flex: 0.6,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'level',
      headerName: 'Level',
      flex: 0.6,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'age',
      headerName: 'Age',
      flex: 0.4,
      type: 'number' as const,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'mlbTeam',
      headerName: 'Team',
      flex: 0.6,
      align: 'center',
      headerAlign: 'center'
    }
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: 1,
      height: '100%',
      minWidth: 450,
      maxWidth: 550,
      flex: 1
    }}>
      <Typography variant="h6" sx={{ px: 0.5 }}>
        My Drafted Players ({userDraftedPlayers.length})
      </Typography>
      <Paper elevation={0} sx={{
        width: 'auto',
        flex: 1,
        bgcolor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <Box sx={{
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <DataGrid
            rows={gridData}
            columns={columns}
            autoHeight={true}
            hideFooter={true}
            checkboxSelection={false}
            disableRowSelectionOnClick={true}
            density="compact"
            getRowSpacing={() => ({
              top: 0,
              bottom: 0
            })}
            sx={{
              border: 'none',
              bgcolor: 'transparent',
              position: 'relative',
              borderRadius: '12px',
              height: 'auto',
              overflow: 'hidden',
              '& .MuiDataGrid-root': {
                borderRadius: '12px'
              },
              '& ::-webkit-scrollbar': {
                width: '24px',
                height: '24px',
                position: 'absolute',
                right: 0
              },
              '& ::-webkit-scrollbar-track': {
                background: mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                borderRadius: 0
              },
              '& ::-webkit-scrollbar-thumb': {
                backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
                borderRadius: 0,
                border: '2px solid transparent',
                backgroundClip: 'padding-box'
              },
              '& ::-webkit-scrollbar-thumb:hover': {
                backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'
              },
              '& .MuiDataGrid-main': {
                width: '100%',
                border: 'none',
                backgroundColor: 'transparent',
                borderRadius: 0,
                overflow: 'hidden'
              },
              '& .MuiDataGrid-virtualScroller': {
                border: 'none',
                backgroundColor: 'transparent',
                '&:after': {
                  display: 'none'
                }
              },
              '& .MuiDataGrid-row': {
                bgcolor: mode === 'light' ? theme.colors.primary.light : theme.colors.pickState.current.dark,
                color: theme.colors.primary.contrastText,
                margin: 0,
                padding: 0,
                '&:hover': {
                  backgroundColor: mode === 'light' ? theme.colors.primary.light : theme.colors.pickState.current.dark,
                  opacity: 0.8
                }
              },
              '& .MuiDataGrid-cell': {
                fontSize: '1rem',
                borderBottom: 'none',
                borderTop: 'none',
                padding: '4px 4px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:focus': {
                  outline: 'none'
                },
                '&[data-field="name"]': {
                  justifyContent: 'flex-start'
                }
              },
              '& .MuiDataGrid-columnHeader': {
                fontSize: '1rem',
                fontWeight: 600,
                color: 'inherit',
                boxShadow: 'none',
                padding: '4px 4px',
                display: 'flex',
                justifyContent: 'center',
                borderBottom: `1px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.text.disabled.dark}`,
                '&[data-field="name"]': {
                  justifyContent: 'flex-start'
                }
              },
              '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader': {
                bgcolor: mode === 'light' ? `${theme.colors.primary.main}15` : theme.colors.background.paper.dark,
                color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
                borderBottom: `2px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.text.disabled.dark}`,
                '&:not(:last-child)': {
                  borderRight: `1px solid ${mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`
                }
              },
              '& .MuiDataGrid-footerContainer': {
                backgroundColor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
                color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
                fontWeight: 500,
                fontSize: '0.875rem',
                borderBottom: 'none',
                borderTop: 'none',
                marginRight: '12px'
              }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
