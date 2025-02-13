import { Box, Popover, Typography, List, ListItem, ListItemButton } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import { Manager } from '../../types/models';

interface AssetDistributionPopoverProps {
  anchorEl: HTMLElement;
  onClose: () => void;
  managers: Manager[];
  onSelectManager: (managerId: string) => void;
}

export function AssetDistributionPopover({
  anchorEl,
  onClose,
  managers,
  onSelectManager
}: AssetDistributionPopoverProps) {
  const { theme, mode } = useTheme();

  const handleManagerSelect = (managerId: string) => {
    onSelectManager(managerId);
    onClose();
  };

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
          bgcolor: mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark,
          width: 300,
          maxHeight: 400,
          overflowY: 'auto'
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Select Receiving Manager
        </Typography>
        <List>
          {managers.map(manager => (
            <ListItem key={manager.id} disablePadding>
              <ListItemButton
                onClick={() => handleManagerSelect(manager.id!)}
                sx={{
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)'
                  }
                }}
              >
                <Typography>{manager.name}</Typography>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Popover>
  );
}
