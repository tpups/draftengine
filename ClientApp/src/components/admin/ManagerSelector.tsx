import { Box, Chip, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import { Manager } from '../../types/models';

interface ManagerSelectorProps {
  managers: Manager[];
  selectedManagers: Manager[];
  onAddManager: (manager: Manager) => void;
  onRemoveManager: (managerId: string) => void;
}

export function ManagerSelector({ managers, selectedManagers, onAddManager, onRemoveManager }: ManagerSelectorProps) {
  const { theme, mode } = useTheme();

  const availableManagers = managers.filter(
    manager => !selectedManagers.some(selected => selected.id === manager.id)
  );

  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedId = event.target.value;
    const manager = managers.find(m => m.id === selectedId);
    if (manager) {
      onAddManager(manager);
    }
  };

  return (
    <Box>
      <FormControl fullWidth>
        <InputLabel>Add Manager</InputLabel>
        <Select
          value=""
          label="Add Manager"
          onChange={handleChange}
          sx={{
            bgcolor: mode === 'light' ? 
              theme.colors.background.paper.light : 
              theme.colors.background.paper.dark,
          }}
        >
          {availableManagers.map(manager => (
            <MenuItem key={manager.id} value={manager.id}>
              {manager.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
        {selectedManagers.map(manager => (
          <Chip
            key={manager.id}
            label={manager.name}
            onDelete={() => onRemoveManager(manager.id!)}
            sx={{
              bgcolor: mode === 'light' ? 
                theme.colors.background.elevated.light : 
                theme.colors.background.elevated.dark,
              color: mode === 'light' ? 
                theme.colors.text.primary.light : 
                theme.colors.text.primary.dark,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
