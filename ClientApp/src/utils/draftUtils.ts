import { Draft } from '../types/models';

/**
 * Gets the display pick number for snake drafts
 * In snake rounds (even rounds), inverts the pick number
 * @param draft The draft object
 * @param pickNumber The actual pick number
 * @returns The display pick number
 */
export const getDisplayPickNumber = (draft: Draft, pickNumber: number, round?: number) => {
  // For toolbar display, use active round if no specific round provided
  const roundToCheck = round ?? draft.activeRound;
  
  if (!draft.isSnakeDraft || !roundToCheck || roundToCheck % 2 !== 0) {
    return pickNumber;
  }
  // In snake rounds (even rounds), invert the pick number
  const totalPicks = draft.draftOrder.length;
  return totalPicks - pickNumber + 1;
};
