import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '../../contexts/ThemeContext';
import { useEffect, useState, useCallback } from 'react';
import { TradeAssetType, TradeStatus, TradeAsset, Trade, Manager, DraftPosition, Draft } from '../../types/models';
import { ManagerSelector } from '../admin/ManagerSelector';
import { useQuery } from '@tanstack/react-query';
import { draftService } from '../../services/draftService';
import { getDisplayPickNumber } from '../../utils/draftUtils';
import { AvailablePicksPopover } from './AvailablePicksPopover';
import { AssetDistributionPopover } from './AssetDistributionPopover';
import { apiClient } from '../../services/apiClient';

interface AssetDistribution {
  [managerId: string]: {
    [fromManagerId: string]: TradeAsset[];
  };
}

interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (trade: Omit<Trade, 'id'>) => void;
  managers: Manager[];
  activeDraftId: string;
}

interface AssetProps { 
  asset: TradeAsset; 
  activeDraft: Draft; 
  mode: string; 
  theme: any; 
  dialogBgColor: string; 
  onRemove?: () => void;
  isDistributed?: boolean;
  managerId: string;
  showAssetDistribution?: boolean;
  onClick?: () => void;
}

function Asset({ asset, activeDraft, mode, theme, dialogBgColor, onRemove, isDistributed, managerId, showAssetDistribution, onClick }: AssetProps) {
  const roundNumber = asset.roundNumber!;
  const displayPickNumber = getDisplayPickNumber(activeDraft!, asset.pickNumber!, roundNumber);
  const id = `tradeAsset|${asset.overallPickNumber?.toString() ?? ''}-${roundNumber}-${asset.pickNumber}|${managerId}`;

  return (
    <Box
      id={id}
      onClick={onClick}
      role="button"
      tabIndex={0}
      sx={{
        p: 1,
        mb: 1,
        bgcolor: mode === 'light' ? '#fff' : dialogBgColor,
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: mode === 'light' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
        opacity: isDistributed ? 0.5 : 1,
        position: 'relative',
        cursor: isDistributed ? 'not-allowed' : (onClick ? 'pointer' : 'default'),
        userSelect: 'none',
        pointerEvents: isDistributed ? 'none' : 'auto',
        '&:last-child': {
          mb: 0
        },
        '&:hover': !isDistributed && onClick ? {
          bgcolor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)'
        } : undefined
      }}
    >
      <span style={{ userSelect: 'none' }}>
        Round {roundNumber}, Pick {displayPickNumber}
        (Overall: {asset.overallPickNumber?.toString() ?? ''})
      </span>
      {onRemove && (
        <IconButton
          size="small"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={isDistributed}
          sx={{
            color: mode === 'light' ? 
              theme.colors.pickState.selected.light : 
              theme.colors.pickState.selected.dark,
            '&:hover': {
              color: mode === 'light' ?
                theme.colors.pickState.selected.dark :
                theme.colors.pickState.selected.light
            },
            opacity: isDistributed ? 0.5 : 1
          }}
        >
          <DeleteIcon />
        </IconButton>
      )}
    </Box>
  );
}

