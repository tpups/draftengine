import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Tabs, Tab, Divider, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { Player, ScoutingGrades, ProjectionData } from '../types/models';
import { useState, useEffect } from 'react';
import { formatAgeDisplay } from '../utils/dateUtils';
import { formatPositionStats } from '../utils/positionUtils';
import { StarRating } from './StarRating';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface PlayerDetailsModalProps {
  player: Player | null;
  open: boolean;
  onClose: () => void;
}

const formatGrades = (grades: ScoutingGrades | undefined) => {
  if (!grades) return null;
  
  const formatValue = (value: number | null | undefined) => 
    value === null || value === undefined ? '-' : value.toString();

  const hitterGrades = [
    { label: 'Hit', value: formatValue(grades.hit) },
    { label: 'Raw Power', value: formatValue(grades.rawPower) },
    { label: 'Game Power', value: formatValue(grades.gamePower) },
    { label: 'Run', value: formatValue(grades.run) },
    { label: 'Arm', value: formatValue(grades.arm) },
    { label: 'Field', value: formatValue(grades.field) }
  ];

  const pitcherGrades = [
    { label: 'Fastball', value: formatValue(grades.fastball) },
    { label: 'Slider', value: formatValue(grades.slider) },
    { label: 'Curve', value: formatValue(grades.curve) },
    { label: 'Changeup', value: formatValue(grades.changeup) },
    { label: 'Control', value: formatValue(grades.control) },
    { label: 'Command', value: formatValue(grades.command) }
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {[...hitterGrades, ...pitcherGrades].map(({ label, value }) => (
        value !== '-' && (
          <Box key={label}>
            <Typography variant="subtitle2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="body1">
              {value}
            </Typography>
          </Box>
        )
      ))}
    </Box>
  );
};

interface StatGroup {
  label: string;
  stats: string[];
  displayNames?: Record<string, string>;
}

const formatStatValue = (key: string, value: number) => {
  // Whole numbers
  if (['wrc+', 'so', 'bb', 'hr', 'r', 'rbi', 'sb', 'g', 'gs', 'ip', 'sv', 'qs'].includes(key.toLowerCase())) {
    return Math.round(value).toString();
  }
  // One decimal place
  if (['war', 'k/9', 'bb/9', 'hr/9'].includes(key.toLowerCase())) {
    return value.toFixed(1);
  }
  // Percentages
  if (['k%', 'bb%', 'gb%'].includes(key.toLowerCase())) {
    return `${(value * 100).toFixed(1)}%`;
  }
  // Default to 3 decimal places
  return value.toFixed(3);
};

