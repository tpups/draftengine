import { ApiResponse, LeagueSettings } from '../types/models';
import { apiClient } from './apiClient';

const BASE_URL = 'api/leagueSettings';

const leagueSettingsService = {
    getSettings: () => 
        apiClient.get<ApiResponse<LeagueSettings>>(BASE_URL)
            .then(response => response.value),

    updateSettings: (settings: LeagueSettings) =>
        apiClient.put<void>(BASE_URL, settings)
};

export { leagueSettingsService };
