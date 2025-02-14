import { Box, Popover, Typography, Button, Snackbar, Alert, CircularProgress, Divider, Paper, Chip } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import { Trade, Manager, TradeStatus, Draft, TradeAsset } from '../../types/models';
import { tradeService } from '../../services/tradeService';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

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

  // Get unique draft IDs from all assets
  const draftIds = useMemo(() => {
    const ids = new Set<string>();
    trade.parties.forEach(party => {
      party.assets.forEach(asset => {
        if (asset.draftId) {
          ids.add(asset.draftId);
        }
      });
    });
    return Array.from(ids);
  }, [trade]);

  // Fetch draft info for all drafts
  const draftQueries = useQuery({
    queryKey: ['drafts', draftIds],
    queryFn: async () => {
      const drafts = await Promise.all(
        draftIds.map(id => tradeService.getDraftInfo(id))
      );
      return drafts.reduce((acc, draft) => {
        if (draft?.id) {
          acc[draft.id] = draft;
        }
        return acc;
      }, {} as Record<string, Draft>);
    },
    enabled: draftIds.length > 0
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

  // Get source manager for an asset in multi-party trade
  const getSourceManager = (party: string, asset: TradeAsset) => {
    if (trade.parties.length <= 2 || !trade.assetDistribution) return null;
    
    for (const [fromId, toMap] of Object.entries(trade.assetDistribution)) {
      if (!toMap) continue;
      for (const [toId, assets] of Object.entries(toMap)) {
        if (!assets) continue;
        if (toId === party) {
          const matchingAsset = assets.find(a => 
            a.draftId === asset.draftId && 
            a.roundNumber === asset.roundNumber && 
            a.pickNumber === asset.pickNumber
          );
          if (matchingAsset) {
            return getManagerName(fromId);
          }
        }
      }
    }
    return null;
  };

  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case TradeStatus.Completed:
        return mode === 'light' ? theme.colors.pickState.active.light : theme.colors.pickState.active.dark;
      case TradeStatus.Cancelled:
      case TradeStatus.Reversed:
        return mode === 'light' ? theme.colors.pickState.unavailable.light : theme.colors.pickState.unavailable.dark;
      default:
        return mode === 'light' ? theme.colors.pickState.current.light : theme.colors.pickState.current.dark;
    }
  };

  const getOrdinalSuffix = (num: number | undefined) => {
    if (num === undefined) return '';
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const formatPickInfo = (asset: TradeAsset, draftInfo: Draft | null | undefined, sourceManager?: string | null) => {
    const ordinal = `${asset.roundNumber}${getOrdinalSuffix(asset.roundNumber)}`;
    const originalOwner = sourceManager ? sourceManager : getManagerName(trade.parties.find(p => 
      p.assets.some(a => 
        a.draftId === asset.draftId && 
        a.roundNumber === asset.roundNumber && 
        a.pickNumber === asset.pickNumber
      )
    )?.managerId!);

    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 0.5
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%'
        }}>
          <Typography variant="body1" sx={{
            fontWeight: 500,
            lineHeight: 1.2,
            pr: 1,
            minWidth: 0,
            flex: '1 1 auto'
          }}>
            {originalOwner}'s {ordinal} round {draftInfo?.type ?? ''} {draftInfo?.year ?? ''}
          </Typography>
          {sourceManager && (
            <Box sx={{ flex: '0 0 auto' }}>
              <Chip
                label={`from ${sourceManager}`}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                  color: mode === 'light' ? theme.colors.text.secondary.light : theme.colors.text.secondary.dark,
                  borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
                }}
              />
            </Box>
          )}
        </Box>
        <Typography variant="caption" sx={{
          opacity: 0.8,
          lineHeight: 1
        }}>
          Pick {asset.pickNumber} (Overall: {asset.overallPickNumber})
        </Typography>
      </Box>
    );
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
          elevation: 8,
          sx: {
            width: 400,
            maxHeight: '80vh',
            bgcolor: mode === 'light' ? 
              theme.colors.background.paper.light : 
              theme.colors.background.paper.dark,
            p: 1.5
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1
          }}>
            <Typography variant="h6" sx={{ 
              color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
            }}>
              Trade Details
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={trade.status}
                size="small"
                sx={{
                  bgcolor: getStatusColor(trade.status),
                  color: mode === 'light' ? 
                    theme.colors.text.onHighlight?.light : 
                    theme.colors.text.onHighlight?.dark,
                  fontWeight: 600,
                  height: 24
                }}
              />
              <Typography variant="caption" sx={{ 
                color: mode === 'light' ? theme.colors.text.secondary.light : theme.colors.text.secondary.dark,
                opacity: 0.8
              }}>
                {new Date(trade.timestamp).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ 
            borderColor: mode === 'light' ? 
              'rgba(0, 0, 0, 0.12)' : 
              'rgba(255, 255, 255, 0.12)'
          }} />

          {draftQueries.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
              <CircularProgress size={24} />
            </Box>
          ) : draftQueries.isError ? (
            <Typography color="error" sx={{ p: 1 }}>
              Error loading draft info
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {trade.parties.map((party, index) => (
                <Paper 
                  key={party.managerId}
                  elevation={1}
                  sx={{ 
                    p: 1,
                    bgcolor: mode === 'light' ? 
                      theme.colors.background.elevated.light : 
                      theme.colors.background.elevated.dark
                  }}
                >
                  <Typography variant="subtitle1" sx={{ 
                    color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
                    fontWeight: 600,
                    mb: 0.5
                  }}>
                    {getManagerName(party.managerId)} receives:
                  </Typography>
                  <Box component="ul" sx={{ 
                    mt: 0.25, 
                    mb: 0, 
                    pl: 2,
                    '& > li': {
                      mb: 0.5,
                      '&:last-child': {
                        mb: 0
                      }
                    }
                  }}>
                    {party.assets.map((asset, assetIndex) => {
                      const draftInfo = asset.draftId ? draftQueries.data?.[asset.draftId] : null;
                      const sourceManager = getSourceManager(party.managerId, asset);
                      return (
                        <Typography 
                          key={assetIndex} 
                          component="li"
                          variant="body2"
                          sx={{ 
                            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.25
                          }}
                        >
                          {formatPickInfo(asset, draftInfo, sourceManager)}
                        </Typography>
                      );
                    })}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {trade.notes && (
            <>
              <Divider sx={{ 
                borderColor: mode === 'light' ? 
                  'rgba(0, 0, 0, 0.12)' : 
                  'rgba(255, 255, 255, 0.12)'
              }} />
              <Box sx={{ p: 0.5 }}>
                <Typography variant="subtitle1" sx={{ 
                  color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
                  fontWeight: 600,
                  mb: 0.25
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
            </>
          )}

          <Box sx={{ 
            mt: 0.5, 
            pt: 0.5,
            display: 'flex', 
            justifyContent: 'center',
            borderTop: 1,
            borderColor: mode === 'light' ? 
              'rgba(0, 0, 0, 0.12)' : 
              'rgba(255, 255, 255, 0.12)'
          }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteTrade}
              sx={{ 
                minWidth: 200,
                opacity: 0.9,
                '&:hover': {
                  opacity: 1
                }
              }}
            >
              Permanently Delete
            </Button>
          </Box>
        </Box>
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