const renderStatGroup = (group: StatGroup, stats: Record<string, number>) => {
  const groupStats = Object.entries(stats)
    .filter(([key]) => group.stats.includes(key.toLowerCase()))
    .map(([key, value]) => ({
      key: group.displayNames?.[key.toLowerCase()] || key,
      value: formatStatValue(key, value)
    }));

  if (groupStats.length === 0) return null;

  return (
    <Box key={group.label} sx={{ mb: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'text.primary', fontWeight: 600 }}>
        {group.label}
      </Typography>
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 80px)',
        columnGap: 2
      }}>
        {[...Array(6)].map((_, i) => {
          const stat = groupStats[i];
          if (!stat) {
            return (
              <Box key={`empty-${i}`} sx={{ visibility: 'hidden' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.75, minHeight: '20px' }}>-</Typography>
                <Typography variant="body1">-</Typography>
              </Box>
            );
          }
          return (
            <Box key={stat.key} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ 
                fontWeight: 500,
                textAlign: 'center',
                mb: 0.75,
                minHeight: '20px'
              }}>
                {stat.key}
              </Typography>
              <Typography variant="body1" sx={{ 
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '1.2rem',
                letterSpacing: '-0.02em'
              }}>
                {stat.value}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const formatProjections = (projections: Record<string, ProjectionData> | undefined, isPitcher: boolean, showBoth: boolean) => {
  if (!projections) return null;

  const pitcherGroups: StatGroup[] = [
    { 
      label: 'Core', 
      stats: ['era', 'whip', 'ip'],
      displayNames: { 'era': 'ERA', 'whip': 'WHIP', 'ip': 'IP' }
    },
    { 
      label: 'Counting Stats', 
      stats: ['so', 'bb', 'hr', 'sv', 'qs', 'gs'],
      displayNames: { 'so': 'SO', 'bb': 'BB', 'hr': 'HR', 'sv': 'SV', 'qs': 'QS', 'gs': 'GS' }
    },
    { 
      label: 'Rates', 
      stats: ['k/9', 'bb/9', 'hr/9', 'k%', 'bb%', 'gb%'],
      displayNames: { 'k/9': 'K/9', 'bb/9': 'BB/9', 'hr/9': 'HR/9', 'k%': 'K%', 'bb%': 'BB%', 'gb%': 'GB%' }
    },
    { 
      label: 'Value', 
      stats: ['war', 'g'],
      displayNames: { 'war': 'WAR', 'g': 'G' }
    }
  ];

  const hitterGroups: StatGroup[] = [
    { 
      label: 'Core', 
      stats: ['avg', 'ops', 'wrc+', 'iso'],
      displayNames: { 'avg': 'AVG', 'ops': 'OPS', 'wrc+': 'wRC+', 'iso': 'ISO' }
    },
    { 
      label: 'Counting Stats', 
      stats: ['hr', 'r', 'rbi', 'sb', 'so', 'bb'],
      displayNames: { 'hr': 'HR', 'r': 'R', 'rbi': 'RBI', 'sb': 'SB', 'so': 'SO', 'bb': 'BB' }
    },
    { 
      label: 'Rates', 
      stats: ['k%', 'bb%'],
      displayNames: { 'k%': 'K%', 'bb%': 'BB%' }
    },
    { 
      label: 'Value', 
      stats: ['war', 'g'],
      displayNames: { 'war': 'WAR', 'g': 'G' }
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Object.entries(projections).map(([_, data]) => (
        <Box key={Object.keys(projections)[0]}>
          {/* Show hitter stats first if available */}
          {(showBoth || !isPitcher) && data.hitter?.stats && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: showBoth ? 4 : 0 }}>
              {showBoth && (
                <Typography variant="h6" gutterBottom>
                  Hitting Projections
                </Typography>
              )}
              {hitterGroups.map((group) => data.hitter?.stats && renderStatGroup(group, data.hitter.stats))}
            </Box>
          )}

          {/* Show pitcher stats if available */}
          {(showBoth || isPitcher) && data.pitcher?.stats && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {showBoth && (
                <Typography variant="h6" gutterBottom>
                  Pitching Projections
                </Typography>
              )}
              {pitcherGroups.map((group) => data.pitcher?.stats && renderStatGroup(group, data.pitcher.stats))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};


export function PlayerDetailsModal({ player, open, onClose }: PlayerDetailsModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const [selectedProjection, setSelectedProjection] = useState<string>('');
  const { theme } = useTheme();

  // Reset tab value when modal closes
  useEffect(() => {
    if (!open) {
      setTabValue(0);
    }
  }, [open]);

  // Set initial projection when player changes
  useEffect(() => {
    if (player?.projections) {
      setSelectedProjection(Object.keys(player.projections)[0]);
    }
  }, [player]);

  if (!player) return null;

  // Determine if player has pitcher/hitter stats based on projections
  const hasPitcherStats = player.projections && Object.values(player.projections).some(p => 
    p.pitcher?.stats && ('era' in p.pitcher.stats || 'whip' in p.pitcher.stats || 'ip' in p.pitcher.stats)
  );
  const hasHitterStats = player.projections && Object.values(player.projections).some(p => 
    p.hitter?.stats && ('avg' in p.hitter.stats || 'ops' in p.hitter.stats || 'wrc+' in p.hitter.stats)
  );
  
  // Use position if set, otherwise infer from stats
  const isPitcher = player.position?.includes('P') || (hasPitcherStats && !hasHitterStats) || false;
  const isTWP = player.position?.includes('TWP') || (hasPitcherStats && hasHitterStats) || false;

  // ... (keep all the JSX the same until the Projections tab)

  return (
    <Dialog 
      open={open} 
      onClose={(_, reason) => {
        if (reason === 'backdropClick') {
          // Prevent event bubbling when clicking outside
          document.body.click();
        }
        // Add a small delay before closing
        setTimeout(() => {
          onClose();
        }, 100);
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" component="div">
              {player.name}
            </Typography>
            {player.starsRating !== null && player.starsRating !== undefined && (
              <StarRating value={player.starsRating} readOnly />
            )}
            {player.isHighlighted && (
              <Typography 
                component="span" 
                sx={{ 
                  color: theme.colors.pickState.current,
                  fontSize: '0.8em'
                }}
              >
                ★ Highlighted
              </Typography>
            )}
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            {Array.isArray(player.position) ? player.position.join(', ') : player.position} | {player.mlbTeam || 'N/A'} | {player.level || 'N/A'}
            {player.birthDate && ` | ${formatAgeDisplay(player.birthDate)}`}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {[
              player.birthCity && `Born in ${player.birthCity}`,
              player.birthStateProvince,
              player.birthCountry
            ].filter(Boolean).join(', ')}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {[
              player.height && `Height: ${player.height}`,
              player.weight && `Weight: ${player.weight} lbs`,
              player.draftYear && `Draft Year: ${player.draftYear}`,
              player.active ? 'Active' : 'Inactive'
            ].filter(Boolean).join(' | ')}
          </Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Rankings" />
          <Tab label="Scouting" />
          <Tab label="Position" />
          <Tab label="Draft Info" />
          <Tab label="Projections" />
          <Tab label="Notes" />
        </Tabs>
      </Box>
      <DialogContent sx={{ height: '500px', overflowY: 'auto' }}>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Rankings */}
            <Typography variant="h6">Rankings</Typography>
            {player.rank && Object.entries(player.rank).map(([source, rank]) => (
              <Box key={source}>
                <Typography variant="subtitle2" color="text.secondary">
                  {source}
                </Typography>
                <Typography variant="body1">
                  #{rank}
                </Typography>
              </Box>
            ))}
            {player.prospectRank && Object.entries(player.prospectRank).map(([source, rank]) => (
              <Box key={source}>
                <Typography variant="subtitle2" color="text.secondary">
                  {source} (Prospect)
                </Typography>
                <Typography variant="body1">
                  #{rank}
                </Typography>
              </Box>
            ))}
            {player.personalRank && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Personal Rank
                </Typography>
                <Typography variant="body1">
                  #{player.personalRank}
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Personal Grades */}
            <Box>
              <Typography variant="h6" gutterBottom>Personal Grades</Typography>
              {formatGrades(player.personalGrades)}
            </Box>

            {/* Scouting Grades from Sources */}
            {player.scoutingGrades && Object.entries(player.scoutingGrades).map(([source, grades]) => (
              <Box key={source}>
                <Typography variant="h6" gutterBottom>{source} Grades</Typography>
                {formatGrades(grades)}
              </Box>
            ))}

            {/* Risk Assessment */}
            <Box>
              <Typography variant="h6" gutterBottom>Risk Assessment</Typography>
              {player.prospectRisk && Object.entries(player.prospectRisk).map(([source, risk]) => (
                <Box key={source} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {source}
                  </Typography>
                  <Typography variant="body1">
                    {risk}
                  </Typography>
                </Box>
              ))}
              {player.personalRiskAssessment && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Personal Assessment
                  </Typography>
                  <Typography variant="body1">
                    {player.personalRiskAssessment}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Games Played By Position</Typography>
            {player.positionStats && Object.entries(player.positionStats)
              .sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Sort years descending
              .map(([year, positions]) => (
                <Box key={year} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" color="text.primary" sx={{ minWidth: '60px' }}>
                      {year}:
                    </Typography>
                    <Typography variant="body1">
                      {formatPositionStats(positions)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            {(!player.positionStats || Object.keys(player.positionStats).length === 0) && (
              <Typography variant="body1">
                No position history available
              </Typography>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Draft Status */}
            <Typography variant="h6">Draft Status</Typography>
            {player.draftStatuses && player.draftStatuses.length > 0 ? (
              player.draftStatuses.map((status, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="text.primary" gutterBottom>
                    Draft #{status.draftId}
                  </Typography>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1">
                      {status.isDrafted ? 'Drafted' : 'Available'}
                    </Typography>
                  </Box>
                  {status.isDrafted && (
                    <>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Drafted By
                        </Typography>
                        <Typography variant="body1">
                          {status.managerId || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Draft Position
                        </Typography>
                        <Typography variant="body1">
                          Round {status.round || 'N/A'}, Pick {status.pick || 'N/A'} (Overall #{status.overallPick || 'N/A'})
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="body1">
                Not drafted in any drafts
              </Typography>
            )}
            {player.eta !== null && player.eta !== undefined && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  ETA
                </Typography>
                <Typography variant="body1">
                  {player.eta}
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {player.projections ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Select
                  value={selectedProjection}
                  onChange={(e: SelectChangeEvent<string>) => setSelectedProjection(e.target.value)}
                  size="small"
                  sx={{ width: 200 }}
                >
                  {Object.keys(player.projections).map(source => (
                    <MenuItem key={source} value={source}>{source}</MenuItem>
                  ))}
                </Select>
                <Typography variant="body2" color="text.secondary">
                  Last Updated: {(() => {
                    const proj = player.projections[selectedProjection];
                    if (!proj) return 'N/A';
                    return (isPitcher ? proj.pitcher?.updatedDate : proj.hitter?.updatedDate) || 'N/A';
                  })()}
                </Typography>
              </Box>
              {selectedProjection && formatProjections(
                { [selectedProjection]: player.projections[selectedProjection] },
                isPitcher,
                isTWP
              )}
            </Box>
          ) : (
            <Typography variant="body1">
              No projections available
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Notes */}
            <Typography variant="h6">Notes</Typography>
            <Typography variant="body1">
              {player.notes || 'No notes available'}
            </Typography>
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          // Add a small delay before closing
          setTimeout(() => {
            onClose();
          }, 100);
        }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
