import { Rating, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarHalfIcon from '@mui/icons-material/StarHalf';

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
  const muiTheme = useMuiTheme();
  const { theme } = useTheme();

  return (
    <Rating
      value={value}
      onChange={(_, newValue) => {
        if (onChange) {
          onChange(newValue);
        }
      }}
      precision={0.5}
      readOnly={readOnly}
      icon={<StarIcon fontSize="inherit" />}
      emptyIcon={<StarBorderIcon fontSize="inherit" />}
      sx={{
        '& .MuiRating-iconFilled': {
          color: theme.colors.pickState.current,
        },
        '& .MuiRating-iconHover': {
          color: theme.colors.pickState.active,
        }
      }}
    />
  );
}
