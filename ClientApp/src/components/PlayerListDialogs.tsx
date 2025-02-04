import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { Draft, Player } from '../types/models';
import { PlayerDetailsModal } from './PlayerDetailsModal';
import { PlayerEditModal } from './PlayerEditModal';

interface PlayerListDialogsProps {
  addDialogOpen: boolean;
  onAddDialogClose: () => void;
  onPlayerCreate: (player: Omit<Player, 'id'>) => void;
  resetDialogOpen: boolean;
  onResetDialogClose: () => void;
  onResetConfirm: () => void;
  selectedPlayer: Player | null;
  detailsDialogOpen: boolean;
  onDetailsDialogClose: () => void;
  editDialogOpen: boolean;
  onEditDialogClose: () => void;
  onPlayerSave: (player: Player) => void;
  activeDraft?: Draft;
}

export function PlayerListDialogs({
  addDialogOpen,
  onAddDialogClose,
  onPlayerCreate,
  resetDialogOpen,
  onResetDialogClose,
  onResetConfirm,
  selectedPlayer,
  detailsDialogOpen,
  onDetailsDialogClose,
  editDialogOpen,
  onEditDialogClose,
  onPlayerSave,
  activeDraft
}: PlayerListDialogsProps) {
  const initialPlayerState: Omit<Player, 'id'> = {
    name: '',
    position: [],
    rank: {},
    prospectRank: {},
    mlbTeam: '',
    level: '',
    birthDate: '',
    eta: null,
    prospectRisk: {},
    personalRiskAssessment: '',
    scoutingGrades: {},
    personalGrades: {
      hit: null,
      rawPower: null,
      gamePower: null,
      run: null,
      arm: null,
      field: null,
      fastball: null,
      slider: null,
      curve: null,
      changeup: null,
      control: null,
      command: null
    },
    draftStatuses: [],
    lastUpdated: new Date().toISOString(),
    isHighlighted: false,
    notes: null,
    personalRank: null
  };

  const renderAddPlayerDialog = () => (
    <Dialog open={addDialogOpen} onClose={onAddDialogClose}>
      <DialogTitle>Add New Player</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Name"
            value={initialPlayerState.name}
            onChange={(e) => onPlayerCreate({ ...initialPlayerState, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Team"
            value={initialPlayerState.mlbTeam}
            onChange={(e) => onPlayerCreate({ ...initialPlayerState, mlbTeam: e.target.value })}
            fullWidth
          />
          <TextField
            label="Level"
            value={initialPlayerState.level}
            onChange={(e) => onPlayerCreate({ ...initialPlayerState, level: e.target.value })}
            fullWidth
          />
          <TextField
            label="Birth Date"
            type="date"
            value={initialPlayerState.birthDate}
            onChange={(e) => onPlayerCreate({ ...initialPlayerState, birthDate: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Position(s)"
            placeholder="e.g., SS, 2B"
            value={initialPlayerState.position?.join(', ') || ''}
            onChange={(e) => onPlayerCreate({ 
              ...initialPlayerState, 
              position: e.target.value.split(',').map(p => p.trim()).filter(p => p)
            })}
            fullWidth
            helperText="Enter positions separated by commas"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onAddDialogClose}>Cancel</Button>
        <Button 
          onClick={() => onPlayerCreate(initialPlayerState)}
          variant="contained" 
          disabled={!initialPlayerState.name}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderResetDialog = () => (
    <Dialog
      open={resetDialogOpen}
      onClose={onResetDialogClose}
    >
      <DialogTitle sx={{ bgcolor: 'grey.100' }}>Reset Draft</DialogTitle>
      <DialogContent sx={{ bgcolor: 'grey.100' }}>
        <Typography sx={{ mb: 2 }}>
          Are you sure you want to reset the current draft? This will:
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <Typography component="li">Delete all draft picks</Typography>
          <Typography component="li">Clear the draft order</Typography>
          <Typography component="li">Remove all draft progress</Typography>
        </Box>
        <Typography color="error" sx={{ mb: 2 }}>
          This action cannot be undone.
        </Typography>
        {activeDraft && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Draft Details:
            </Typography>
            <Typography>
              Year: {activeDraft.year}
            </Typography>
            <Typography>
              Type: {activeDraft.type}
            </Typography>
            <Typography>
              Total Rounds: {activeDraft.rounds.length}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ bgcolor: 'grey.100', px: 3 }}>
        <Button 
          onClick={onResetDialogClose}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onResetConfirm}
        >
          Reset Draft
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      {renderAddPlayerDialog()}
      {renderResetDialog()}
      <PlayerDetailsModal
        player={selectedPlayer ?? null}
        open={detailsDialogOpen}
        onClose={onDetailsDialogClose}
      />
      <PlayerEditModal
        player={selectedPlayer ?? null}
        open={editDialogOpen}
        onClose={onEditDialogClose}
        onSave={onPlayerSave}
      />
    </>
  );
}
