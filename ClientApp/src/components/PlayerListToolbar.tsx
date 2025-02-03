import { Box, Button, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FastForwardIcon from '@mui/icons-material/FastForward';
import { Draft } from '../types/models';
import { CurrentPickResponse } from '../services/draftService';
import { config } from '../config/config';

// Helper function to log pick state
const logPickState = (activeDraft: Draft | undefined, currentPick: CurrentPickResponse | undefined, context: string) => {
  if (!config.debug.enableConsoleLogging) return;

  console.log(`[${context}] Pick State:`, {
    active: activeDraft ? {
      round: activeDraft.activeRound,
      pick: activeDraft.activePick,
      overall: activeDraft.activeOverallPick
    } : null,
    current: currentPick ? {
      round: currentPick.round,
      pick: currentPick.pick,
      overall: currentPick.overallPickNumber
    } : null
  });
};

interface PlayerListToolbarProps {
  gridMode: 'prep' | 'draft';
  onGridModeChange: (mode: 'prep' | 'draft') => void;
  onAddPlayer: () => void;
  onResetDraft: () => void;
  currentPick?: CurrentPickResponse;
  activeDraft?: Draft;
  onAdvancePick: (skipCompleted: boolean) => void;
  onPickSelectorClick: (event: React.MouseEvent<HTMLElement>) => void;
  canAdvance: boolean;
  canSkipToIncomplete: boolean;
  getCurrentPickManager: () => { name?: string } | null;
}

export function PlayerListToolbar({
  gridMode,
  onGridModeChange,
  onAddPlayer,
  onResetDraft,
  currentPick,
  activeDraft,
  onAdvancePick,
  onPickSelectorClick,
  canAdvance,
  canSkipToIncomplete,
  getCurrentPickManager
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
        {gridMode === 'draft' && currentPick && (
          <>
            <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
              Round {currentPick.round}, Pick {currentPick.pick} (Overall #{currentPick.overallPickNumber})
              {getCurrentPickManager()?.name && ` - ${getCurrentPickManager()?.name}'s Pick`}
            </Typography>
            <IconButton
              size="small"
              onClick={(event) => {
                logPickState(activeDraft, currentPick, 'Before Edit Pick');
                onPickSelectorClick(event);
              }}
              title="Edit active pick"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                logPickState(activeDraft, currentPick, 'Before Advance Pick');
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
                logPickState(activeDraft, currentPick, 'Before Skip to Incomplete');
                onAdvancePick(true);
              }}
              disabled={!canSkipToIncomplete}
              title="Skip to next incomplete pick"
            >
              <FastForwardIcon fontSize="small" />
            </IconButton>
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
