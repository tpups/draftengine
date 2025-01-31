import { Box, Container, Paper, Typography } from '@mui/material';
import { PlayerList } from '../components/PlayerList';

export const Home: React.FC = () => {
  return (
    <Box sx={{ flex: 1, width: '100%', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="xl">
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Player Management
          </Typography>
          <PlayerList />
        </Paper>
      </Container>
    </Box>
  );
};
