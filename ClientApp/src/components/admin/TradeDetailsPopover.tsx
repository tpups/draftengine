import { Box, Popover, Typography, Button, Snackbar, Alert } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import { Trade, Manager, TradeStatus } from '../../types/models';
import { tradeService } from '../../services/tradeService';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface TradeDetailsPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  trade: Trade;
  managers: Manager[];
}

export function TradeDetailsPopover({
  anchorEl,
  onClose,
  trade,
  managers
}: TradeDetailsPopoverProps) {
  const { theme, mode } = useTheme();
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleDeleteTrade = async () => {
    try {
      await tradeService.deleteTrade(trade.id!);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] })
      ]);
      setSnackbar({
        open: true,
        message: 'Trade permanently deleted',
        severity: 'success'
      });
      onClose();
    } catch (error) {
      console.error('Error deleting trade:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete trade',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager?.name ?? 'Unknown Manager';
  };

  return (
    <>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: 350,
            maxHeight: 400,
            bgcolor: mode === 'light' ? 
              theme.colors.background.paper.light : 
              theme.colors.background.paper.dark,
            p: 2
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6" sx={{ 
            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark 
          }}>
            Trade Details
          </Typography>
          <Typography variant="body2" sx={{
            color: mode === 'light' ? theme.colors.pickState.selected.light : theme.colors.pickState.selected.dark,
            fontStyle: 'italic'
          }}>
            Status: {trade.status}
          </Typography>
        </Box>

        <Typography variant="body2" gutterBottom sx={{ 
          color: mode === 'light' ? theme.colors.text.secondary.light : theme.colors.text.secondary.dark,
          opacity: (trade.status === TradeStatus.Cancelled || trade.status === TradeStatus.Reversed) ? 0.7 : 1
        }}>
          {new Date(trade.timestamp).toLocaleString()}
        </Typography>

        {trade.parties.map((party, index) => (
          <Box key={party.managerId} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ 
              color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
              fontWeight: 600
            }}>
              {getManagerName(party.managerId)} receives:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              {party.assets.map((asset, assetIndex) => (
                <Typography 
                  key={assetIndex} 
                  component="li"
                  variant="body2"
                  sx={{ 
                    color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark 
                  }}
                >
                  Round {asset.roundNumber}, Pick {asset.pickNumber} (Overall: {asset.overallPickNumber})
                </Typography>
              ))}
            </Box>
          </Box>
        ))}

        {trade.notes && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ 
              color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
              fontWeight: 600
            }}>
              Notes:
            </Typography>
            <Typography variant="body2" sx={{ 
              color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
              whiteSpace: 'pre-wrap'
            }}>
              {trade.notes}
            </Typography>
          </Box>
        )}

        {/* Show delete button for all trades */}
        {(
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteTrade}
              sx={{ mt: 2 }}
            >
              Permanently Delete
            </Button>
          </Box>
        )}
      </Popover>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
