import { Box } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { Draft, Manager, Player } from '../types/models';
import { useState } from 'react';
import { DraftManagerFlyout } from './DraftManagerFlyout';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import GavelIcon from '@mui/icons-material/Gavel';
import { calculateBaseballAge, CURRENT_BASEBALL_SEASON } from '../utils/dateUtils';

interface GridPlayer {
  id?: string;
  name: string;
  position: string;
  mlbTeam?: string;
  level?: string;
  rank: number | null;
  age: number | null;
  draftingManagerName: string;
  draftRound?: number | null;
  draftPick?: number | null;
  draftStatus?: {
    draftId: string;
    isDrafted: boolean;
    round: number;
    pick: number;
    overallPick: number;
    managerId: string;
  } | null;
  isHighlighted?: boolean;
  notes?: string | null;
  personalRank?: number | null;
  starsRating?: number | null;
}

interface PlayerListGridProps {
  gridMode: 'prep' | 'draft';
  players: Player[];
  managers: Manager[];
  currentUser?: Manager;
  activeDraft?: Draft;
  onPlayerClick: (player: Player) => void;
  onPlayerEdit: (player: Player) => void;
  onPlayerDelete: (id: string) => void;
  onPlayerHighlight: (id: string) => void;
  onPlayerDraft: (id: string, managerId: string) => void;
  canDraft: (playerId: string) => boolean;
}

