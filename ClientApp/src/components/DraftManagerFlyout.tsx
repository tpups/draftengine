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

  // Get managers in draft order
  const draftPositions = activeDraft.draftOrder.sort((a, b) => a.pickNumber - b.pickNumber);

  // Get active pick manager
  const activePickManager = draftPositions.find(m => 
    m.pickNumber === activeDraft.activePick && 
    activeDraft.activeRound === activeDraft.activeRound
  );

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
          {draftPositions.map((draftPosition: DraftPosition) => {
            const manager = managers.find(m => m.id === draftPosition.managerId);
            return (
            <ListItem key={draftPosition.managerId} disablePadding>
              <StyledListItemButton
                customTheme={theme}
                onClick={() => {
                  onManagerSelect(draftPosition.managerId);
                  onClose();
                }}
                className={`
                  ${draftPosition.managerId === currentUser?.id ? 'current-user' : ''}
                  ${draftPosition.managerId === activePickManager?.managerId ? 'active-pick' : ''}
                `.trim()}
              >
              <ListItemText primary={manager?.name ?? '[Manager Deleted]'} />
              </StyledListItemButton>
            </ListItem>
          )})}
        </List>
      </Box>
    </Popover>
  );
}
