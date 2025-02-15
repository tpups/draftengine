import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Divider,
  TextField,
  MenuItem
} from '@mui/material';
import { usePlayerService } from '../../services/playerService';
import { apiClient } from '../../services/apiClient';
import { BirthDateVerificationResult, PositionUpdateResult, ProjectionType } from '../../types/models';
import { LeagueSettingsModal } from './LeagueSettingsModal';

interface VerifyBirthDatesStatus {
  success: boolean;
  message: string;
  details?: BirthDateVerificationResult;
}

export const DataManagement: React.FC = () => {
  const { theme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importConfig, setImportConfig] = useState({
    dataSource: '',
    dataType: 'projections',
    playerCount: 100,
    projectionType: ProjectionType.Hitter
  });
  const [verifyBirthDatesDialogOpen, setVerifyBirthDatesDialogOpen] = useState(false);
  const [verifyBirthDatesLoading, setVerifyBirthDatesLoading] = useState(false);
  const [verifyBirthDatesStatus, setVerifyBirthDatesStatus] = useState<VerifyBirthDatesStatus | null>(null);

  const [updatePositionsDialogOpen, setUpdatePositionsDialogOpen] = useState(false);
  const [updatePositionsLoading, setUpdatePositionsLoading] = useState(false);
  const [updatePositionsStatus, setUpdatePositionsStatus] = useState<{
    success: boolean;
    message: string;
    details?: PositionUpdateResult;
  } | null>(null);
  const [leagueSettingsOpen, setLeagueSettingsOpen] = useState(false);

  const playerService = usePlayerService();

  const handleOpenDeleteDialog = () => {
    setDeleteStatus(null); // Clear previous status
    setDeleteDialogOpen(true);
  };

  const handleOpenImportDialog = () => {
    setImportStatus(null); // Clear previous status
    setImportDialogOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      
      // Validate file type
      if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
        setImportStatus({
          success: false,
          message: 'Invalid file type. Please select a JSON or CSV file.'
        });
        return;
      }

      setSelectedFile(file);
      setImportStatus(null); // Clear any previous status
      
      if (file.name.endsWith('.csv')) {
        handleOpenImportDialog();
      }
    }
  };

  const handleJsonImport = async () => {
    if (!selectedFile) {
      setImportStatus({
        success: false,
        message: 'Please select a file to import'
      });
      return;
    }

    try {
      setImportLoading(true);
      setImportStatus(null);
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
        message: `Successfully imported players from ${selectedFile.name}`
      });
    } catch (error) {
      setImportStatus({
        success: false,
        message: `Error importing players: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleCsvImport = async () => {
    if (!selectedFile) {
      setImportStatus({
        success: false,
        message: 'Please select a file to import'
      });
      return;
    }

    try {
      setImportLoading(true);
      setImportStatus(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('dataSource', importConfig.dataSource);
      formData.append('dataType', importConfig.dataType);
      formData.append('playerCount', importConfig.playerCount.toString());
      if (importConfig.dataType === 'projections') {
        formData.append('projectionType', importConfig.projectionType);
      }

      const result = await apiClient.upload<{ message: string }>('player/importcsv', formData);
      
      // Reset form and show success
      setSelectedFile(null);
      setImportDialogOpen(false);
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      setImportStatus({
        success: true,
        message: result.message || `Successfully imported players from ${selectedFile.name}`
      });
    } catch (error) {
      setImportStatus({
        success: false,
        message: `Error importing players: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Data Management
      </Typography>
        
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Import Players
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
              accept=".json,.csv"
              style={{ display: 'none' }}
              id="import-file"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="import-file">
              <Button variant="contained" component="span">
                Select File
              </Button>
            </label>
            {selectedFile && !selectedFile.name.endsWith('.csv') && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleJsonImport}
                disabled={importLoading}
              >
                {importLoading ? 'Importing...' : 'Import JSON'}
              </Button>
            )}
          </Box>
          {selectedFile && (
            <Typography sx={{ mt: 1 }}>
              Selected: {selectedFile.name}
            </Typography>
          )}
          {importStatus && (
            <Alert 
              severity={importStatus.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {importStatus.message}
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Data Operations
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              sx={{ 
                bgcolor: theme.colors.primary.main,
                '&:hover': {
                  bgcolor: theme.colors.primary.dark
                }
              }}
              onClick={() => setLeagueSettingsOpen(true)}
            >
              League Settings
            </Button>
            <Button
              variant="contained"
              sx={{ 
              bgcolor: theme.colors.pickState.selected.light,
              '&:hover': {
                bgcolor: theme.colors.pickState.selected.dark
                }
              }}
              onClick={handleOpenDeleteDialog}
            >
              Delete All Players
            </Button>
            <Button
              variant="contained"
              sx={{ 
                bgcolor: theme.colors.primary.main,
                '&:hover': {
                  bgcolor: theme.colors.primary.dark
                }
              }}
              onClick={() => setVerifyBirthDatesDialogOpen(true)}
            >
              MLB API BASIC INFO
            </Button>
            <Button
              variant="contained"
              sx={{ 
                bgcolor: theme.colors.primary.main,
                '&:hover': {
                  bgcolor: theme.colors.primary.dark
                }
              }}
              onClick={() => setUpdatePositionsDialogOpen(true)}
            >
              MLB API POSITIONS
            </Button>
          </Box>
        </Box>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete All Players</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete all players? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ 
                bgcolor: theme.colors.pickState.selected,
                '&:hover': {
                  bgcolor: theme.colors.pickState.current
                }
              }}
              onClick={async () => {
                try {
                  setDeleteLoading(true);
                  setDeleteStatus(null);
                  const response = await playerService.deleteAll();
                  // Refresh the player list by triggering a re-render of the parent component
                  window.dispatchEvent(new CustomEvent('playersUpdated'));
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
                } finally {
                  setDeleteLoading(false);
                }
              }}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete All'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={importDialogOpen} 
          onClose={() => {
            setImportDialogOpen(false);
            setImportStatus(null); // Clear status on close
          }}
        >
          <DialogTitle>Import Configuration</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, minWidth: 300 }}>
              <TextField
                fullWidth
                label="Data Source"
                value={importConfig.dataSource}
                onChange={(e) => setImportConfig(prev => ({ ...prev, dataSource: e.target.value }))}
                margin="normal"
                helperText="e.g., steamer_2025"
              />
              
              <TextField
                select
                fullWidth
                margin="normal"
                label="Data Type"
                value={importConfig.dataType}
                onChange={(e) => setImportConfig(prev => ({ ...prev, dataType: e.target.value }))}
              >
                <MenuItem value="projections">Projections</MenuItem>
                <MenuItem value="rankings">Rankings</MenuItem>
                <MenuItem value="prospects">Prospects</MenuItem>
              </TextField>

              {importConfig.dataType === 'projections' && (
                <TextField
                  select
                  fullWidth
                  margin="normal"
                  label="Projection Type"
                  value={importConfig.projectionType}
                  onChange={(e) => setImportConfig(prev => ({ 
                    ...prev, 
                    projectionType: e.target.value as ProjectionType
                  }))}
                >
                  <MenuItem value={ProjectionType.Hitter}>Hitter</MenuItem>
                  <MenuItem value={ProjectionType.Pitcher}>Pitcher</MenuItem>
                </TextField>
              )}

              <TextField
                fullWidth
                type="number"
                label="Number of Players"
                value={importConfig.playerCount}
                onChange={(e) => setImportConfig(prev => ({ ...prev, playerCount: parseInt(e.target.value) || 0 }))}
                margin="normal"
                inputProps={{ min: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setImportDialogOpen(false);
                setImportStatus(null); // Clear status on cancel
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCsvImport}
              variant="contained"
              disabled={!importConfig.dataSource || importConfig.playerCount < 1 || importLoading}
            >
              {importLoading ? 'Importing...' : 'Import CSV'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={verifyBirthDatesDialogOpen}
          onClose={() => !verifyBirthDatesLoading && setVerifyBirthDatesDialogOpen(false)}
        >
          <DialogTitle>MLB API Basic Info Update</DialogTitle>
          <DialogContent>
            <Typography>
              Would you like to update basic MLB info (birthdate, height, weight, etc.) for players that already have data?
              If not, only players without existing data will be updated.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setVerifyBirthDatesDialogOpen(false);
                setVerifyBirthDatesStatus(null); // Clear status on cancel
              }}
              disabled={verifyBirthDatesLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  setVerifyBirthDatesLoading(true);
                  setVerifyBirthDatesStatus(null);
                  const result = await playerService.verifyBirthDates(false);
                  setVerifyBirthDatesStatus({
                    success: true,
                    message: 'Successfully updated MLB basic info',
                    details: {
                      totalPlayers: result.value.totalPlayers,
                      processedCount: result.value.processedCount,
                      updatedCount: result.value.updatedCount,
                      failedCount: result.value.failedCount,
                      updates: result.value.updates,
                      errors: result.value.errors
                    }
                  });
                  setVerifyBirthDatesDialogOpen(false);
                } catch (error) {
                  setVerifyBirthDatesStatus({
                    success: false,
                    message: `Error updating MLB basic info: ${error instanceof Error ? error.message : 'Unknown error'}`
                  });
                  setVerifyBirthDatesDialogOpen(false);
                } finally {
                  setVerifyBirthDatesLoading(false);
                }
              }}
              disabled={verifyBirthDatesLoading}
            >
              {verifyBirthDatesLoading ? 'Updating...' : 'Skip Existing'}
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  setVerifyBirthDatesLoading(true);
                  setVerifyBirthDatesStatus(null);
                  const result = await playerService.verifyBirthDates(true);
                  setVerifyBirthDatesStatus({
                    success: true,
                    message: 'Successfully updated MLB basic info',
                    details: {
                      totalPlayers: result.value.totalPlayers,
                      processedCount: result.value.processedCount,
                      updatedCount: result.value.updatedCount,
                      failedCount: result.value.failedCount,
                      updates: result.value.updates,
                      errors: []
                    }
                  });
                  setVerifyBirthDatesDialogOpen(false);
                } catch (error) {
                  setVerifyBirthDatesStatus({
                    success: false,
                    message: `Error updating MLB basic info: ${error instanceof Error ? error.message : 'Unknown error'}`
                  });
                  setVerifyBirthDatesDialogOpen(false);
                } finally {
                  setVerifyBirthDatesLoading(false);
                }
              }}
              disabled={verifyBirthDatesLoading}
            >
              {verifyBirthDatesLoading ? 'Updating...' : 'Check All'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={updatePositionsDialogOpen}
          onClose={() => !updatePositionsLoading && setUpdatePositionsDialogOpen(false)}
        >
          <DialogTitle>MLB API Position Update</DialogTitle>
          <DialogContent>
            <Typography>
              Would you like to update MLB position history for players that already have position stats?
              If not, only players without existing position stats will be updated.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setUpdatePositionsDialogOpen(false);
                setUpdatePositionsStatus(null);
              }}
              disabled={updatePositionsLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  setUpdatePositionsLoading(true);
                  setUpdatePositionsStatus(null);
                  const result = await playerService.updatePositions(false);
                  setUpdatePositionsStatus({
                    success: true,
                    message: 'Successfully updated MLB position history',
                    details: {
                      totalPlayers: result.value.totalPlayers,
                      processedCount: result.value.processedCount,
                      updatedCount: result.value.updatedCount,
                      failedCount: result.value.failedCount,
                      updates: result.value.updates,
                      errors: result.value.errors
                    }
                  });
                  setUpdatePositionsDialogOpen(false);
                } catch (error) {
                  setUpdatePositionsStatus({
                    success: false,
                    message: `Error updating MLB position history: ${error instanceof Error ? error.message : 'Unknown error'}`
                  });
                  setUpdatePositionsDialogOpen(false);
                } finally {
                  setUpdatePositionsLoading(false);
                }
              }}
              disabled={updatePositionsLoading}
            >
              {updatePositionsLoading ? 'Updating...' : 'Skip Existing'}
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  setUpdatePositionsLoading(true);
                  setUpdatePositionsStatus(null);
                  const result = await playerService.updatePositions(true);
                  setUpdatePositionsStatus({
                    success: true,
                    message: 'Successfully updated MLB position history',
                    details: {
                      totalPlayers: result.value.totalPlayers,
                      processedCount: result.value.processedCount,
                      updatedCount: result.value.updatedCount,
                      failedCount: result.value.failedCount,
                      updates: result.value.updates,
                      errors: result.value.errors
                    }
                  });
                  setUpdatePositionsDialogOpen(false);
                } catch (error) {
                  setUpdatePositionsStatus({
                    success: false,
                    message: `Error updating MLB position history: ${error instanceof Error ? error.message : 'Unknown error'}`
                  });
                  setUpdatePositionsDialogOpen(false);
                } finally {
                  setUpdatePositionsLoading(false);
                }
              }}
              disabled={updatePositionsLoading}
            >
              {updatePositionsLoading ? 'Updating...' : 'Check All'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {deleteStatus && (
        <Alert 
          severity={deleteStatus.success ? 'success' : 'error'}
          sx={{ mt: 2 }}
        >
          {deleteStatus.message}
        </Alert>
      )}

      {verifyBirthDatesStatus && (
        <Alert 
          severity={verifyBirthDatesStatus.success ? 'success' : 'error'}
          sx={{ mt: 2 }}
        >
          <Typography>{verifyBirthDatesStatus.message}</Typography>
          {verifyBirthDatesStatus.details && (
            <>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Processed {verifyBirthDatesStatus.details.totalPlayers} players: {' '}
                {verifyBirthDatesStatus.details.updatedCount} updated, {' '}
                {verifyBirthDatesStatus.details.failedCount} failed
              </Typography>
              {verifyBirthDatesStatus.details?.errors && verifyBirthDatesStatus.details.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {verifyBirthDatesStatus.details.errors?.map((error: string, index: number) => (
                    <Typography key={index} variant="body2" color="error">
                      {error}
                    </Typography>
                  ))}
                </Box>
              )}
            </>
          )}
        </Alert>
      )}

      {updatePositionsStatus && (
        <Alert 
          severity={updatePositionsStatus.success ? 'success' : 'error'}
          sx={{ mt: 2 }}
        >
          <Typography>{updatePositionsStatus.message}</Typography>
          {updatePositionsStatus.details && (
            <>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Processed {updatePositionsStatus.details.totalPlayers} players: {' '}
                {updatePositionsStatus.details.updatedCount} updated, {' '}
                {updatePositionsStatus.details.failedCount} failed
              </Typography>
              {updatePositionsStatus.details?.errors && updatePositionsStatus.details.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {updatePositionsStatus.details.errors?.map((error: string, index: number) => (
                    <Typography key={index} variant="body2" color="error">
                      {error}
                    </Typography>
                  ))}
                </Box>
              )}
            </>
          )}
        </Alert>
      )}

      <LeagueSettingsModal
        open={leagueSettingsOpen}
        onClose={() => setLeagueSettingsOpen(false)}
      />
    </Paper>
  );
};
