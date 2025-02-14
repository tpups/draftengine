import { Box, Paper } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { DataGrid, GridActionsCellItem, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { Draft, Manager, Player } from '../types/models';
import React, { useState, useCallback, useEffect } from 'react';
import { DraftManagerFlyout } from './DraftManagerFlyout';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import GavelIcon from '@mui/icons-material/Gavel';
import UndoIcon from '@mui/icons-material/Undo';
import { calculateBaseballAge, CURRENT_BASEBALL_SEASON } from '../utils/dateUtils';
import { getDisplayPickNumber } from '../utils/draftUtils';

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
  onPlayerUndraft: (id: string) => void;
  canDraft: (playerId: string) => boolean;
  totalCount: number;
  onPaginationChange: (model: { page: number; pageSize: number }) => void;
  currentPage: number;
  noRowsOverlay?: React.ReactNode;
}

const PlayerListGridComponent = React.memo(function PlayerListGridInner({
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
  onPlayerUndraft,
  canDraft,
  totalCount,
  onPaginationChange,
  currentPage,
  noRowsOverlay
}: PlayerListGridProps): JSX.Element {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  // Convert 1-based page from API to 0-based for DataGrid
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 100,
    page: currentPage - 1, // Convert 1-based to 0-based
  });

  // Keep local state in sync with parent's page
  useEffect(() => {
    setPaginationModel(prev => ({
      ...prev,
      page: currentPage - 1 // Convert 1-based to 0-based
    }));
  }, [currentPage]);
  const { theme, mode } = useTheme();

  const handlePlayerClick = useCallback((id: string | undefined) => {
    const player = players.find(p => p.id === id);
    if (player) {
      onPlayerClick(player);
    }
  }, [players, onPlayerClick]);

  const handlePlayerEdit = useCallback((id: string | undefined) => {
    const player = players.find(p => p.id === id);
    if (player) {
      onPlayerEdit(player);
    }
  }, [players, onPlayerEdit]);

  const handlePlayerDelete = useCallback((id: string | undefined) => {
    if (id) {
      onPlayerDelete(id);
    }
  }, [onPlayerDelete]);

  const handlePlayerHighlight = useCallback((id: string | undefined) => {
    if (id) {
      onPlayerHighlight(id);
    }
  }, [onPlayerHighlight]);

  const handlePlayerUndraft = useCallback((id: string | undefined) => {
    if (id) {
      onPlayerUndraft(id);
    }
  }, [onPlayerUndraft]);

  const handleDraftClick = useCallback((event: React.MouseEvent<HTMLElement>, playerId: string, rowId: string) => {
    event.stopPropagation();
    setSelectedPlayerId(playerId);
    setAnchorEl(event.currentTarget);
    setFlyoutOpen(true);
    setHoveredRowId(rowId);
  }, []);

  const handleManagerSelect = useCallback((managerId: string) => {
    if (selectedPlayerId) {
      onPlayerDraft(selectedPlayerId, managerId);
    }
    setSelectedPlayerId(null);
    setFlyoutOpen(false);
    setAnchorEl(null);
    setHoveredRowId(null);
  }, [selectedPlayerId, onPlayerDraft]);

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
      draftPick: draftStatus?.isDrafted && activeDraft ? 
        getDisplayPickNumber(activeDraft, draftStatus.pick, draftStatus.round) : null,
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
    
    if (params.row.id === hoveredRowId) {
      classes.push('force-hover');
    }
    
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

  const getActions = useCallback((params: GridRowParams<GridPlayer>): React.ReactElement[] => {
    if (gridMode === 'draft') {
      const actions: React.ReactElement[] = [];
      
      if (!params.row.draftStatus?.isDrafted) {
        const canMakePick = canDraft(params.row.id!);
        actions.push(
          <GridActionsCellItem
            key="draft"
            icon={<GavelIcon sx={{ 
              color: canMakePick ? theme.colors.primary.main : theme.colors.text.disabled.dark,
              fontSize: '1.5rem',
              '&:hover': canMakePick ? {
                transform: 'scale(1.2)',
                transition: 'transform 0.2s'
              } : {}
            }} />}
            disabled={!canMakePick}
            onClick={(event) => handleDraftClick(event, params.row.id!.toString(), params.row.id!.toString())}
            label="Draft"
            title={canMakePick ? "Draft this player" : "No active draft or current pick"}
          />
        );
      } else {
        actions.push(
          <GridActionsCellItem
            key="undraft"
            icon={<UndoIcon sx={{ 
              color: theme.colors.pickState.selected.light,
              fontSize: '1.5rem',
              '&:hover': {
                transform: 'scale(1.2)',
                transition: 'transform 0.2s'
              }
            }} />}
            onClick={() => handlePlayerUndraft(params.row.id)}
            label="Undraft"
            title="Undo pick"
          />
        );
      }
      
      return actions;
    }

    return [
      <GridActionsCellItem
        key="highlight"
        icon={params.row.isHighlighted ? (
          <StarIcon sx={{ 
            color: mode === 'light' ? theme.colors.pickState.active.light : theme.colors.pickState.active.dark,
            '&:hover': {
              transform: 'scale(1.2)',
              transition: 'transform 0.2s'
            }
          }} />
        ) : (
          <StarBorderIcon sx={{ 
            color: mode === 'light' ? theme.colors.pickState.active.light : theme.colors.pickState.active.dark,
            '&:hover': {
              transform: 'scale(1.2)',
              transition: 'transform 0.2s'
            }
          }} />
        )}
        label="Toggle Highlight"
        onClick={() => handlePlayerHighlight(params.row.id)}
        title="Toggle highlight status"
      />,
      <GridActionsCellItem
        key="edit"
        icon={<EditIcon sx={{ 
          color: theme.colors.primary.main,
          '&:hover': {
            transform: 'scale(1.2)',
            transition: 'transform 0.2s'
          }
        }} />}
        label="Edit"
        onClick={() => handlePlayerEdit(params.row.id)}
        title="Edit this player"
      />,
      <GridActionsCellItem
        key="delete"
        icon={<DeleteIcon sx={{ 
          color: mode === 'light' ? theme.colors.pickState.selected.light : theme.colors.pickState.selected.dark,
          '&:hover': {
            transform: 'scale(1.2)',
            transition: 'transform 0.2s'
          }
        }} />}
        label="Delete"
        onClick={() => handlePlayerDelete(params.row.id)}
        title="Delete this player"
      />
    ];
  }, [gridMode, theme, mode, handlePlayerHighlight, handlePlayerEdit, handlePlayerDelete, handlePlayerUndraft, handleDraftClick, canDraft]);

  const columns: GridColDef<GridPlayer>[] = [
    {
      field: 'rank',
      headerName: 'Rank',
      width: 80,
      type: 'number' as const,
      align: 'center' as const,
      headerAlign: 'center' as const
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
            color: 'inherit',
            fontWeight: 500,
            '&:hover': {
              textDecoration: 'underline',
              opacity: 0.9
            }
          }}
          onClick={() => handlePlayerClick(params.row.id)}
        >
          {params.row.name}
        </Box>
      )
    },
    {
      field: 'position',
      headerName: 'Position',
      width: 120,
      align: 'center' as const,
      headerAlign: 'center' as const
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 80,
      type: 'number' as const,
      align: 'center' as const,
      headerAlign: 'center' as const
    },
    {
      field: 'mlbTeam',
      headerName: 'Team',
      width: 100,
      align: 'center' as const,
      headerAlign: 'center' as const
    },
    {
      field: 'level',
      headerName: 'Level',
      width: 100,
      align: 'center' as const,
      headerAlign: 'center' as const
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 140,
      getActions
    },
    ...(gridMode === 'draft' ? [
      {
        field: 'draftRound',
        headerName: 'Round',
        width: 80,
        type: 'number' as const,
        align: 'center' as const,
        headerAlign: 'center' as const
      },
      {
        field: 'draftPick',
        headerName: 'Pick',
        width: 80,
        type: 'number' as const,
        align: 'center' as const,
        headerAlign: 'center' as const
      },
      {
        field: 'draftingManagerName',
        headerName: 'Drafted By',
        flex: 1,
        minWidth: 150
      }
    ] : [])
  ];

  return (
    <>
      <Paper 
        elevation={0} 
        sx={{
        position: 'relative',
        width: '100%',
        flex: 1,
        bgcolor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.paper.dark,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <DataGrid
          getRowClassName={getRowClassName}
          rows={gridData}
          columns={columns}
          autoHeight={false}
          checkboxSelection={false}
          disableRowSelectionOnClick={true}
          rowHeight={46}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => {
            setPaginationModel(model);
            onPaginationChange(model);
          }}
          paginationMode="server"
          rowCount={totalCount}
          getRowSpacing={() => ({
            top: 0,
            bottom: 0
          })}
          slots={{
            noRowsOverlay: () => noRowsOverlay || (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
              }}>
                No players available
              </Box>
            )
          }}
          sx={{
            border: 'none',
            bgcolor: 'transparent',
            position: 'relative',
            borderRadius: 0,
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
              borderRadius: '12px'
            },
            '& ::-webkit-scrollbar-thumb': {
              backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
              borderRadius: '12px',
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
              borderRadius: '12px'
            },
            '& .MuiDataGrid-virtualScroller': {
              border: 'none',
              backgroundColor: 'transparent',
              marginRight: '24px',
              paddingBottom: '24px',
              borderRadius: '12px',
              marginTop: '56px', // Add margin to prevent scrollbar from overlapping header
              '&:after': {
                display: 'none'
              }
            },
            '& .MuiDataGrid-row': {
              bgcolor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.paper.dark,
              color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
              margin: 0,
              padding: 0,
              '&:hover, &.MuiDataGrid-row:hover, &.force-hover': {
                backgroundColor: `${mode === 'light' ? theme.colors.action.hover.light : theme.colors.action.hover.dark} !important`
              },
              position: 'relative'
            },
            '& .MuiDataGrid-cell': {
              fontSize: '1rem',
              borderBottom: 'none',
              borderTop: 'none',
              padding: '8px 16px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:focus': {
                outline: 'none'
              },
              '&[data-field="name"], &[data-field="draftingManagerName"]': {
                justifyContent: 'flex-start'
              }
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: '1rem',
              fontWeight: 600,
              color: 'inherit',
              boxShadow: 'none',
              borderBottom: `1px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.text.disabled.dark}`,
              display: 'flex',
              justifyContent: 'center',
              '&[data-field="name"], &[data-field="draftingManagerName"]': {
                justifyContent: 'flex-start'
              }
            },
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.paper.dark,
              color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
              borderBottom: `2px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.text.disabled.dark}`,
              '&:not(:last-child)': {
                borderRight: `1px solid ${mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`
              }
            },
            '& .MuiDataGrid-columnHeadersInner': {
              bgcolor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.paper.dark,
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1.5rem'
            },
            '& .drafted-by-user': {
              bgcolor: mode === 'light' ? theme.colors.primary.light : theme.colors.pickState.current.dark,
              '&:hover, &.MuiDataGrid-row:hover, &.force-hover': {
                bgcolor: `${mode === 'light' ? theme.colors.primary.light : theme.colors.pickState.current.dark} !important`,
              },
              position: 'relative',
              zIndex: 2,
              transform: 'none',
              margin: 0,
              borderTop: `3px solid ${mode === 'light' ? theme.colors.pickState.active.dark : theme.colors.pickState.active.light}`,
              borderBottom: `3px solid ${mode === 'light' ? theme.colors.pickState.active.dark : theme.colors.pickState.active.light}`,
              '& .MuiDataGrid-cell': {
                color: theme.colors.primary.contrastText
              }
            },
            '& .drafted-by-other': {
              bgcolor: mode === 'light' ? theme.colors.pickState.current.light : theme.colors.primary.dark,
              '&:hover, &.MuiDataGrid-row:hover, &.force-hover': {
                bgcolor: `${mode === 'light' ? theme.colors.pickState.current.light : theme.colors.primary.main} !important`,
              },
              '& .MuiDataGrid-cell': {
                color: theme.colors.primary.contrastText
              }
            },
            '& .highlighted': {
              bgcolor: mode === 'light' ? theme.colors.pickState.active.light : theme.colors.pickState.active.dark,
              '& .MuiDataGrid-cell': {
                color: theme.colors.primary.contrastText
              },
              '&:hover, &.MuiDataGrid-row:hover, &.force-hover': {
                bgcolor: `${mode === 'light' ? theme.colors.pickState.active.light : theme.colors.pickState.active.dark} !important`,
              }
            },
            '& .highlighted.drafted-by-user': {
              bgcolor: mode === 'light' ? theme.colors.primary.dark : theme.colors.primary.main,
              '& .MuiDataGrid-cell': {
                color: theme.colors.primary.contrastText
              },
              '&:hover, &.MuiDataGrid-row:hover, &.force-hover': {
                bgcolor: `${mode === 'light' ? theme.colors.primary.dark : theme.colors.primary.main} !important`,
              }
            },
            '& .highlighted.drafted-by-other': {
              bgcolor: mode === 'light' ? theme.colors.pickState.current.light : theme.colors.pickState.current.dark,
              '& .MuiDataGrid-cell': {
                color: theme.colors.primary.contrastText
              },
              '&:hover, &.MuiDataGrid-row:hover, &.force-hover': {
                bgcolor: `${mode === 'light' ? theme.colors.pickState.current.light : theme.colors.pickState.current.dark} !important`,
              }
            },
            '& .MuiDataGrid-footerContainer': {
              backgroundColor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.paper.dark,
              color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
              fontWeight: 500,
              fontSize: '0.875rem',
              borderBottom: 'none',
              borderTop: 'none',
              marginRight: '24px'
            }
          }}
        />
      </Paper>
      {activeDraft && (
        <DraftManagerFlyout
          open={flyoutOpen}
          onClose={() => {
            setFlyoutOpen(false);
            setAnchorEl(null);
            setHoveredRowId(null);
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
}, (prevProps: PlayerListGridProps, nextProps: PlayerListGridProps) => {
  const shouldUpdate = (
    prevProps.players !== nextProps.players ||
    prevProps.managers !== nextProps.managers ||
    prevProps.currentUser !== nextProps.currentUser ||
    prevProps.activeDraft !== nextProps.activeDraft ||
    prevProps.gridMode !== nextProps.gridMode ||
    prevProps.currentPage !== nextProps.currentPage ||
    prevProps.totalCount !== nextProps.totalCount ||
    prevProps.noRowsOverlay !== nextProps.noRowsOverlay
  );
  console.debug('[PlayerListGrid] Memo Update', { shouldUpdate });
  return !shouldUpdate;
});

export const PlayerListGrid = PlayerListGridComponent;