export function PlayerListGrid({
  gridMode,
  players,
  managers,
  currentUser,
  activeDraft,
  onPlayerClick,
  onPlayerEdit,
  onPlayerDelete,
  onPlayerHighlight,
  onPlayerDraft,
  canDraft
}: PlayerListGridProps) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleDraftClick = (event: React.MouseEvent<HTMLElement>, playerId: string) => {
    event.stopPropagation();
    setSelectedPlayerId(playerId);
    setAnchorEl(event.currentTarget);
    setFlyoutOpen(true);
  };

  const handleManagerSelect = (managerId: string) => {
    if (selectedPlayerId) {
      onPlayerDraft(selectedPlayerId, managerId);
    }
    setSelectedPlayerId(null);
    setFlyoutOpen(false);
    setAnchorEl(null);
  };
  const gridData: GridPlayer[] = players.map(player => {
    const draftStatus = player.draftStatuses?.find(ds => ds.draftId === activeDraft?.id);
    const draftingManager = draftStatus
      ? managers.find((m: Manager) => m.id === draftStatus.managerId)
      : null;

    return {
      id: player.id,
      name: player.name,
      mlbTeam: player.mlbTeam,
      level: player.level,
      rank: player.rank?.['steamer_2025'] || null,
      age: calculateBaseballAge(player.birthDate, CURRENT_BASEBALL_SEASON),
      position: player.position?.join(', ') || '',
      draftingManagerName: draftStatus?.isDrafted ? (draftingManager?.name ?? '[Manager Deleted]') : '',
      draftRound: draftStatus?.isDrafted ? draftStatus.round : null,
      draftPick: draftStatus?.isDrafted ? draftStatus.pick : null,
      draftStatus: draftStatus && draftStatus.isDrafted ? {
        draftId: draftStatus.draftId,
        isDrafted: true,
        round: draftStatus.round,
        pick: draftStatus.pick,
        overallPick: draftStatus.overallPick,
        managerId: draftStatus.managerId
      } : null,
      isHighlighted: player.isHighlighted,
      notes: player.notes,
      personalRank: player.personalRank,
      starsRating: player.starsRating
    };
  });

  const getRowClassName = (params: GridRowParams<GridPlayer>) => {
    if (!params?.row) return '';
    
    const classes: string[] = [];
    
    if (params.row.isHighlighted) {
      classes.push('highlighted');
    }
    
    if (params.row.draftStatus?.isDrafted && params.row.draftStatus?.managerId) {
      if (params.row.draftStatus.managerId === currentUser?.id) {
        classes.push('drafted-by-user');
      } else {
        classes.push('drafted-by-other');
      }
    }
    
    return classes.join(' ');
  };

  const columns: GridColDef<GridPlayer>[] = [
    {
      field: 'rank',
      headerName: 'Rank',
      width: 80,
      type: 'number' as const
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params: GridRenderCellParams<GridPlayer>) => (
        <Box
          component="span"
          sx={{
            cursor: 'pointer',
            color: 'primary.main',
            '&:hover': {
              textDecoration: 'underline'
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
      headerName: 'Position',
      width: 120
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 80,
      type: 'number' as const
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
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params: GridRowParams<GridPlayer>) => {
        if (gridMode === 'draft') {
          if (!params.row.draftStatus?.isDrafted) {
            const canMakePick = canDraft(params.row.id!);
            return [
              <GridActionsCellItem
                icon={<GavelIcon sx={{ 
                  color: canMakePick ? 'primary.main' : 'text.disabled',
                  '&:hover': canMakePick ? {
                    transform: 'scale(1.2)',
                    transition: 'transform 0.2s'
                  } : {}
                }} />}
                disabled={!canMakePick}
                onClick={(event) => handleDraftClick(event, params.row.id!.toString())}
                label="Draft"
                title={canMakePick ? "Draft this player" : "No active draft or current pick"}
              />
            ];
          }
          return [];
        }

        return [
          <GridActionsCellItem
            icon={params.row.isHighlighted ? (
              <StarIcon sx={{ 
                color: 'warning.main',
                '&:hover': {
                  transform: 'scale(1.2)',
                  transition: 'transform 0.2s'
                }
              }} />
            ) : (
              <StarBorderIcon sx={{ 
                color: 'warning.main',
                '&:hover': {
                  transform: 'scale(1.2)',
                  transition: 'transform 0.2s'
                }
              }} />
            )}
            label="Toggle Highlight"
            onClick={() => onPlayerHighlight(params.row.id!.toString())}
            title="Toggle highlight status"
          />,
          <GridActionsCellItem
            icon={<EditIcon sx={{ 
              color: 'primary.main',
              '&:hover': {
                transform: 'scale(1.2)',
                transition: 'transform 0.2s'
              }
            }} />}
            label="Edit"
            onClick={() => {
              const player = players.find(p => p.id === params.row.id);
              if (player) {
                onPlayerEdit(player);
              }
            }}
            title="Edit this player"
          />,
          <GridActionsCellItem
            icon={<DeleteIcon sx={{ 
              color: 'error.main',
              '&:hover': {
                transform: 'scale(1.2)',
                transition: 'transform 0.2s'
              }
            }} />}
            label="Delete"
            onClick={() => onPlayerDelete(params.row.id!.toString())}
            title="Delete this player"
          />
        ];
      }
    },
    ...(gridMode === 'draft' ? [
      {
        field: 'draftRound',
        headerName: 'Round',
        width: 80,
        type: 'number' as const
      },
      {
        field: 'draftPick',
        headerName: 'Pick',
        width: 80,
        type: 'number' as const
      },
      {
        field: 'draftingManagerName',
        headerName: 'Drafted By',
        width: 150
      }
    ] : [])
  ];

  return (
    <>
      <DataGrid
      getRowClassName={getRowClassName}
      rows={gridData}
      columns={columns}
      autoHeight={false}
      sx={{
        width: '100%',
        flex: 1,
        '& .MuiDataGrid-main': {
          width: '100%'
        },
        '& .drafted-by-user': {
          bgcolor: 'success.light',
          '&:hover': {
            bgcolor: 'success.light',
          }
        },
        '& .drafted-by-other': {
          bgcolor: 'warning.light',
          '&:hover': {
            bgcolor: 'warning.light',
          }
        },
        '& .highlighted': {
          bgcolor: 'warning.light',
          '&:hover': {
            bgcolor: 'warning.light',
          }
        },
        '& .highlighted.drafted-by-user': {
          bgcolor: 'success.main',
          '&:hover': {
            bgcolor: 'success.main',
          }
        },
        '& .highlighted.drafted-by-other': {
          bgcolor: 'warning.main',
          '&:hover': {
            bgcolor: 'warning.main',
          }
        }
      }}
      />
      {activeDraft && (
        <DraftManagerFlyout
          open={flyoutOpen}
          onClose={() => {
            setFlyoutOpen(false);
            setAnchorEl(null);
          }}
          anchorEl={anchorEl}
          activeDraft={activeDraft}
          currentUser={currentUser}
          onManagerSelect={handleManagerSelect}
          managers={managers}
        />
      )}
    </>
  );
}
