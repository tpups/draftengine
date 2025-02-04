import { Box, Popover, List, ListItem, ListItemButton, ListItemText, styled } from '@mui/material';
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

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  '&.current-user': {
    backgroundColor: theme.palette.info.light,
    '&:hover': {
      backgroundColor: theme.palette.info.main,
    }
  },
  '&.active-pick': {
    backgroundColor: theme.palette.success.light,
    '&:hover': {
      backgroundColor: theme.palette.success.main,
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
