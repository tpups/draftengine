import { 
  Box, 
  Checkbox, 
  Chip, 
  FormControlLabel, 
  Slider, 
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Backdrop
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useCallback } from 'react';

// MLB Teams organized by league and division
export type MLBTeams = {
  [league: string]: {
    [division: string]: string[];
  };
};

export const MLB_TEAMS: MLBTeams = {
  AL: {
    East: ['BAL', 'BOS', 'NYY', 'TB', 'TOR'],
    Central: ['CWS', 'CLE', 'DET', 'KC', 'MIN'],
    West: ['HOU', 'LAA', 'OAK', 'SEA', 'TEX']
  },
  NL: {
    East: ['ATL', 'MIA', 'NYM', 'PHI', 'WSH'],
    Central: ['CHC', 'CIN', 'MIL', 'PIT', 'STL'],
    West: ['ARI', 'COL', 'LAD', 'SD', 'SF']
  }
};

// Minor league levels from highest to lowest
export const LEVELS: string[] = ['AAA', 'AA', 'A+', 'A', 'A-', 'Rookie', 'Complex'];

interface PlayerListFiltersProps {
  onFiltersChange: (filters: {
    excludeDrafted: boolean;
    teams: string[];
    ageRange: [number, number];
    levels: string[];
  }) => void;
  minAge?: number;
  maxAge?: number;
}

