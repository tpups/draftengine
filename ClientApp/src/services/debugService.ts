import { apiClient } from './apiClient';

interface DebugSettings {
  enableConsoleLogging: boolean;
}

export const debugService = {
  getSettings: () => 
    apiClient.get<{ value: DebugSettings }>('/debug/settings')
};
