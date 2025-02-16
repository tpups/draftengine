import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { RankingSource, ProspectSource } from '../types/models';

interface RankingFiltersProps {
  rankingSource: RankingSource | null;
  prospectSource: ProspectSource | null;
  projectionConfig: {
    source: string | null;
    category: string | null;
  };
  onRankingSourceChange: (source: RankingSource | null) => void;
  onProspectSourceChange: (source: ProspectSource | null) => void;
  onProjectionConfigChange: (config: { source: string | null; category: string | null }) => void;
  availableRankingSources: RankingSource[];
  availableProspectSources: ProspectSource[];
  availableProjectionSources: string[];
  availableProjectionCategories: { [source: string]: string[] };
}

export const RankingFilters = ({
  rankingSource,
  prospectSource,
  projectionConfig,
  onRankingSourceChange,
  onProspectSourceChange,
  onProjectionConfigChange,
  availableRankingSources,
  availableProspectSources,
  availableProjectionSources,
  availableProjectionCategories
}: RankingFiltersProps) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', height: '40px' }}>
      <FormControl sx={{ minWidth: 120, height: '40px' }}>
        <InputLabel>Ranking Source</InputLabel>
        <Select
          value={rankingSource || ''}
          label="Ranking Source"
          onChange={(e) => {
            console.log('Ranking source change:', {
              value: e.target.value,
              type: typeof e.target.value,
              asEnum: e.target.value as RankingSource
            });
            onRankingSourceChange(e.target.value ? e.target.value as RankingSource : null);
          }}
        >
          <MenuItem value="">None</MenuItem>
          {availableRankingSources.map((source) => (
            <MenuItem key={source} value={source}>
              {source.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 120, height: '40px' }}>
        <InputLabel>Prospect Source</InputLabel>
        <Select
          value={prospectSource || ''}
          label="Prospect Source"
          onChange={(e) => onProspectSourceChange(e.target.value ? e.target.value as ProspectSource : null)}
        >
          <MenuItem value="">None</MenuItem>
          {availableProspectSources.map((source) => (
            <MenuItem key={source} value={source}>
              {source}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 120, height: '40px' }}>
        <InputLabel>Projection Source</InputLabel>
        <Select
          value={projectionConfig.source || ''}
          label="Projection Source"
          onChange={(e) => {
            const newSource = e.target.value as string;
            onProjectionConfigChange({
              source: newSource || null,
              category: null // Reset category when source changes
            });
          }}
        >
          <MenuItem value="">None</MenuItem>
          {availableProjectionSources.map((source) => (
            <MenuItem key={source} value={source}>
              {source}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {projectionConfig.source && (
        <FormControl sx={{ minWidth: 120, height: '40px' }}>
          <InputLabel>Stat Category</InputLabel>
          <Select
            value={projectionConfig.category || ''}
            label="Stat Category"
            onChange={(e) => {
              onProjectionConfigChange({
                ...projectionConfig,
                category: e.target.value || null
              });
            }}
          >
            <MenuItem value="">None</MenuItem>
            {availableProjectionCategories[projectionConfig.source]?.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};
