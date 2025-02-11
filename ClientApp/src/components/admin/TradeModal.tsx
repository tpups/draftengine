import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '../../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { Manager, Trade, TradeParty, TradeAsset, TradeAssetType, TradeStatus, Draft, DraftPosition } from '../../types/models';
import { ManagerSelector } from '../admin/ManagerSelector';
import { useQuery } from '@tanstack/react-query';
import { draftService } from '../../services/draftService';
import { getDisplayPickNumber } from '../../utils/draftUtils';
import { AvailablePicksPopover } from './AvailablePicksPopover';
import { apiClient } from '../../services/apiClient';

interface DragContext {
  type: 'availablePicks' | 'tradeAssets';
  managerId: string;
  asset: TradeAsset;
}

interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (trade: Omit<Trade, 'id'>) => void;
  managers: Manager[];
  activeDraftId: string;
}

export function TradeModal({ open, onClose, onSubmit, managers, activeDraftId }: TradeModalProps) {
  const { theme, mode } = useTheme();
  const [selectedManagers, setSelectedManagers] = useState<Manager[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tradeAssets, setTradeAssets] = useState<Record<string, TradeAsset[]>>({});
  const [anchorEl, setAnchorEl] = useState<{ el: HTMLElement; managerId: string } | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedManagers([]);
      setNotes('');
      setError(null);
      setTradeAssets({});
      setAnchorEl(null);
    }
  }, [open]);

  const handleAddManager = (manager: Manager) => {
    setSelectedManagers(prev => [...prev, manager]);
    setTradeAssets(prev => ({ ...prev, [manager.id!]: [] }));
  };

  const handleRemoveManager = (managerId: string) => {
    setSelectedManagers(prev => prev.filter(m => m.id !== managerId));
    setTradeAssets(prev => {
      const { [managerId]: _, ...rest } = prev;
      return rest;
    });
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
      draftId: activeDraftId,  // Use the prop instead of activeDraft.id
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
        !(a.type === asset.type && a.overallPickNumber === asset.overallPickNumber)
      )
    }));
  };

  const handleSubmit = () => {
    // Clear any previous errors
    setError(null);

    // Validate that each manager has at least one asset
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

    const trade: Trade = {
      timestamp: new Date().toISOString(),
      notes,
      status: TradeStatus.Completed,
      parties: selectedManagers.map(manager => ({
        managerId: manager.id!,
        proposed: false,  // Set proposed to false for all parties
        accepted: true,
        assets: tradeAssets[manager.id!] || []
      }))
    };

    // Log the trade object before submitting
    console.log('Submitting trade:', trade);
    apiClient.post('/debug/log', {
      level: 'Information',
      message: `Submitting trade with draft ID: ${activeDraftId}, Trade: ${JSON.stringify(trade)}`
    });

    onSubmit(trade);
    onClose();
  };

  const dialogBgColor = mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark;
  const dialogContentBgColor = mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark;
  const dropZoneBorderColor = mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
  const dropZoneHoverColor = mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)';

  // Calculate grid columns based on number of managers
  const gridColumns = Math.min(3, selectedManagers.length || 1);
  const columnWidth = 350; // Width of each column
  const columnGap = 24; // Gap between columns
  const dialogPadding = 48; // Total horizontal padding (24px on each side)
  const totalWidth = (columnWidth * gridColumns) + (columnGap * (gridColumns - 1)) + dialogPadding;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: { 
          bgcolor: dialogBgColor,
          width: `${Math.min(totalWidth, window.innerWidth * 0.95)}px`,
          minHeight: 400,
          maxHeight: '90vh'
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
          minHeight: 0
        }}
      >
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}
        
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Select Managers</Typography>
          <ManagerSelector
            managers={managers}
            selectedManagers={selectedManagers}
            onAddManager={handleAddManager}
            onRemoveManager={handleRemoveManager}
          />
        </Box>

        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns}, ${columnWidth}px)`,
            gap: 3,
            flex: 1,
            minHeight: 0,
            mx: 'auto',
            width: 'fit-content'
          }}
        >
          {selectedManagers.map(manager => (
            <Box 
              key={manager.id} 
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Typography variant="subtitle2">{manager.name}</Typography>
              {activeDraft && (
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
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Trade Assets</Typography>
                <Box 
                  sx={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    bgcolor: dialogContentBgColor,
                    borderRadius: 1,
                    p: 1,
                    border: `1px dashed ${dropZoneBorderColor}`,
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: dropZoneHoverColor
                    }
                  }}
                >
                  {tradeAssets[manager.id!]?.map((asset, index) => {
                    const roundNumber = asset.roundNumber!;
                    const displayPickNumber = getDisplayPickNumber(activeDraft!, asset.pickNumber!, roundNumber);
                    
                    return (
                      <Box
                        key={`${asset.type}-${asset.overallPickNumber}`}
                        sx={{
                          p: 1,
                          mb: 1,
                          bgcolor: mode === 'light' ? '#fff' : dialogBgColor,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: mode === 'light' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                          '&:last-child': {
                            mb: 0
                          }
                        }}
                      >
                        <span>
                          Round {roundNumber}, Pick {displayPickNumber} {/* Added space */}
                          (Overall: {asset.overallPickNumber})
                        </span>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveAsset(manager.id!, asset)}
                          sx={{
                            color: mode === 'light' ? 
                              theme.colors.pickState.selected.light : 
                              theme.colors.pickState.selected.dark,
                            '&:hover': {
                              color: mode === 'light' ?
                                theme.colors.pickState.selected.dark :
                                theme.colors.pickState.selected.light
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

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
          draft={activeDraft}
          managers={managers}
          tradeAssets={tradeAssets[anchorEl.managerId] || []}
          onAddPick={(pick) => handleAddPick(anchorEl.managerId, pick)}
        />
      )}
    </Dialog>
  );
}
