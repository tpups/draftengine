# IBW Dynasty Top 1000 Rankings Import Strategy

## Context
Import process for the 2025 IBW Dynasty Top 1000 rankings CSV file.

## Import Requirements
- Data Type: Rankings
- Data Source: IBW
- Ranking Source: RankingSource.IBW

## Name Matching Strategy
- Use StringNormalizationUtils.NormalizedEquals
- Case-insensitive
- Handles diacritics
- Matches existing players by name

## Player Handling
### Existing Players
- Add IBW rank to Rank dictionary
- Preserve existing player data
- Update LastUpdated timestamp

### New Players
- Create new player record
- Populate:
  * Name (from NAME column)
  * Team (from TM column)
  * Position (from POS column)
  * CreatedFrom: "IBW Rankings"
  * Rank: Add to Rank dictionary

## Validation Rules
- Validate rank values
  * Must be positive integers
  * Prevent duplicate ranks
- Prompt user for number of players to import
- Support importing subset of 1000-player list

## Proposed Implementation
1. Create static method in CsvPlayerImport for rankings import
2. Leverage existing ParseCsvContent method
3. Add specific logic for rank handling
4. Use existing MapToPlayer method with modifications

## Potential Challenges
- Handling players with multiple positions
- Matching players with slight name variations
- Preserving existing player metadata

## Next Steps
1. Implement rankings-specific import method
2. Add comprehensive unit tests
3. Verify import process with sample data
4. Document any edge cases discovered during implementation
