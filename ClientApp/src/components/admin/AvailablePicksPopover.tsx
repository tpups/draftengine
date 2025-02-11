import { Box, IconButton, List, ListItem, ListItemText, Popover, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '../../contexts/ThemeContext';
import { Draft, DraftPosition, Manager, TradeAsset } from '../../types/models';
import { getDisplayPickNumber } from '../../utils/draftUtils';

interface AvailablePicksPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  managerId: string;
  draft: Draft;
  managers: Manager[];
  tradeAssets?: TradeAsset[];
  onAddPick: (pick: DraftPosition) => void;
}

export function AvailablePicksPopover({
  anchorEl,
  onClose,
  managerId,
  draft,
  managers,
  tradeAssets = [],
  onAddPick
}: AvailablePicksPopoverProps) {
  const { theme, mode } = useTheme();

  const getOriginalManagerName = (pick: DraftPosition) => {
    const originalManagerId = pick.managerId;
    const originalManager = managers.find(m => m.id === originalManagerId);
    return originalManager?.name || 'Unknown';
  };

  const isTraded = (pick: DraftPosition) => {
    const currentOwner = pick.tradedTo.length 
      ? pick.tradedTo[pick.tradedTo.length - 1] 
      : pick.managerId;
    return currentOwner !== pick.managerId;
  };

  const availablePicks = draft.rounds.flatMap(round => round.picks)
    .filter(pick => {
      const currentOwner = pick.tradedTo.length 
        ? pick.tradedTo[pick.tradedTo.length - 1] 
        : pick.managerId;
      return currentOwner === managerId && 
             !tradeAssets.some(asset => 
               asset.overallPickNumber === pick.overallPickNumber
             );
    })
    .sort((a, b) => a.overallPickNumber - b.overallPickNumber);

  const roundNumber = (pick: DraftPosition) => 
    Math.floor((pick.overallPickNumber - 1) / draft.draftOrder.length) + 1;

  return (
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
            theme.colors.background.paper.dark
        }
      }}
    >
      {availablePicks.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography>No available picks</Typography>
        </Box>
      ) : (
        <List>
          {availablePicks.map(pick => {
            const rn = roundNumber(pick);
            const displayPickNumber = getDisplayPickNumber(draft, pick.pickNumber, rn);
            
            return (
              <ListItem 
                key={pick.overallPickNumber}
                secondaryAction={
                  <IconButton 
                    onClick={() => {
                      onAddPick(pick);
                      onClose();
                    }}
                    sx={{
                      color: mode === 'light' ? 
                        theme.colors.primary.main : 
                        theme.colors.primary.light
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                }
              >
                <ListItemText 
                  primary={`Round ${rn}, Pick ${displayPickNumber} (Overall: ${pick.overallPickNumber})`}
                  secondary={
                    isTraded(pick) 
                      ? `(Traded from ${getOriginalManagerName(pick)})`
                      : undefined
                  }
                  sx={{
                    color: mode === 'light' ? 
                      theme.colors.text.primary.light : 
                      theme.colors.text.primary.dark,
                    '.MuiListItemText-secondary': {
                      color: mode === 'light' ? 
                        theme.colors.text.secondary.light : 
                        theme.colors.text.secondary.dark
                    }
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Popover>
  );
}
