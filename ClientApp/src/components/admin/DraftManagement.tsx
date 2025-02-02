import React, { useState, useCallback, useEffect } from 'react';
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
  TextField,
  List,
  ListItem,
  IconButton,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Draft, Manager } from '../../types/models';
import { DraftOrderList } from '../DraftOrderList';
import { draftService } from '../../services/draftService';
import { managerService } from '../../services/managerService';

export const DraftManagement: React.FC = () => {
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [allDrafts, setAllDrafts] = useState<Draft[]>([]);
  const [draftStatus, setDraftStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [draftOrderDialogOpen, setDraftOrderDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [initialRounds, setInitialRounds] = useState<string>('5');

  useEffect(() => {
    const loadCurrentDraft = async () => {
      try {
        const response = await draftService.getActiveDraft();
        setCurrentDraft(response.value);
      } catch (error) {
        console.error('Error loading current draft:', error);
      }
    };

    loadCurrentDraft();
  }, []);

  useEffect(() => {
    const loadAllDrafts = async () => {
      try {
        const response = await draftService.getAll();
        setAllDrafts(response.value);
      } catch (error) {
        console.error('Error loading drafts:', error);
      }
    };

    loadAllDrafts();
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      const response = await managerService.getAll();
      setManagers(response.value);
    } catch (error) {
      console.error('Error loading managers:', error);
      setDraftStatus({
        success: false,
        message: `Error loading managers: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, []);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const handleResetDraft = async () => {
    try {
      setDraftLoading(true);
      setDraftStatus(null);
      if (!currentDraft?.id) {
        throw new Error('No active draft');
      }
      await draftService.resetDraft(currentDraft.id);
      await loadManagers(); // Refresh manager list
      setCurrentDraft(null);
      setDraftStatus({
        success: true,
        message: 'Successfully reset draft'
      });
      setResetDialogOpen(false);
    } catch (error) {
      setDraftStatus({
        success: false,
        message: `Error resetting draft: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!draftToDelete?.id) return;

    try {
      setDraftLoading(true);
      setDraftStatus(null);
      await draftService.deleteDraft(draftToDelete.id);
      
      // Refresh drafts list
      const response = await draftService.getAll();
      setAllDrafts(response.value);
      
      // If we deleted the current draft, clear it
      if (draftToDelete.id === currentDraft?.id) {
        setCurrentDraft(null);
      }

      setDraftStatus({
        success: true,
        message: 'Successfully deleted draft'
      });
      setDeleteDialogOpen(false);
      setDraftToDelete(null);
    } catch (error) {
      setDraftStatus({
        success: false,
        message: `Error deleting draft: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    try {
      setDraftLoading(true);
      if (selectedManagers.length !== managers.length) {
        throw new Error('All managers must be included in the draft order');
      }
      const rounds = parseInt(initialRounds);
      if (rounds < 1) {
        throw new Error('Number of rounds must be at least 1');
      }
      setDraftStatus(null);
      const response = await draftService.createDraft({
        year: new Date().getFullYear(),
        type: 'standard',
        isSnakeDraft: true,
        initialRounds: rounds,
        draftOrder: selectedManagers.map((managerId, index) => ({
          managerId,
          pickNumber: index + 1,
          isComplete: false
        }))
      });
      setCurrentDraft(response.value);
      
      // Refresh drafts list
      const draftsResponse = await draftService.getAll();
      setAllDrafts(draftsResponse.value);

      setDraftStatus({
        success: true,
        message: 'Successfully created new draft'
      });
      setDraftOrderDialogOpen(false);
      await loadManagers(); // Refresh manager list
    } catch (error) {
      setDraftStatus({
        success: false,
        message: `Error creating draft: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Draft Management
      </Typography>
      
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setSelectedManagers([]);
            setDraftStatus(null);
            setDraftOrderDialogOpen(true);
          }}
          disabled={draftLoading}
        >
          {draftLoading ? 'Generating...' : 'Generate Draft'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={async () => {
            try {
              setDraftLoading(true);
              setDraftStatus(null);
              if (!currentDraft?.id) {
                throw new Error('No active draft');
              }
              const response = await draftService.addRound(currentDraft.id);
              await loadManagers(); // Refresh manager list
              setCurrentDraft(response.value);
              setDraftStatus({
                success: true,
                message: 'Successfully added new round'
              });
            } catch (error) {
              setDraftStatus({
                success: false,
                message: `Error adding round: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            } finally {
              setDraftLoading(false);
            }
          }}
          disabled={!currentDraft?.id || draftLoading}
        >
          {draftLoading ? 'Adding...' : 'Add Round'}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => setResetDialogOpen(true)}
          disabled={!currentDraft?.id || draftLoading}
        >
          {draftLoading ? 'Resetting...' : 'Reset Draft'}
        </Button>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          All Drafts
        </Typography>
        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
          <List>
            {allDrafts.map((draft, index) => (
              <React.Fragment key={draft.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setDraftToDelete(draft);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography>
                      {draft.type} Draft ({draft.year})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {draft.rounds.length} rounds • {draft.isSnakeDraft ? 'Snake' : 'Standard'} • {draft.isActive ? 'Active' : 'Inactive'}
                    </Typography>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>

      <Dialog
        open={draftOrderDialogOpen}
        onClose={() => !draftLoading && setDraftOrderDialogOpen(false)}
        maxWidth={false}
      >
        <DialogTitle sx={{ bgcolor: 'grey.100' }}>Set Draft Order</DialogTitle>
        <DialogContent sx={{ width: 1200, maxWidth: '90vw', overflow: 'hidden', bgcolor: 'grey.100' }}>
          <Typography gutterBottom>
            Set the draft order by dragging managers or clicking to select and add them. All managers must be included in the draft order.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <DraftOrderList
              managers={managers}
              selectedManagers={selectedManagers}
              onOrderChange={setSelectedManagers}
              maxSlots={managers.length}
            />
          </Box>
          <Box sx={{ mt: 3, maxWidth: 300 }}>
            <TextField
              fullWidth
              type="number"
              label="Number of Rounds"
              value={initialRounds}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string or valid numbers
                if (value === '' || /^\d+$/.test(value)) {
                  setInitialRounds(value);
                }
              }}
              error={initialRounds !== '' && parseInt(initialRounds) < 1}
              helperText={
                initialRounds !== '' && parseInt(initialRounds) < 1 
                  ? 'Minimum 1 round required'
                  : 'Enter number of rounds'
              }
              inputProps={{ min: 1 }}
              margin="normal"
              sx={{ 
                '& .MuiInputBase-root': {
                  bgcolor: 'background.paper'
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', alignItems: 'center', px: 3, bgcolor: 'grey.100' }}>
          <Box sx={{ flex: 1 }}>
            {selectedManagers.length < managers.length && (
              <Typography color="error">
                {managers.length - selectedManagers.length} manager{managers.length - selectedManagers.length === 1 ? '' : 's'} still need{managers.length - selectedManagers.length === 1 ? 's' : ''} to be added
              </Typography>
            )}
          </Box>
          <Button 
            onClick={() => {
              setDraftOrderDialogOpen(false);
              setDraftStatus(null);
            }}
            disabled={draftLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              selectedManagers.length !== managers.length || 
              draftLoading || 
              initialRounds === '' || 
              parseInt(initialRounds) < 1
            }
            onClick={handleCreateDraft}
          >
            Create Draft
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetDialogOpen}
        onClose={() => !draftLoading && setResetDialogOpen(false)}
      >
        <DialogTitle sx={{ bgcolor: 'grey.100' }}>Reset Draft</DialogTitle>
        <DialogContent sx={{ bgcolor: 'grey.100' }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to reset the current draft? This will:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li">Delete all draft picks</Typography>
            <Typography component="li">Clear the draft order</Typography>
            <Typography component="li">Remove all draft progress</Typography>
          </Box>
          <Typography color="error" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Typography>
          {currentDraft && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Draft Details:
              </Typography>
              <Typography>
                Year: {currentDraft.year}
              </Typography>
              <Typography>
                Type: {currentDraft.type}
              </Typography>
              <Typography>
                Total Rounds: {currentDraft.rounds.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'grey.100', px: 3 }}>
          <Button 
            onClick={() => setResetDialogOpen(false)}
            disabled={draftLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleResetDraft}
            disabled={draftLoading}
          >
            {draftLoading ? 'Resetting...' : 'Reset Draft'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !draftLoading && setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ bgcolor: 'grey.100' }}>Delete Draft</DialogTitle>
        <DialogContent sx={{ bgcolor: 'grey.100' }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete this draft? This will:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li">Permanently remove all draft data</Typography>
            <Typography component="li">Cannot be undone</Typography>
          </Box>
          {draftToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Draft Details:
              </Typography>
              <Typography>
                Year: {draftToDelete.year}
              </Typography>
              <Typography>
                Type: {draftToDelete.type}
              </Typography>
              <Typography>
                Total Rounds: {draftToDelete.rounds.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'grey.100', px: 3 }}>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setDraftToDelete(null);
            }}
            disabled={draftLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDraft}
            disabled={draftLoading}
          >
            {draftLoading ? 'Deleting...' : 'Delete Draft'}
          </Button>
        </DialogActions>
      </Dialog>

      {draftStatus && (
        <Alert 
          severity={draftStatus.success ? 'success' : 'error'}
          sx={{ mt: 2 }}
        >
          {draftStatus.message}
        </Alert>
      )}

      {currentDraft && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Draft Status
          </Typography>
          <Typography>
            Year: {currentDraft.year}
          </Typography>
          <Typography>
            Type: {currentDraft.type}
          </Typography>
          <Typography>
            Snake Draft: {currentDraft.isSnakeDraft ? 'Yes' : 'No'}
          </Typography>
          <Typography>
            Total Rounds: {currentDraft.rounds.length}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
