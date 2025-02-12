import { Box, Popover, List, ListItem, ListItemButton, ListItemText, styled, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { Draft, DraftPosition, Manager } from '../types/models';

interface DraftManagerFlyoutProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  activeDraft: Draft;
  currentUser?: Manager;
  onManagerSelect: (managerId: string) => void;
  managers: Manager[];
}

interface StyledListItemButtonProps {
  customTheme: any;
}

const StyledListItemButton = styled(ListItemButton)<StyledListItemButtonProps>(({ customTheme }) => ({
  '&.current-user': {
    backgroundColor: customTheme.colors.pickState.active,
    '&:hover': {
      backgroundColor: customTheme.colors.pickState.selected,
    }
  },
  '&.active-pick': {
    backgroundColor: customTheme.colors.pickState.current,
    '&:hover': {
      backgroundColor: customTheme.colors.pickState.selected,
    }
  }
}));

export function DraftManagerFlyout({ 
  open, 
  onClose,
  anchorEl,
  activeDraft, 
  currentUser,
  onManagerSelect,
  managers
}: DraftManagerFlyoutProps) {
  const muiTheme = useMuiTheme();
  const { theme } = useTheme();

  // Get current pick from active draft
  const currentPick = activeDraft.rounds
    .find(r => r.roundNumber === activeDraft.activeRound)
    ?.picks.find(p => p.pickNumber === activeDraft.activePick);

  if (!currentPick) return null;

  // Get current owner (either original owner or most recent trade recipient)
  const currentOwnerId = currentPick.tradedTo?.length 
    ? currentPick.tradedTo[currentPick.tradedTo.length - 1] 
    : currentPick.managerId;

  const currentOwner = managers.find(m => m.id === currentOwnerId);

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: { width: 200 }
      }}
    >
      <Box sx={{ p: 2 }}>
        <List>
          <ListItem disablePadding>
            <StyledListItemButton
              customTheme={theme}
              onClick={() => {
                onManagerSelect(currentOwnerId);
                onClose();
              }}
              className="active-pick"
            >
              <ListItemText primary={currentOwner?.name ?? '[Manager Deleted]'} />
            </StyledListItemButton>
          </ListItem>
        </List>
      </Box>
    </Popover>
  );
}
