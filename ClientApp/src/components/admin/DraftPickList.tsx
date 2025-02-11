import { Box } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import { Draft, DraftPosition, TradeAsset, TradeAssetType } from '../../types/models';
import { getDisplayPickNumber } from '../../utils/draftUtils';

interface DragContext {
  type: 'availablePicks' | 'tradeAssets';
  managerId: string;
  asset: TradeAsset;
}

interface DraftPickListProps {
  managerId: string;
  draft: Draft;
  tradeAssets?: TradeAsset[];
  onDragStart?: (dragContext: DragContext) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export function DraftPickList({ managerId, draft, tradeAssets = [], onDragStart, onDragOver, onDrop }: DraftPickListProps) {
  const { theme, mode } = useTheme();

  // Get all picks for this manager from all rounds
  const managerPicks = draft.rounds.flatMap(round => round.picks)
    .filter(pick => {
      // Current owner is either the last entry in tradedTo or the original managerId
      const currentOwner = pick.tradedTo.length 
        ? pick.tradedTo[pick.tradedTo.length - 1] 
        : pick.managerId;
      return currentOwner === managerId;
    })
    .sort((a, b) => a.overallPickNumber - b.overallPickNumber);

  const isPickInTradeAssets = (pick: DraftPosition) => {
    return tradeAssets.some(asset => 
      asset.type === TradeAssetType.DraftPick && 
      asset.overallPickNumber === pick.overallPickNumber
    );
  };

  const createTradeAsset = (pick: DraftPosition): TradeAsset => {
    const roundNumber = Math.floor((pick.overallPickNumber - 1) / draft.draftOrder.length) + 1;
    return {
      type: TradeAssetType.DraftPick,
      draftId: draft.id!,
      overallPickNumber: pick.overallPickNumber,
      pickNumber: pick.pickNumber,
      roundNumber
    };
  };

  const handleLocalDragStart = (e: React.DragEvent<HTMLDivElement>, pick: DraftPosition) => {
    if (onDragStart) {
      const asset = createTradeAsset(pick);
      const dragContext: DragContext = {
        type: 'availablePicks',
        managerId,
        asset
      };
      e.dataTransfer.setData('text/plain', JSON.stringify(dragContext));
      onDragStart(dragContext);
    }
  };

  const handleLocalDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (onDragOver) onDragOver(e);
  };

  const handleLocalDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (onDrop) onDrop(e);
  };

  const dropZoneBorderColor = mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
  const dropZoneHoverColor = mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)';

  return (
    <Box 
      sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: mode === 'light' ? 
          theme.colors.background.paper.light : 
          theme.colors.background.paper.dark,
        borderRadius: 1,
        border: `1px dashed ${dropZoneBorderColor}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'transparent',
          transition: 'background-color 0.2s ease',
          pointerEvents: 'none',
          zIndex: 1
        },
        '&:hover::before': {
          bgcolor: dropZoneHoverColor
        }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          p: 1,
          zIndex: 2
        }}
        onDragOver={handleLocalDragOver}
        onDrop={handleLocalDrop}
      >
        {managerPicks.map((pick) => {
          const roundNumber = Math.floor((pick.overallPickNumber - 1) / draft.draftOrder.length) + 1;
          const displayPickNumber = getDisplayPickNumber(draft, pick.pickNumber, roundNumber);
          const isUsed = isPickInTradeAssets(pick);
          const isDisabled = isUsed || pick.isComplete;
          
          return (
            <Box
              key={pick.overallPickNumber}
              sx={{
                p: 1,
                mb: 1,
                bgcolor: mode === 'light' ? '#fff' : theme.colors.background.elevated.dark,
                borderRadius: 1,
                cursor: isDisabled ? 'not-allowed' : 'grab',
                opacity: isDisabled ? 0.5 : 1,
                pointerEvents: isDisabled ? 'none' : 'auto',
                textDecoration: pick.isComplete ? 'line-through' : 'none',
                boxShadow: mode === 'light' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                '&:hover': !isDisabled ? {
                  bgcolor: mode === 'light' ?
                    theme.colors.action.hover.light :
                    theme.colors.action.hover.dark
                } : {},
                '&:last-child': {
                  mb: 0
                }
              }}
              draggable={!isDisabled}
              onDragStart={(e) => {
                if (isDisabled) return;
                handleLocalDragStart(e, pick);
              }}
            >
              Round {roundNumber}, Pick {displayPickNumber} {/* Added space */}
              (Overall: {pick.overallPickNumber})
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
