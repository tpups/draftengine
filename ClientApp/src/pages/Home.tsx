import { Box, Container } from '@mui/material';
import { PlayerList } from '../components/PlayerList';

export const Home: React.FC = () => {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 3, sm: 4, md: 6, lg: 8, xl: 12 } }}>
      <Box sx={{ 
        mt: 4,
        display: 'flex', 
        gap: 3,
        height: 'calc(100vh - 200px)'
      }}>
        <PlayerList />
      </Box>
    </Container>
  );
};
