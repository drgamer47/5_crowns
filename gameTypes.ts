import { Card } from './types';

export type GamePhase = 'setup' | 'playing' | 'roundEnd' | 'gameEnd';

export interface GameState {
  phase: GamePhase;
  players: string[];
  currentRound: number; // 1-11
  currentPlayerIndex: number;
  dealerIndex: number; // Index of player who deals this round
  deck: Card[];
  discardPile: Card[];
  playerHands: Card[][];
  roundEnded: boolean;
  finalTurnsTaken: boolean[];
  scores: number[][]; // scores[roundIndex][playerIndex]
  wentOutPlayerIndex: number | null; // First player to go out (for display)
  playersWhoWentOut: boolean[]; // Track all players who went out (get 0 points)
  drawnCard: Card | null; // Card drawn this turn (before discard)
}

