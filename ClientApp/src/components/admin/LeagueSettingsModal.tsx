import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import { LeagueSettings } from '../../types/models';
import { leagueSettingsService } from '../../services/leagueSettingsService';

interface LeagueSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

export function LeagueSettingsModal({ open, onClose }: LeagueSettingsModalProps) {
    const [settings, setSettings] = useState<LeagueSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setLoading(true);
            setError(null);
            leagueSettingsService.getSettings()
                .then(settings => {
                    setSettings(settings);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error loading league settings:', err);
                    setError('Failed to load settings');
                    setSettings({ minGamesForPosition: 10 }); // Default fallback
                    setLoading(false);
                });
        }
    }, [open]);

    const handleSave = async () => {
        if (!settings) return;
        
        try {
            await leagueSettingsService.updateSettings(settings);
            onClose();
        } catch (error) {
            console.error('Error saving league settings:', error);
            setError('Failed to save settings');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>League Settings</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ pt: 2, pb: 2 }}>Loading settings...</Box>
                ) : error ? (
                    <Box sx={{ pt: 2, pb: 2, color: 'error.main' }}>{error}</Box>
                ) : settings ? (
                    <Box sx={{ pt: 2 }}>
                        <TextField
                        label="Minimum Games for Position Eligibility"
                        type="number"
                        value={settings.minGamesForPosition}
                        onChange={(e) => setSettings({
                            ...settings,
                            minGamesForPosition: parseInt(e.target.value) || 0
                        })}
                        fullWidth
                        disabled={loading}
                        inputProps={{ min: 0 }}
                        helperText="Number of games a player must play at a position to be listed at that position"
                        />
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