export function PlayerListFilters({ 
  onFiltersChange,
  minAge = 18,
  maxAge = 40
}: PlayerListFiltersProps) {
  const { theme, mode } = useTheme();

  // Filter states
  const [excludeDrafted, setExcludeDrafted] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    Object.values(MLB_TEAMS).flatMap(divisions => 
      Object.values(divisions).flat()
    )
  );
  const [ageRange, setAgeRange] = useState<[number, number]>([minAge, maxAge]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(LEVELS);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  const handleAccordionChange = useCallback((panel: string) => (event: React.SyntheticEvent, expanded: boolean) => {
    setExpandedAccordion(expanded ? panel : false);
  }, []);

  const handleBackdropClick = useCallback(() => {
    setExpandedAccordion(false);
  }, []);

  // Handlers that call onFiltersChange with all current filter values
  const handleExcludeDraftedChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setExcludeDrafted(newValue);
    onFiltersChange({
      excludeDrafted: newValue,
      teams: selectedTeams,
      ageRange,
      levels: selectedLevels
    });
  }, [selectedTeams, ageRange, selectedLevels, onFiltersChange]);

  const handleTeamSelect = useCallback((team: string) => {
    setSelectedTeams(prev => {
      const newTeams = prev.includes(team)
        ? prev.filter(t => t !== team)
        : [...prev, team];
      onFiltersChange({
        excludeDrafted,
        teams: newTeams,
        ageRange,
        levels: selectedLevels
      });
      return newTeams;
    });
  }, [excludeDrafted, ageRange, selectedLevels, onFiltersChange]);

  const handleAgeRangeChange = useCallback((_event: Event, newValue: number | number[]) => {
    const newRange = newValue as [number, number];
    setAgeRange(newRange);
    onFiltersChange({
      excludeDrafted,
      teams: selectedTeams,
      ageRange: newRange,
      levels: selectedLevels
    });
  }, [excludeDrafted, selectedTeams, selectedLevels, onFiltersChange]);

  const handleLevelSelect = useCallback((level: string) => {
    setSelectedLevels(prev => {
      const newLevels = prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level];
      onFiltersChange({
        excludeDrafted,
        teams: selectedTeams,
        ageRange,
        levels: newLevels
      });
      return newLevels;
    });
  }, [excludeDrafted, selectedTeams, ageRange, onFiltersChange]);

  const handleSelectAllTeams = useCallback(() => {
    const allTeams = Object.values(MLB_TEAMS).flatMap(divisions => 
      Object.values(divisions).flat()
    );
    setSelectedTeams(allTeams);
    onFiltersChange({
      excludeDrafted,
      teams: allTeams,
      ageRange,
      levels: selectedLevels
    });
  }, [excludeDrafted, ageRange, selectedLevels, onFiltersChange]);

  const handleDeselectAllTeams = useCallback(() => {
    setSelectedTeams([]);
    onFiltersChange({
      excludeDrafted,
      teams: [],
      ageRange,
      levels: selectedLevels
    });
  }, [excludeDrafted, ageRange, selectedLevels, onFiltersChange]);

  const handleSelectAllLevels = useCallback(() => {
    setSelectedLevels(LEVELS);
    onFiltersChange({
      excludeDrafted,
      teams: selectedTeams,
      ageRange,
      levels: LEVELS
    });
  }, [excludeDrafted, selectedTeams, ageRange, onFiltersChange]);

  const handleDeselectAllLevels = useCallback(() => {
    setSelectedLevels([]);
    onFiltersChange({
      excludeDrafted,
      teams: selectedTeams,
      ageRange,
      levels: []
    });
  }, [excludeDrafted, selectedTeams, ageRange, onFiltersChange]);

  const accordionStyles = {
    '&.MuiAccordion-root': {
      minWidth: '200px',
      boxShadow: 'none',
      '&:before': {
        display: 'none',
      },
      position: 'relative',
      backgroundColor: 'transparent',
      height: '40px',
      '&.Mui-expanded': {
        margin: 0
      }
    },
    '& .MuiAccordionSummary-root': {
      backgroundColor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
      borderRadius: '4px',
      minHeight: '40px !important',
      height: '40px',
      padding: '0 12px',
      border: `1px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.action.border?.dark}`,
      '& .MuiAccordionSummary-content': {
        margin: '0 !important'
      },
      '&.Mui-expanded': {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottom: 'none'
      }
    },
    '& .MuiCollapse-root': {
      position: 'absolute',
      zIndex: 1500,
      backgroundColor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      width: '300px',
      top: '39px',
      left: 0,
      visibility: 'visible',
      '& .MuiAccordionDetails-root': {
        padding: '16px',
        backgroundColor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
        borderRadius: '0 0 4px 4px',
        border: `1px solid ${mode === 'light' ? theme.colors.action.border?.light : theme.colors.action.border?.dark}`,
        borderTop: 'none'
      }
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      gap: 2,
      alignItems: 'center',
      position: 'relative',
      zIndex: expandedAccordion ? 1500 : 'auto',
      height: '40px'
    }}>
      <Backdrop
        open={!!expandedAccordion}
        sx={{
          position: 'fixed',
          zIndex: 1400,
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}
        onClick={handleBackdropClick}
      />
      {/* Exclude Drafted Toggle */}
      <FormControlLabel
        control={
          <Checkbox
            checked={excludeDrafted}
            onChange={handleExcludeDraftedChange}
            size="small"
            sx={{
              color: mode === 'light' ? theme.colors.primary.light : theme.colors.primary.dark,
              '&.Mui-checked': {
                color: theme.colors.primary.main
              }
            }}
          />
        }
        label="Exclude drafted"
      />

      {/* Age Range Menu */}
      <Box sx={{ position: 'relative', height: '40px' }}>
        <Accordion
          expanded={expandedAccordion === 'age'}
          onChange={handleAccordionChange('age')}
          sx={accordionStyles}
        >
          <AccordionSummary
            ref={(el) => {
              if (el && expandedAccordion === 'age') {
                const rect = el.getBoundingClientRect();
                const collapse = el.parentElement?.querySelector('.MuiCollapse-root');
                if (collapse) {
                  (collapse as HTMLElement).style.left = `${rect.left}px`;
                  (collapse as HTMLElement).style.top = `${rect.bottom + 4}px`;
                }
              }
            }}
            expandIcon={<ExpandMoreIcon />}
          >
            <Typography variant="body2">
              Age: {ageRange[0]} - {ageRange[1]}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Slider
              value={ageRange}
              onChange={handleAgeRangeChange}
              min={minAge}
              max={maxAge}
              sx={{
                color: theme.colors.primary.main,
                '& .MuiSlider-thumb': {
                  bgcolor: mode === 'light' ? theme.colors.background.paper.light : theme.colors.background.paper.dark,
                  border: `2px solid ${theme.colors.primary.main}`,
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: `0px 0px 0px 8px ${mode === 'light' 
                      ? 'rgba(25, 118, 210, 0.16)' 
                      : 'rgba(144, 202, 249, 0.16)'}`
                  }
                }
              }}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Team Selection Menu */}
      <Box sx={{ position: 'relative', height: '40px' }}>
        <Accordion
          expanded={expandedAccordion === 'teams'}
          onChange={handleAccordionChange('teams')}
          sx={accordionStyles}
        >
          <AccordionSummary
            ref={(el) => {
              if (el && expandedAccordion === 'teams') {
                const rect = el.getBoundingClientRect();
                const collapse = el.parentElement?.querySelector('.MuiCollapse-root');
                if (collapse) {
                  (collapse as HTMLElement).style.left = `${rect.left}px`;
                  (collapse as HTMLElement).style.top = `${rect.bottom + 4}px`;
                }
              }
            }}
            expandIcon={<ExpandMoreIcon />}
          >
            <Typography variant="body2">
              Teams ({selectedTeams.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Chip 
                  label="Select All" 
                  size="small" 
                  onClick={handleSelectAllTeams}
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label="Deselect All" 
                  size="small" 
                  onClick={handleDeselectAllTeams}
                />
              </Box>
              {Object.entries(MLB_TEAMS).map(([league, divisions]) => (
                <Box key={league} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{league}</Typography>
                  {Object.entries(divisions).map(([division, teams]) => (
                    <Box key={division} sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ ml: 1 }}>{division}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 2 }}>
                        {teams.map(team => (
                          <Chip
                            key={team}
                            label={team}
                            size="small"
                            onClick={() => handleTeamSelect(team)}
                            color={selectedTeams.includes(team) ? 'primary' : 'default'}
                            variant={selectedTeams.includes(team) ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Level Selection Menu */}
      <Box sx={{ position: 'relative', height: '40px' }}>
        <Accordion
          expanded={expandedAccordion === 'levels'}
          onChange={handleAccordionChange('levels')}
          sx={accordionStyles}
        >
          <AccordionSummary
            ref={(el) => {
              if (el && expandedAccordion === 'levels') {
                const rect = el.getBoundingClientRect();
                const collapse = el.parentElement?.querySelector('.MuiCollapse-root');
                if (collapse) {
                  (collapse as HTMLElement).style.left = `${rect.left}px`;
                  (collapse as HTMLElement).style.top = `${rect.bottom + 4}px`;
                }
              }
            }}
            expandIcon={<ExpandMoreIcon />}
          >
            <Typography variant="body2">
              Levels ({selectedLevels.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Chip 
                  label="Select All" 
                  size="small" 
                  onClick={handleSelectAllLevels}
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label="Deselect All" 
                  size="small" 
                  onClick={handleDeselectAllLevels}
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {LEVELS.map(level => (
                  <Chip
                    key={level}
                    label={level}
                    size="small"
                    onClick={() => handleLevelSelect(level)}
                    color={selectedLevels.includes(level) ? 'primary' : 'default'}
                    variant={selectedLevels.includes(level) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}
