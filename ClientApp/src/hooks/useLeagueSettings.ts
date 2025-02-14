import { useState, useEffect } from 'react';
import { LeagueSettings } from '../types/models';
import { leagueSettingsService } from '../services/leagueSettingsService';

export function useLeagueSettings() {
    const [settings, setSettings] = useState<LeagueSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await leagueSettingsService.getSettings();
                setSettings(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load league settings');
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    return { settings, loading, error };
}
