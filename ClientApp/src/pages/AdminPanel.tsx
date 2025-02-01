import React, { useState } from 'react';
import { Box, Button, Container, Paper, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from '@mui/material';
import { usePlayerService } from '../services/playerService';

export const AdminPanel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const playerService = usePlayerService();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setImportStatus({
        success: false,
        message: 'Please select a file to import',
      });
      return;
    }

    try {
      const fileContent = await selectedFile.text();
      const { players } = JSON.parse(fileContent);
      
      if (!Array.isArray(players)) {
        throw new Error('Invalid file format: expected a "players" array');
      }
      
      // Reset file input and show loading state
      setSelectedFile(null);
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      await playerService.importPlayers(players);
      setImportStatus({
        success: true,
        message: `Successfully imported players from ${selectedFile.name}`,
      });
    } catch (error) {
      setImportStatus({
        success: false,
        message: `Error importing players: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Panel
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Import Players
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <input
              accept=".json"
              style={{ display: 'none' }}
              id="import-file"
              type="file"
              onChange={handleFileSelect}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <label htmlFor="import-file">
                <Button variant="contained" component="span">
                  Select JSON File
                </Button>
              </label>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleImport}
                disabled={!selectedFile}
              >
                Import Players
              </Button>
            </Box>
            
            {selectedFile && (
              <Typography sx={{ mt: 1 }}>
                Selected: {selectedFile.name}
              </Typography>
            )}
          </Box>

          {importStatus && (
            <Alert 
              severity={importStatus.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {importStatus.message}
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Data Management
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete All Players
            </Button>
          </Box>

          {deleteStatus && (
            <Alert 
              severity={deleteStatus.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {deleteStatus.message}
            </Alert>
          )}
        </Box>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete All Players</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete all players? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              color="error"
              onClick={async () => {
                try {
                  await playerService.deleteAll();
                  setDeleteStatus({
                    success: true,
                    message: 'Successfully deleted all players'
                  });
                  setDeleteDialogOpen(false);
                } catch (error) {
                  setDeleteStatus({
                    success: false,
                    message: `Error deleting players: ${error instanceof Error ? error.message : 'Unknown error'}`
                  });
                  setDeleteDialogOpen(false);
                }
              }}
            >
              Delete All
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};
