import React, { useState } from 'react';
import { Box, Button, Container, Paper, Typography, Alert } from '@mui/material';
import { usePlayerService } from '../services/playerService';

export const AdminPanel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
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
            <label htmlFor="import-file">
              <Button variant="contained" component="span">
                Select JSON File
              </Button>
            </label>
            
            {selectedFile && (
              <Typography sx={{ mt: 1 }}>
                Selected: {selectedFile.name}
              </Typography>
            )}
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={!selectedFile}
              sx={{ mt: 2, ml: selectedFile ? 2 : 0 }}
            >
              Import Players
            </Button>
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
      </Paper>
    </Container>
  );
};
