import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Tabs, Tab, Divider } from '@mui/material';
import { Player, ScoutingGrades } from '../types/models';
import { useState } from 'react';
import { formatAgeDisplay } from '../utils/dateUtils';
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
        <Box sx={{ p: 3 }}>
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

export function PlayerDetailsModal({ player, open, onClose }: PlayerDetailsModalProps) {
  const [tabValue, setTabValue] = useState(0);

  if (!player) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
                  color: 'warning.main',
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
        </Box>
      </DialogTitle>
      <Divider />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Rankings" />
          <Tab label="Scouting" />
          <Tab label="Draft Info" />
          <Tab label="Notes" />
        </Tabs>
      </Box>
      <DialogContent>
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

        <TabPanel value={tabValue} index={3}>
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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