export function TradeModal({ open, onClose, onSubmit, managers, activeDraftId }: TradeModalProps) {
  const { theme, mode } = useTheme();
  const [selectedManagers, setSelectedManagers] = useState<Manager[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tradeAssets, setTradeAssets] = useState<Record<string, TradeAsset[]>>({});
  const [assetDistribution, setAssetDistribution] = useState<AssetDistribution>({});
  const [distributedAssets, setDistributedAssets] = useState<Record<string, {
    originalManagerId: string;
    currentManagerId: string;
  }>>({});
  const [showAssetDistribution, setShowAssetDistribution] = useState(false);
  const [anchorEl, setAnchorEl] = useState<{ el: HTMLElement; managerId: string } | null>(null);
  const [distributionAnchorEl, setDistributionAnchorEl] = useState<{ el: HTMLElement; asset: TradeAsset; managerId: string } | null>(null);

  const isAssetDistributed = useCallback((asset: TradeAsset) => {
    if (!asset.overallPickNumber) return false;
    
    // First check if it's in the distributed assets tracking
    if (asset.overallPickNumber?.toString() in distributedAssets) {
      return true;
    }

    // Then check the asset distribution state
    return Object.values(assetDistribution)
      .some(distributions => 
        Object.values(distributions)
          .some(assets => 
            assets.some(a => 
              a.overallPickNumber !== undefined && 
              asset.overallPickNumber !== undefined && 
              a.overallPickNumber === asset.overallPickNumber
            )
          )
      );
  }, [assetDistribution, distributedAssets]);

  useEffect(() => {
    if (!open) {
      setSelectedManagers([]);
      setNotes('');
      setError(null);
      setTradeAssets({});
      setAssetDistribution({});
      setShowAssetDistribution(false);
      setAnchorEl(null);
      setDistributionAnchorEl(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedManagers.length < 3) {
      setShowAssetDistribution(false);
      setAssetDistribution({});
    }
  }, [selectedManagers.length]);

  const dialogBgColor = mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark;
  const dialogContentBgColor = mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark;
  const dropZoneBorderColor = mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  const handleAddManager = (manager: Manager) => {
    setSelectedManagers(prev => [...prev, manager]);
    setTradeAssets(prev => ({ ...prev, [manager.id!]: [] }));
    setAssetDistribution(prev => ({ ...prev, [manager.id!]: {} }));
  };

  const handleRemoveManager = (managerId: string) => {
    setSelectedManagers(prev => prev.filter(m => m.id !== managerId));
    setTradeAssets(prev => {
      const { [managerId]: _, ...rest } = prev;
      return rest;
    });
    setAssetDistribution(prev => {
      const { [managerId]: _, ...rest } = prev;
      Object.keys(rest).forEach(id => {
        const { [managerId]: __, ...remaining } = rest[id];
        rest[id] = remaining;
      });
      return rest;
    });
  };

  const handleConfigureTradeClick = () => {
    setShowAssetDistribution(true);
    const initialDistribution: AssetDistribution = {};
    selectedManagers.forEach(manager => {
      initialDistribution[manager.id!] = {};
    });
    setAssetDistribution(initialDistribution);
  };

  const { data: activeDraftResponse } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
    staleTime: 0
  });

  const activeDraft = activeDraftResponse?.value;

  const handleAddPick = (managerId: string, pick: DraftPosition) => {
    console.log('Adding pick with draft ID:', activeDraftId);
    const roundNumber = Math.floor((pick.overallPickNumber - 1) / activeDraft!.draftOrder.length) + 1;
    const asset: TradeAsset = {
      type: TradeAssetType.DraftPick,
      draftId: activeDraftId,
      overallPickNumber: pick.overallPickNumber,
      pickNumber: pick.pickNumber,
      roundNumber
    };

    setTradeAssets(prev => ({
      ...prev,
      [managerId]: [...(prev[managerId] || []), asset]
    }));
  };

  const handleRemoveAsset = (managerId: string, asset: TradeAsset) => {
    setTradeAssets(prev => ({
      ...prev,
      [managerId]: prev[managerId].filter(a => 
        !(a.type === asset.type && 
          a.overallPickNumber !== undefined && 
          asset.overallPickNumber !== undefined && 
          a.overallPickNumber === asset.overallPickNumber)
      )
    }));
  };

  const handleUndoAssetMove = (asset: TradeAsset, fromManagerId: string, toManagerId: string) => {
    // Just remove from distribution - the asset is already in Trade Assets
    setAssetDistribution(prev => {
      const newDistribution = { ...prev };
      
      if (newDistribution[toManagerId] && newDistribution[toManagerId][fromManagerId]) {
        newDistribution[toManagerId][fromManagerId] = newDistribution[toManagerId][fromManagerId]
          .filter(a => 
            a.overallPickNumber !== undefined && 
            asset.overallPickNumber !== undefined && 
            a.overallPickNumber !== asset.overallPickNumber
          );
        
        if (newDistribution[toManagerId][fromManagerId].length === 0) {
          delete newDistribution[toManagerId][fromManagerId];
        }
        if (Object.keys(newDistribution[toManagerId]).length === 0) {
          delete newDistribution[toManagerId];
        }
      }

      return newDistribution;
    });
  };

  const handleDistributeAsset = (asset: TradeAsset, fromManagerId: string, toManagerId: string) => {
    setAssetDistribution(prev => {
      const newDistribution = { ...prev };
      
      if (!newDistribution[toManagerId]) {
        newDistribution[toManagerId] = {};
      }
      if (!newDistribution[toManagerId][fromManagerId]) {
        newDistribution[toManagerId][fromManagerId] = [];
      }

      newDistribution[toManagerId][fromManagerId] = [
        ...newDistribution[toManagerId][fromManagerId],
        asset
      ];

      return newDistribution;
    });
    setDistributionAnchorEl(null);
  };

  const handleSubmit = () => {
    setError(null);

    if (selectedManagers.length <= 2) {
      const managersWithoutAssets = selectedManagers.filter(
        manager => !tradeAssets[manager.id!]?.length
      );

      if (managersWithoutAssets.length > 0) {
        setError(
          `The following managers need at least one asset: ${
            managersWithoutAssets.map(m => m.name).join(', ')
          }`
        );
        return;
      }
    } else {
      if (!showAssetDistribution) {
        setError('Please configure the trade distribution first.');
        return;
      }

      const undistributedAssets = selectedManagers.some(manager => {
        const managerAssets = tradeAssets[manager.id!] || [];
        const distributedAssets = Object.values(assetDistribution)
          .flatMap(distributions => 
            Object.values(distributions)
              .flatMap(assets => assets)
          );
        return managerAssets.length > 0 && !distributedAssets.some(
          da => managerAssets.some(ma => 
            ma.overallPickNumber !== undefined && 
            da.overallPickNumber !== undefined && 
            ma.overallPickNumber === da.overallPickNumber
          )
        );
      });

      if (undistributedAssets) {
        setError('All assets must be distributed before submitting the trade.');
        return;
      }

      const managersNotReceiving = selectedManagers.filter(manager => {
        const receivedAssets = Object.values(assetDistribution[manager.id!] || {})
          .flatMap(assets => assets);
        return receivedAssets.length === 0;
      });

      if (managersNotReceiving.length > 0) {
        setError(
          `The following managers must receive at least one asset: ${
            managersNotReceiving.map(m => m.name).join(', ')
          }`
        );
        return;
      }
    }

    // Create or get asset distribution
    const finalAssetDistribution = selectedManagers.length === 2 ? {
      [selectedManagers[0].id!]: {
        [selectedManagers[1].id!]: tradeAssets[selectedManagers[1].id!] || []
      },
      [selectedManagers[1].id!]: {
        [selectedManagers[0].id!]: tradeAssets[selectedManagers[0].id!] || []
      }
    } : assetDistribution;

    // Update state for future reference
    if (selectedManagers.length === 2) {
      setAssetDistribution(finalAssetDistribution);
    }

    const trade: Trade = {
      timestamp: new Date().toISOString(),
      notes,
      status: TradeStatus.Completed,
      parties: selectedManagers.map(manager => ({
        managerId: manager.id!,
        proposed: false,
        accepted: true,
        assets: tradeAssets[manager.id!] || []
      })),
      assetDistribution: finalAssetDistribution
    };

    console.log('Submitting trade:', trade);
    apiClient.post('/debug/log', {
      level: 'Information',
      message: `Submitting trade with draft ID: ${activeDraftId}, Trade: ${JSON.stringify(trade)}`
    });

    onSubmit(trade);
    onClose();
  };

  const gridColumns = Math.min(3, selectedManagers.length || 1);
  // Dynamically calculate column width based on number of managers
  const baseColumnWidth = 350;
  const minColumnWidth = 280;
  const columnGap = 24;
  const dialogPadding = 48;
  const maxDialogWidth = Math.min(window.innerWidth * 0.95, 1400); // Cap at 1400px or 95% of window width
  
  // Reduce column width if needed to fit all columns
  const columnWidth = Math.max(
    minColumnWidth,
    Math.min(
      baseColumnWidth,
      (maxDialogWidth - dialogPadding - (columnGap * (gridColumns - 1))) / gridColumns
    )
  );
  
  const totalWidth = (columnWidth * gridColumns) + (columnGap * (gridColumns - 1)) + dialogPadding;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: { 
          bgcolor: dialogBgColor,
          width: `${Math.min(totalWidth, maxDialogWidth)}px`,
          height: 'auto',
          maxHeight: '98vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2,
        color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
      }}>
        Create Trade
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        dividers 
        sx={{ 
          bgcolor: dialogContentBgColor,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            background: mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            borderRadius: '4px'
          }
        }}
      >
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}
        
        {!showAssetDistribution && (
          <>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Select Managers</Typography>
              <ManagerSelector
                managers={managers}
                selectedManagers={selectedManagers}
                onAddManager={handleAddManager}
                onRemoveManager={handleRemoveManager}
              />
            </Box>

            {selectedManagers.length >= 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                {selectedManagers.some(manager => !tradeAssets[manager.id!]?.length) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Add trade assets for each manager to enable trade distribution
                  </Typography>
                )}
                <Button
                  variant="contained"
                  onClick={handleConfigureTradeClick}
                  disabled={selectedManagers.some(manager => !tradeAssets[manager.id!]?.length)}
                  sx={{
                    bgcolor: theme.colors.primary.main,
                    color: theme.colors.primary.contrastText,
                    '&:hover': {
                      bgcolor: theme.colors.primary.dark
                    }
                  }}
                >
                  Configure Trade Distribution
                </Button>
              </Box>
            )}
          </>
        )}

        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns}, ${columnWidth}px)`,
            gap: 4,
            flex: 1,
            minHeight: 450,
            mx: 'auto',
            width: 'fit-content',
            overflowY: 'auto',
            overflowX: 'hidden',
            alignContent: 'flex-start',
            height: '100%',
            pb: 3,
            '&::-webkit-scrollbar': {
              width: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent'
            },
            '&::-webkit-scrollbar-thumb': {
              background: mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
              borderRadius: '4px'
            }
          }}
        >
          {selectedManagers.map(manager => (
            <Box 
              key={manager.id} 
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                height: '100%',
                minHeight: 250
              }}
            >
              <Typography variant="subtitle2" sx={{ 
                color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
                fontWeight: 600,
                fontSize: '1rem'
              }}>
                {manager.name}
              </Typography>
              {activeDraft && !showAssetDistribution && (
                <Button
                  variant="outlined"
                  onClick={(e) => setAnchorEl({ el: e.currentTarget, managerId: manager.id! })}
                  sx={{
                    color: mode === 'light' ? 
                      theme.colors.primary.main : 
                      theme.colors.primary.light,
                    borderColor: mode === 'light' ? 
                      theme.colors.primary.main : 
                      theme.colors.primary.light,
                    '&:hover': {
                      borderColor: mode === 'light' ? 
                        theme.colors.primary.dark : 
                        theme.colors.primary.main
                    }
                  }}
                >
                  Available Picks
                </Button>
              )}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle2" sx={{ 
                  mb: 1,
                  color: mode === 'light' ? 'text.secondary' : 'text.primary',
                  fontWeight: 500
                }}>
                  Trade Assets
                </Typography>
                <Box
                  id={`tradeAssets|${manager.id}`}
                  sx={{
                    flex: 1,
                    minHeight: 150,
                    maxHeight: 250,
                    overflowY: 'auto',
                    bgcolor: dialogContentBgColor,
                    borderRadius: 1,
                    p: 2,
                    border: `1px dashed ${dropZoneBorderColor}`,
                    transition: 'background-color 0.2s ease',
                    '&::-webkit-scrollbar': {
                      width: '8px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                      borderRadius: '4px'
                    }
                  }}
                >
                  {tradeAssets[manager.id!]?.map((asset) => (
                    <Asset
                      key={`${asset.overallPickNumber?.toString() ?? ''}-${asset.roundNumber}-${asset.pickNumber}`}
                      asset={asset}
                      activeDraft={activeDraft!}
                      mode={mode}
                      theme={theme}
                      dialogBgColor={dialogBgColor}
                      onRemove={!showAssetDistribution ? () => handleRemoveAsset(manager.id!, asset) : undefined}
                      managerId={manager.id!}
                      isDistributed={isAssetDistributed(asset)}
                      showAssetDistribution={showAssetDistribution}
                      onClick={showAssetDistribution && !isAssetDistributed(asset) ? 
                        () => {
                          const element = document.getElementById(`tradeAsset|${asset.overallPickNumber?.toString() ?? ''}-${asset.roundNumber}-${asset.pickNumber}|${manager.id}`);
                          if (element) {
                            setDistributionAnchorEl({ el: element, asset, managerId: manager.id! });
                          }
                        } : 
                        undefined}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {showAssetDistribution && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ mb: 3, borderBottom: `1px solid ${dropZoneBorderColor}`, pb: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Assets Received</Typography>
              <Typography variant="body2" color="text.secondary">
                Click on assets from Trade Assets to distribute them between managers. Each manager must receive at least one asset.
              </Typography>
            </Box>
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${gridColumns}, ${columnWidth}px)`,
                gap: 3,
                mx: 'auto',
                width: 'fit-content',
                maxHeight: 'calc(100vh - 500px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                alignContent: 'start',
                pb: 2,
                '&::-webkit-scrollbar': {
                  width: '8px'
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                  borderRadius: '4px'
                }
              }}
            >
              {selectedManagers.map(manager => (
                <Box 
                  key={`received-${manager.id}`}
                  sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <Typography variant="subtitle2" sx={{ 
                    color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark,
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}>
                    {manager.name}
                  </Typography>
                  <Box
                    id={`received|${manager.id}`}
                    sx={{
                      flex: 1,
                      minHeight: 200,
                      maxHeight: 400,
                      overflowY: 'auto',
                      bgcolor: dialogContentBgColor,
                      borderRadius: 1,
                      p: 3,
                      border: `1px dashed ${dropZoneBorderColor}`,
                      transition: 'background-color 0.2s ease',
                      '& > div:not(:last-child)': {
                        mb: 3
                      },
                      '&::-webkit-scrollbar': {
                        width: '8px'
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                        borderRadius: '4px'
                      }
                    }}
                  >
                    {Object.entries(assetDistribution[manager.id!] || {}).map(([fromManagerId, assets]) => (
                      <Box key={fromManagerId}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 1,
                          pb: 1,
                          borderBottom: `1px solid ${dropZoneBorderColor}`
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: mode === 'light' ? 'text.secondary' : 'text.primary',
                            fontWeight: 500
                          }}>
                            From {managers.find(m => m.id === fromManagerId)?.name}
                          </Typography>
                        </Box>
                        {assets.map((asset) => (
                          <Asset
                            key={`${asset.overallPickNumber?.toString() ?? ''}-${asset.roundNumber}-${asset.pickNumber}`}
                            asset={asset}
                            activeDraft={activeDraft!}
                            mode={mode}
                            theme={theme}
                            dialogBgColor={dialogBgColor}
                            onRemove={() => handleUndoAssetMove(asset, fromManagerId, manager.id!)}
                            managerId={fromManagerId}
                            showAssetDistribution={showAssetDistribution}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          sx={{
            bgcolor: theme.colors.primary.main,
            color: theme.colors.primary.contrastText,
            '&:hover': {
              bgcolor: theme.colors.primary.dark
            }
          }}
        >
          Submit Trade
        </Button>
      </DialogActions>

      {anchorEl && activeDraft && (
        <AvailablePicksPopover
          anchorEl={anchorEl.el}
          onClose={() => setAnchorEl(null)}
          managerId={anchorEl.managerId}
          draft={activeDraft!}
          managers={managers}
          tradeAssets={tradeAssets[anchorEl.managerId] || []}
          onAddPick={(pick) => handleAddPick(anchorEl.managerId, pick)}
        />
      )}

      {distributionAnchorEl && (
        <AssetDistributionPopover
          anchorEl={distributionAnchorEl.el}
          onClose={() => setDistributionAnchorEl(null)}
          managers={selectedManagers.filter(m => m.id !== distributionAnchorEl.managerId)}
          onSelectManager={(managerId) => handleDistributeAsset(distributionAnchorEl.asset, distributionAnchorEl.managerId, managerId)}
        />
      )}
    </Dialog>
  );
}
