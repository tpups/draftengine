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
  TextField,
  List,
  ListItem,
  IconButton,
  Divider,
  FormControlLabel,
  Switch,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Draft, Manager } from '../../types/models';
import { DraftOrderList } from '../DraftOrderList';
import { draftService } from '../../services/draftService';
import { managerService } from '../../services/managerService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const DraftManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { theme, mode } = useTheme();

  // State
  const [draftStatus, setDraftStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [draftOrderDialogOpen, setDraftOrderDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [removeRoundDialogOpen, setRemoveRoundDialogOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [hasTradesError, setHasTradesError] = useState(false);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [initialRounds, setInitialRounds] = useState<string>('5');
  const [isSnakeDraft, setIsSnakeDraft] = useState<boolean>(true);

  // Queries
  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => managerService.getAll(),
    staleTime: 0
  });

  const { data: activeDraftResponse } = useQuery({
    queryKey: ['activeDraft'],
    queryFn: () => draftService.getActiveDraft(),
    staleTime: 0
  });

  const { data: allDraftsResponse } = useQuery({
    queryKey: ['drafts'],
    queryFn: () => draftService.getAll(),
    staleTime: 0
  });

  const currentDraft = activeDraftResponse?.value;
  const allDrafts = allDraftsResponse?.value ?? [];
  const managers = managersResponse?.value ?? [];

  // Mutations
  const resetDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      await draftService.resetDraft(draftId);
    },
    onSuccess: () => {
      // Invalidate and refetch all queries
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] }),
        queryClient.invalidateQueries({ queryKey: ['currentPick'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] })
      ]).then(() => {
        setDraftStatus({
          success: true,
          message: 'Successfully reset draft'
        });
        setResetDialogOpen(false);
      });
    },
    onError: (error) => {
      setDraftStatus({
        success: false,
        message: `Error resetting draft: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: string) => draftService.deleteDraft(draftId),
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['drafts'] }),
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] })
      ]).then(() => {
        setDraftStatus({
          success: true,
          message: 'Successfully deleted draft'
        });
        setDeleteDialogOpen(false);
        setDraftToDelete(null);
        setHasTradesError(false);
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('has associated trades')) {
        setHasTradesError(true);
        setDraftStatus(null); // Clear any previous error status
      } else {
        setDraftStatus({
          success: false,
          message: `Error deleting draft: ${errorMessage}`
        });
      }
    }
  });

  const removeRoundMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return draftService.removeRound(draftId);
    },
    onSuccess: (response) => {
      return queryClient.invalidateQueries({ queryKey: ['activeDraft'] }).then(() => {
        setDraftStatus({
          success: true,
          message: 'Successfully removed round'
        });
        setRemoveRoundDialogOpen(false);
      });
    },
    onError: (error) => {
      setDraftStatus({
        success: false,
        message: `Error removing round: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  const addRoundMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return draftService.addRound(draftId);
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['activeDraft'] }).then(() => {
        setDraftStatus({
          success: true,
          message: 'Successfully added new round'
        });
      });
    },
    onError: (error) => {
      setDraftStatus({
        success: false,
        message: `Error adding round: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      if (selectedManagers.length !== managers.length) {
        throw new Error('All managers must be included in the draft order');
      }
      const rounds = parseInt(initialRounds);
      if (rounds < 1) {
        throw new Error('Number of rounds must be at least 1');
      }
      return draftService.createDraft({
        year: new Date().getFullYear(),
        type: 'standard',
        isSnakeDraft,
        initialRounds: rounds,
          draftOrder: selectedManagers.map((managerId, index) => ({
            managerId,
            pickNumber: index + 1,
            isComplete: false,
            overallPickNumber: 0,
            tradedTo: []
          }))
      });
    },
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['drafts'] }),
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] })
      ]).then(() => {
        setDraftStatus({
          success: true,
          message: 'Successfully created new draft'
        });
        setDraftOrderDialogOpen(false);
      });
    },
    onError: (error) => {
      setDraftStatus({
        success: false,
        message: `Error creating draft: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return draftService.toggleActive(draftId);
    },
    onSuccess: (_, draftId) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['drafts'] }),
        queryClient.invalidateQueries({ queryKey: ['activeDraft'] })
      ]).then(() => {
        setDraftStatus({
          success: true,
          message: 'Draft status toggled successfully'
        });
      });
    },
    onError: (error) => {
      setDraftStatus({
        success: false,
        message: `Error toggling draft status: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  const handleResetDraft = () => {
    if (!currentDraft?.id) return;
    resetDraftMutation.mutate(currentDraft.id);
  };

  const handleDeleteDraft = () => {
    if (!draftToDelete?.id) return;
    deleteDraftMutation.mutate(draftToDelete.id);
  };

  const handleRemoveRound = () => {
    if (!currentDraft?.id) return;
    removeRoundMutation.mutate(currentDraft.id);
  };

  const handleCreateDraft = () => {
    createDraftMutation.mutate();
  };

  const isLoading = resetDraftMutation.isPending || 
    deleteDraftMutation.isPending || 
    removeRoundMutation.isPending || 
    addRoundMutation.isPending || 
    createDraftMutation.isPending || 
    toggleActiveMutation.isPending;

  const dialogBgColor = mode === 'light' ? theme.colors.background.elevated.light : theme.colors.background.elevated.dark;
  const dialogContentBgColor = mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark;

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Draft Management
      </Typography>
      
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          sx={{ 
            bgcolor: theme.colors.pickState.current.light,
            '&:hover': {
              bgcolor: theme.colors.pickState.current.dark
            }
          }}
          onClick={() => {
            setSelectedManagers([]);
            setDraftStatus(null);
            setDraftOrderDialogOpen(true);
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Draft'}
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            sx={{ 
              bgcolor: theme.colors.pickState.current.light,
              '&:hover': {
                bgcolor: theme.colors.pickState.current.dark
              }
            }}
            onClick={() => {
              if (!currentDraft?.id) return;
              addRoundMutation.mutate(currentDraft.id);
            }}
            disabled={!currentDraft?.id || isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Round'}
          </Button>
          <Button
            variant="contained"
            sx={{ 
              bgcolor: theme.colors.pickState.selected.light,
              '&:hover': {
                bgcolor: theme.colors.pickState.selected.dark
              }
            }}
            onClick={() => setRemoveRoundDialogOpen(true)}
            disabled={!currentDraft?.id || currentDraft?.rounds.length <= 1 || isLoading}
          >
            {isLoading ? 'Removing...' : 'Remove Round'}
          </Button>
        </Box>
        <Button
          variant="contained"
          sx={{ 
            bgcolor: theme.colors.pickState.selected.light,
            '&:hover': {
              bgcolor: theme.colors.pickState.selected.dark
            }
          }}
          onClick={() => setResetDialogOpen(true)}
          disabled={!currentDraft?.id || isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Draft'}
        </Button>
      </Box>

      {allDrafts.length > 0 && (
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title={draft.isActive ? "Deactivate Draft" : "Activate Draft"}>
                          <span>
                            <Switch
                              checked={draft.isActive}
                              onChange={() => toggleActiveMutation.mutate(draft.id!)}
                              disabled={isLoading}
                            />
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete Draft">
                          <span>
                            <IconButton
                              edge="end"
                              onClick={() => {
                                setDraftToDelete(draft);
                                setDeleteDialogOpen(true);
                                setHasTradesError(false);
                              }}
                              disabled={isLoading}
                            >
                              <DeleteIcon sx={{ 
                                color: theme.colors.pickState.selected.light,
                                '&:hover': {
                                  color: theme.colors.pickState.selected.dark
                                }
                              }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
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
      )}

      <Dialog
        open={draftOrderDialogOpen}
        onClose={() => !isLoading && setDraftOrderDialogOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: { bgcolor: dialogBgColor }
        }}
      >
        <DialogTitle>Set Draft Order</DialogTitle>
        <DialogContent sx={{ width: 1200, maxWidth: '90vw', overflow: 'hidden' }}>
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
          <Box sx={{ mt: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Box sx={{ width: 200 }}>
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
                    bgcolor: dialogContentBgColor
                  }
                }}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isSnakeDraft}
                  onChange={(e) => setIsSnakeDraft(e.target.checked)}
                  color="primary"
                />
              }
              label="Snake Draft"
              sx={{ transform: 'translateY(-8px)' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', alignItems: 'center', px: 3 }}>
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
              setIsSnakeDraft(true); // Reset to default
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              selectedManagers.length !== managers.length || 
              isLoading || 
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
        onClose={() => !isLoading && setResetDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: dialogBgColor }
        }}
      >
        <DialogTitle>Reset Draft</DialogTitle>
        <DialogContent>
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
            <Box sx={{ mt: 2, p: 2, bgcolor: dialogContentBgColor, borderRadius: 1 }}>
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
        <DialogActions sx={{ px: 3 }}>
          <Button 
            onClick={() => setResetDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ 
              bgcolor: theme.colors.primary.light,
              '&:hover': {
                bgcolor: theme.colors.primary.main
              }
            }}
            onClick={handleResetDraft}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Draft'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={removeRoundDialogOpen}
        onClose={() => !isLoading && setRemoveRoundDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: dialogBgColor }
        }}
      >
        <DialogTitle>Remove Round</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to remove the last round from the current draft?
          </Typography>
          {currentDraft && (
            <Box sx={{ mt: 2, p: 2, bgcolor: dialogContentBgColor, borderRadius: 1 }}>
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
        <DialogActions sx={{ px: 3 }}>
          <Button 
            onClick={() => setRemoveRoundDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRemoveRound}
            disabled={isLoading}
          >
            {isLoading ? 'Removing...' : 'Remove Round'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isLoading && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: dialogBgColor }
        }}
      >
        <DialogTitle>Delete Draft</DialogTitle>
        <DialogContent>
          {hasTradesError ? (
            <>
              <Typography sx={{ mb: 2, color: theme.colors.pickState.selected.light }}>
                Cannot delete draft because it has associated trades.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                Please delete all trades involving picks from this draft before deleting it.
              </Typography>
            </>
          ) : (
            <>
              <Typography sx={{ mb: 2 }}>
                Are you sure you want to delete this draft? This will:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                <Typography component="li">Permanently remove all draft data</Typography>
                <Typography component="li">Cannot be undone</Typography>
              </Box>
            </>
          )}
          {draftToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: dialogContentBgColor, borderRadius: 1 }}>
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
        <DialogActions sx={{ px: 3 }}>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setDraftToDelete(null);
              setHasTradesError(false);
            }}
            disabled={isLoading}
          >
            {hasTradesError ? 'OK' : 'Cancel'}
          </Button>
          {!hasTradesError && (
            <Button
              variant="contained"
              sx={{ 
                bgcolor: theme.colors.pickState.selected.light,
                '&:hover': {
                  bgcolor: theme.colors.pickState.selected.dark
                }
              }}
              onClick={handleDeleteDraft}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Draft'}
            </Button>
          )}
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
