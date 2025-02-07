import { apiClient } from './apiClient';
import { ApiResponse } from '../types/models';

export enum LogLevel {
    Trace = 'Trace',
    Debug = 'Debug',
    Information = 'Information',
    Warning = 'Warning',
    Error = 'Error',
    Critical = 'Critical',
    None = 'None'
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
}

export class DebugService {
    private logBuffer: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private pollingEnabled = false;
    private pollingInterval: NodeJS.Timeout | null = null;

    enablePolling(interval: number = 2000) {
        if (this.pollingEnabled) return;
        
        this.pollingEnabled = true;
        this.pollingInterval = setInterval(() => {
            this.fetchLogs();
        }, interval);

        // Initial fetch
        this.fetchLogs();
    }

    disablePolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.pollingEnabled = false;
    }

    isPollingEnabled(): boolean {
        return this.pollingEnabled;
    }

    async fetchLogs() {
        if (!this.pollingEnabled) return;

        try {
            const response = await apiClient.get<ApiResponse<LogEntry[]>>('/debug/logs');
            this.logBuffer = response.value;
            this.notifyListeners();
        } catch (error) {
            console.error('Failed to fetch logs', error);
        }
    }

    async clearLogs() {
        try {
            await apiClient.post<ApiResponse<boolean>>('/debug/clear');
            this.logBuffer = [];
            this.notifyListeners();
        } catch (error) {
            console.error('Failed to clear logs', error);
        }
    }

    addListener(callback: (logs: LogEntry[]) => void) {
        this.listeners.push(callback);
        // Send current logs to new listener
        callback(this.logBuffer);
    }

    removeListener(callback: (logs: LogEntry[]) => void) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.logBuffer));
    }
}

// Create a singleton instance
export const debugService = new DebugService();
