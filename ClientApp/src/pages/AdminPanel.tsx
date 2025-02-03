import React from 'react';
import { 
  Box, 
  Container
} from '@mui/material';
import { DataManagement } from '../components/admin/DataManagement';
import { DraftManagement } from '../components/admin/DraftManagement';
import { DraftOrderDisplay } from '../components/admin/DraftOrderDisplay';
import { ManagerSection } from '../components/admin/ManagerSection';

export const AdminPanel: React.FC = () => {
  return (
    <Container maxWidth={false} sx={{ mt: 4, px: { xs: 3, sm: 4, md: 6, lg: 8, xl: 12 } }}>
      <Box display="flex" gap={4}>
        <Box flex={9}>
          <ManagerSection />
        </Box>

        <Box flex={3} display="flex" flexDirection="column" gap={4} sx={{ position: 'sticky', top: 24 }}>
          <DataManagement />
          <DraftManagement />
        </Box>

        <Box flex={2} display="flex" flexDirection="column" gap={4} sx={{ position: 'sticky', top: 24 }}>
          <DraftOrderDisplay />
        </Box>
      </Box>
    </Container>
  );
};
