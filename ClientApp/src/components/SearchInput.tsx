import { TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTheme } from '../contexts/ThemeContext';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search players...' }: SearchInputProps) {
  const { theme, mode } = useTheme();

  return (
    <TextField
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ 
              color: mode === 'light' ? theme.colors.text.secondary.light : theme.colors.text.secondary.dark 
            }} />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton
              onClick={() => onChange('')}
              edge="end"
              size="small"
              sx={{
                color: mode === 'light' ? theme.colors.text.secondary.light : theme.colors.text.secondary.dark,
                '&:hover': {
                  color: mode === 'light' ? theme.colors.text.primary.light : theme.colors.text.primary.dark
                }
              }}
            >
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ) : null,
        sx: {
          bgcolor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
          borderRadius: '8px',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'light' ? theme.colors.action.border?.light : theme.colors.action.border?.dark,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'light' ? theme.colors.primary.light : theme.colors.primary.dark,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.colors.primary.main,
          }
        }
      }}
      sx={{
        mb: 2
      }}
    />
  );
}
