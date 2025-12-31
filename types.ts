export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'stars';

export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Meld {
  cards: Card[];
  type: 'book' | 'run';
}

export type Round = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

