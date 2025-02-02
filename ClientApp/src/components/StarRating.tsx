import { Rating } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarHalfIcon from '@mui/icons-material/StarHalf';

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
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
          color: 'warning.main',
        },
        '& .MuiRating-iconHover': {
          color: 'warning.light',
        }
      }}
    />
  );
}
