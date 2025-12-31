import { Card, Suit, Rank } from './types';

/**
 * Creates a full Five Crowns deck
 * 116 cards: 5 suits × 11 ranks × 2 copies + 6 jokers
 */
export function createDeck(): Card[] {
  const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades', 'stars'];
  const ranks: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  // Two of each suit/rank combination
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
  }

  // Six jokers
  for (let i = 0; i < 6; i++) {
    deck.push({ suit: 'clubs', rank: 'Joker' }); // Suit doesn't matter for jokers
  }

  return shuffle(deck);
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Gets the number of cards to deal for a given round (1-11)
 */
export function getCardsPerRound(round: number): number {
  return round + 2; // Round 1 = 3 cards, Round 2 = 4 cards, ..., Round 11 = 13 cards
}

/**
 * Converts round number (1-11) to Round type ('3'-'K')
 */
export function roundNumberToRound(roundNumber: number): '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' {
  const roundMap: Record<number, '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'> = {
    1: '3',
    2: '4',
    3: '5',
    4: '6',
    5: '7',
    6: '8',
    7: '9',
    8: '10',
    9: 'J',
    10: 'Q',
    11: 'K',
  };
  return roundMap[roundNumber] || '3';
}

