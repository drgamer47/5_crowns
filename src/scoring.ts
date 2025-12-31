import { Card, Round } from './types';

/**
 * Calculates the point value of a card based on the current round
 * 
 * Rules:
 * - Jokers are always 50 points
 * - Wild cards (cards matching the round number) are 20 points
 *   - In round K, all Kings are wild (20 points, not 13)
 * - Face cards (J, Q, K) are 11, 12, 13 points respectively (if not wild)
 * - Number cards (3-10) are face value
 * 
 * @param card - The card to score
 * @param round - The current round number (determines wild cards)
 * @returns The point value of the card
 */
export function calculateCardPoints(card: Card, round: Round): number {
  // Jokers are always 50 points
  if (card.rank === 'Joker') {
    return 50;
  }

  // Wild cards (cards matching the round number) are 20 points
  // In round K, all Kings are wild (20 points, not 13)
  if (card.rank === round) {
    return 20;
  }

  // Face cards (only if not wild)
  if (card.rank === 'J') return 11;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'K') return 13; // Only if not wild (i.e., not round K)

  // Number cards (3-10) are face value
  const numValue = parseInt(card.rank);
  if (!isNaN(numValue)) {
    return numValue;
  }

  return 0;
}

/**
 * Checks if a card is wild in the current round
 */
export function isWildCard(card: Card, round: Round): boolean {
  return card.rank === round || card.rank === 'Joker';
}

