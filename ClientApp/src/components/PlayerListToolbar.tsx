import { Box, Button, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FastForwardIcon from '@mui/icons-material/FastForward';
import { Draft } from '../types/models';
import { PickResponse } from '../services/draftService';
import { config } from '../config/config';

// Helper function to log pick state
const logPickState = (activeDraft: Draft | undefined, context: string) => {
  if (!config.debug.enableConsoleLogging) return;

  console.log(`[${context}] Pick State:`, {
    active: activeDraft ? {
      round: activeDraft.activeRound,
      pick: activeDraft.activePick,
      overall: activeDraft.activeOverallPick
    } : null
  });
};

import { getDisplayPickNumber } from '../utils/draftUtils';

interface PlayerListToolbarProps {
  gridMode: 'prep' | 'draft';
  onGridModeChange: (mode: 'prep' | 'draft') => void;
  onAddPlayer: () => void;
  onResetDraft: () => void;
  activeDraft?: Draft;
  onAdvancePick: (skipCompleted: boolean) => void;
  onPickSelectorClick: (event: React.MouseEvent<HTMLElement>) => void;
  canAdvance: boolean;
  canSkipToIncomplete: boolean;
  getActivePickManager: () => { name?: string, isOriginalOwner?: boolean, originalOwnerName?: string } | null;
}

export function PlayerListToolbar({
  gridMode,
  onGridModeChange,
  onAddPlayer,
  onResetDraft,
  activeDraft,
  onAdvancePick,
  onPickSelectorClick,
  canAdvance,
  canSkipToIncomplete,
  getActivePickManager
}: PlayerListToolbarProps) {
  return (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToggleButtonGroup
          value={gridMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) {
              onGridModeChange(newMode);
            }
          }}
          aria-label="grid mode"
          size="small"
        >
          <ToggleButton value="prep" aria-label="prep mode">
            Prep Mode
          </ToggleButton>
          <ToggleButton value="draft" aria-label="draft mode">
            Draft Mode
          </ToggleButton>
        </ToggleButtonGroup>
        {gridMode === 'draft' && activeDraft && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    logPickState(activeDraft, 'Before Advance Pick');
                    onAdvancePick(false);
                  }}
                  disabled={!canAdvance}
                  title="Next pick"
                >
                  <SkipNextIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    logPickState(activeDraft, 'Before Skip to Incomplete');
                    onAdvancePick(true);
                  }}
                  disabled={!canSkipToIncomplete}
                  title="Skip to next incomplete pick"
                >
                  <FastForwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    logPickState(activeDraft, 'Before Edit Pick');
                    onPickSelectorClick(event);
                  }}
                  title="Edit active pick"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="h6" sx={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Round <Box component="span" sx={{ fontWeight: 600 }}>{activeDraft.activeRound}</Box>, 
                Pick <Box component="span" sx={{ fontWeight: 600 }}>{getDisplayPickNumber(activeDraft, activeDraft.activePick ?? 0)}</Box>
                <Box component="span" sx={{ opacity: 0.8 }}>(Overall #{activeDraft.activeOverallPick})</Box>
                {getActivePickManager()?.name && (
                  <>
                    <Box component="span" sx={{ ml: 1 }}>
                      -
                    </Box>
                    <Box component="span" sx={{ 
                      fontStyle: !getActivePickManager()?.isOriginalOwner ? 'italic' : 'normal',
                      color: 'inherit',
                      ml: 1
                    }}>
                      {getActivePickManager()?.name}'s Pick
                      {!getActivePickManager()?.isOriginalOwner && ` (Original Owner: ${getActivePickManager()?.originalOwnerName})`}
                    </Box>
                  </>
                )}
              </Typography>
            </Box>
          </>
        )}
      </Box>
      <Box>
        {gridMode === 'prep' ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddPlayer}
            sx={{
              '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.2s'
              }
            }}
          >
            Add Player
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="warning"
            onClick={onResetDraft}
            sx={{
              '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.2s'
              }
            }}
          >
            Reset Draft Status
          </Button>
        )}
      </Box>
    </Box>
  );
}
