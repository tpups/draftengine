import { Box, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { draftService } from '../services/draftService';
import { managerService } from '../services/managerService';
import { DraftBoard } from '../components/DraftBoard';

export function Board() {
  const { theme, mode } = useTheme();

  const { data: activeDraftResponse } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
    staleTime: 0
  });

  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
    staleTime: 0
  });

  const activeDraft = activeDraftResponse?.value;
  const managers = managersResponse?.value ?? [];

  if (!activeDraft) {
    return (
      <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      p: 4,
      minHeight: '100%',
      bgcolor: mode === 'light' ? theme.colors.background.default.light : theme.colors.background.default.dark
      }}>
      <Typography variant="h4" sx={{ mb: 2, alignSelf: 'flex-start', color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark }}>
          Draft Board
        </Typography>
        <Typography variant="h6" sx={{ color: mode === 'light' ? theme.colors.text.secondary.light : theme.colors.text.secondary.dark }}>
          No active draft found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      p: 4,
      minHeight: '100%',
      bgcolor: mode === 'light' ? theme.colors.background.default.light : theme.colors.background.default.dark
    }}>
      <Typography variant="h4" sx={{ mb: 2, alignSelf: 'flex-start', color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark }}>
        Draft Board
      </Typography>
      <DraftBoard
        activeDraft={activeDraft}
        managers={managers}
      />
    </Box>
  );
}
