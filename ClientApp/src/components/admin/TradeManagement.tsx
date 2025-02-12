import { Box, Button, Typography, Snackbar, Alert, List, ListItem, ListItemText, IconButton, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import { useTheme } from '../../contexts/ThemeContext';
import { useState } from 'react';
import { Trade, Manager, TradeStatus } from '../../types/models';
import { TradeModal } from './TradeModal';
import { TradeDetailsPopover } from './TradeDetailsPopover';
import { tradeService } from '../../services/tradeService';
import { apiClient } from '../../services/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { managerService } from '../../services/managerService';
import { draftService } from '../../services/draftService';

export function TradeManagement() {
  const { theme, mode } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<{
    trade: Trade;
    anchorEl: HTMLElement;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const { data: managersResponse, isLoading: isLoadingManagers } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
    staleTime: 0
  });

  const { data: activeDraftResponse, isLoading: isLoadingDraft } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
    staleTime: 0
  });

  const { data: tradesResponse, isLoading: isLoadingTrades } = useQuery({
    queryKey: ['trades'],
    queryFn: () => tradeService.getTrades(),
    staleTime: 0
  });

  const managers = managersResponse?.value ?? [];
  const activeDraft = activeDraftResponse?.value;
  
  const trades = tradesResponse ?? [];

  const queryClient = useQueryClient();

  const getManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager?.name ?? 'Unknown Manager';
  };

  const getTradeDescription = (trade: Trade) => {
    const managerNames = trade.parties.map(party => getManagerName(party.managerId));
    // Debug logging
    console.log('Trade in description:', {
      id: trade.id,
      status: trade.status,
      isCancelled: trade.status === TradeStatus.Cancelled,
      isReversed: trade.status === TradeStatus.Reversed
    });
    return managerNames.join(' ⟷ ');
  };

  const handleCancelTrade = async (tradeId: string) => {
    try {
      await tradeService.cancelTrade(tradeId);
      // Invalidate both trades and activeDraft queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] })
      ]);
      setSnackbar({
        open: true,
        message: 'Trade cancelled and picks returned to original owners',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error cancelling trade:', error);
      const errorMessage = error.response?.data?.message || 'Unable to cancel trade';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleOpenModal = () => {
    if (!activeDraft) {
      setSnackbar({
        open: true,
        message: 'No active draft found. Please activate a draft first.',
        severity: 'error'
      });
      return;
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitTrade = async (trade: Omit<Trade, 'id'>) => {
    try {
      await tradeService.createTrade(trade);
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      setSnackbar({
        open: true,
        message: 'Trade completed successfully',
        severity: 'success'
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error creating trade:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.message || 'Unable to create trade';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleTradeClick = (trade: Trade, event: React.MouseEvent<HTMLLIElement>) => {
    setSelectedTrade({
      trade,
      anchorEl: event.currentTarget
    });
  };

  const handleCloseTradeDetails = () => {
    setSelectedTrade(null);
  };

  if (isLoadingManagers || isLoadingDraft || isLoadingTrades) {
    return (
    <Paper sx={{ p: 4, position: 'relative' }}>
        <Typography>Loading...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ 
        color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark 
      }}>
        Trade Management
      </Typography>

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button 
          variant="contained" 
          onClick={handleOpenModal}
          sx={{
            bgcolor: theme.colors.pickState.current.light,
            '&:hover': {
              bgcolor: theme.colors.pickState.current.dark
            }
          }}
        >
          Create Trade
        </Button>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" sx={{ 
          mb: 1,
          color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark 
        }}>
          Trade History
        </Typography>
        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
          <List>
            {trades.length === 0 ? (
              <ListItem>
                <ListItemText primary="No trades found" />
              </ListItem>
            ) : (
              trades.map((trade) => (
                <ListItem
                  key={trade.id}
                  onClick={(e) => handleTradeClick(trade, e)}
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: (trade.status === TradeStatus.Cancelled || trade.status === TradeStatus.Reversed) ? 
                      (mode === 'light' ? 
                        theme.colors.pickState.selected.light + '15' : 
                        theme.colors.pickState.selected.dark + '15') : 
                      'transparent',
                    '&:hover': {
                      bgcolor: (trade.status === TradeStatus.Cancelled || trade.status === TradeStatus.Reversed) ?
                        (mode === 'light' ? 
                          theme.colors.pickState.selected.light + '25' : 
                          theme.colors.pickState.selected.dark + '25') :
                        (mode === 'light' ? 
                          theme.colors.action.hover.light : 
                          theme.colors.action.hover.dark)
                    }
                  }}
                  secondaryAction={
                    (trade.status !== TradeStatus.Cancelled && trade.status !== TradeStatus.Reversed) && (
                      <IconButton 
                        edge="end" 
                        aria-label="cancel"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelTrade(trade.id!);
                        }}
                        title="Cancel this trade and return picks to original owners"
                        sx={{
                          color: mode === 'light' ? 
                            theme.colors.text.primary.light : 
                            theme.colors.text.primary.dark
                        }}
                      >
                        <UndoIcon />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText
                    primary={`${new Date(trade.timestamp).toLocaleDateString()} - ${getTradeDescription(trade)}`}
                    sx={{
                      color: mode === 'light' ? 
                        theme.colors.text.primary.light : 
                        theme.colors.text.primary.dark,
                      fontStyle: (trade.status === TradeStatus.Cancelled || trade.status === TradeStatus.Reversed) ? 'italic' : 'normal',
                      '& .MuiTypography-root': {
                        textDecoration: (trade.status === TradeStatus.Cancelled || trade.status === TradeStatus.Reversed) ? 'line-through' : 'none'
                      }
                    }}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Box>

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

      {activeDraft && (
        <TradeModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitTrade}
          managers={managers}
          activeDraftId={activeDraft.id!}
        />
      )}

      {selectedTrade && (
        <TradeDetailsPopover
          anchorEl={selectedTrade.anchorEl}
          onClose={handleCloseTradeDetails}
          trade={selectedTrade.trade}
          managers={managers}
        />
      )}
    </Paper>
  );
}
