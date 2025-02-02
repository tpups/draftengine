import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, TextField, Typography } from '@mui/material';
import { Player, ScoutingGrades } from '../types/models';
import { useState } from 'react';
import { StarRating } from './StarRating';

interface PlayerEditModalProps {
  player: Player | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedPlayer: Player) => void;
}

interface GradeInput {
  label: string;
  field: keyof ScoutingGrades;
}

const HITTER_GRADES: GradeInput[] = [
  { label: 'Hit', field: 'hit' },
  { label: 'Raw Power', field: 'rawPower' },
  { label: 'Game Power', field: 'gamePower' },
  { label: 'Run', field: 'run' },
  { label: 'Arm', field: 'arm' },
  { label: 'Field', field: 'field' }
];

const PITCHER_GRADES: GradeInput[] = [
  { label: 'Fastball', field: 'fastball' },
  { label: 'Slider', field: 'slider' },
  { label: 'Curve', field: 'curve' },
  { label: 'Changeup', field: 'changeup' },
  { label: 'Control', field: 'control' },
  { label: 'Command', field: 'command' }
];

export function PlayerEditModal({ player, open, onClose, onSave }: PlayerEditModalProps) {
  const [editedPlayer, setEditedPlayer] = useState<Player | null>(null);

  // Reset form when player changes
  if (player?.id !== editedPlayer?.id && player) {
    setEditedPlayer(player);
  }

  if (!editedPlayer) return null;

  const handleGradeChange = (field: keyof ScoutingGrades, value: string) => {
    const numValue = value === '' ? null : Number(value);
    setEditedPlayer({
      ...editedPlayer,
      personalGrades: {
        ...editedPlayer.personalGrades,
        [field]: numValue
      }
    });
  };

  const handleSave = () => {
    onSave(editedPlayer);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Edit {editedPlayer.name}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* Star Rating */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Star Rating
            </Typography>
            <StarRating
              value={editedPlayer.starsRating ?? null}
              onChange={(value) => setEditedPlayer({ ...editedPlayer, starsRating: value })}
            />
          </Box>

          {/* Personal Rank */}
          <TextField
            label="Personal Rank"
            type="number"
            value={editedPlayer.personalRank || ''}
            onChange={(e) => setEditedPlayer({ 
              ...editedPlayer, 
              personalRank: e.target.value === '' ? null : Number(e.target.value)
            })}
            fullWidth
          />

          {/* Personal Risk Assessment */}
          <TextField
            label="Personal Risk Assessment"
            value={editedPlayer.personalRiskAssessment || ''}
            onChange={(e) => setEditedPlayer({ 
              ...editedPlayer, 
              personalRiskAssessment: e.target.value
            })}
            fullWidth
            multiline
            rows={2}
          />

          {/* Personal Grades */}
          <Box>
            <Typography variant="h6" gutterBottom>Personal Grades</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {[...HITTER_GRADES, ...PITCHER_GRADES].map(({ label, field }) => (
                <TextField
                  key={field}
                  label={label}
                  type="number"
                  value={editedPlayer.personalGrades?.[field] ?? ''}
                  onChange={(e) => handleGradeChange(field, e.target.value)}
                  inputProps={{ min: 20, max: 80, step: 5 }}
                />
              ))}
            </Box>
          </Box>

          {/* Notes */}
          <TextField
            label="Notes"
            value={editedPlayer.notes || ''}
            onChange={(e) => setEditedPlayer({ ...editedPlayer, notes: e.target.value })}
            fullWidth
            multiline
            rows={4}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
