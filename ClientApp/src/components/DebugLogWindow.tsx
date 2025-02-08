import { Box, Button, IconButton, Paper, Typography, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { debugService, LogEntry, LogLevel } from '../services/debugService';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

interface DebugLogWindowProps {
    onClose: () => void;
}

export function DebugLogWindow({ onClose }: DebugLogWindowProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const muiTheme = useMuiTheme();
    const { theme } = useTheme();

    useEffect(() => {
        const updateLogs = (newLogs: LogEntry[]) => {
            setLogs(newLogs);
        };

        debugService.addListener(updateLogs);
        debugService.enablePolling();

        return () => {
            debugService.removeListener(updateLogs);
            debugService.disablePolling();
        };
    }, []);

    const togglePolling = () => {
        if (debugService.isPollingEnabled()) {
            debugService.disablePolling();
        } else {
            debugService.enablePolling();
        }
    };

    const clearLogs = () => {
        debugService.clearLogs();
    };

    return (
        <Paper 
            sx={{ 
                position: 'fixed',
                bottom: 16,
                right: 16,
                width: 600,
                height: 400,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1300
            }}
            elevation={3}
        >
            {/* Header */}
            <Box sx={{ 
                p: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Typography variant="h6" component="div">
                    Debug Logs
                </Typography>
                <Box>
                    <IconButton 
                        onClick={togglePolling}
                        color={debugService.isPollingEnabled() ? 'primary' : 'default'}
                        title={debugService.isPollingEnabled() ? 'Pause Polling' : 'Start Polling'}
                    >
                        {debugService.isPollingEnabled() ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                    <IconButton 
                        onClick={clearLogs}
                        title="Clear Logs"
                    >
                        <DeleteIcon />
                    </IconButton>
                    <IconButton 
                        onClick={onClose}
                        title="Close"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Log Content */}
            <Box sx={{ 
                flex: 1, 
                overflow: 'auto',
                p: 1,
                backgroundColor: theme.colors.background.paper.light
            }}>
                {logs.map((log, index) => (
                    <Box 
                        key={index} 
                        sx={{ 
                            p: 0.5,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            whiteSpace: 'pre-wrap',
                            color: getLogColor(log.level, theme)
                        }}
                    >
                        {(() => {
                            const match = log.message.match(/\[(.*?)\] (.*)/);
                            const category = match ? match[1] : '';
                            const message = match ? match[2] : log.message;
                            return (
                                <>
                                    <Box component="span" sx={{ color: theme.colors.text.secondary.light }}>
                                        [{new Date(log.timestamp).toLocaleTimeString()}]
                                    </Box>
                                    {' '}
                                    <Box component="span" sx={{ color: getLogColor(log.level, theme) }}>
                                        {log.level}
                                    </Box>
                                    {' '}
                                    <Box component="span" sx={{ color: theme.colors.text.secondary.light }}>
                                        {category && `[${category}]`}
                                    </Box>
                                    {' '}
                                    <Box component="span" sx={{ color: theme.colors.text.primary.light }}>
                                        {message}
                                    </Box>
                                </>
                            );
                        })()}
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}

function getLogColor(level: LogLevel, theme: any): string {
    switch (level) {
        case LogLevel.Error:
        case LogLevel.Critical:
            return theme.colors.pickState.selected;
        case LogLevel.Warning:
            return theme.colors.pickState.current;
        case LogLevel.Information:
            return theme.colors.pickState.active;
        case LogLevel.Debug:
        case LogLevel.Trace:
            return theme.colors.text.secondary.light;
        default:
            return theme.colors.text.primary.light;
    }
}
