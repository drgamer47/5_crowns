import { useReducer, useEffect } from 'react';
import { Card, Round } from '../types';
import { GameState } from '../gameTypes';
import { createDeck, getCardsPerRound, roundNumberToRound } from '../gameUtils';
import GameSetup from './game/GameSetup';
import PlayerTurn from './game/PlayerTurn';
import RoundEnd from './game/RoundEnd';
import GameEnd from './game/GameEnd';

type GameAction =
  | { type: 'START_GAME'; players: string[] }
  | { type: 'START_ROUND' }
  | { type: 'DRAW_FROM_DECK'; playerIndex: number }
  | { type: 'DRAW_FROM_DISCARD'; playerIndex: number }
  | { type: 'DISCARD_CARD'; playerIndex: number; cardIndex: number }
  | { type: 'TRY_GO_OUT'; playerIndex: number }
  | { type: 'CONTINUE_AFTER_GO_OUT' }
  | { type: 'END_ROUND' }
  | { type: 'NEXT_ROUND' }
  | { type: 'ENTER_SCORES'; scores: number[] };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const deck = createDeck();
      const cardsPerRound = getCardsPerRound(1);
      const playerHands: Card[][] = [];
      
      // Deal initial hands
      let deckIndex = 0;
      for (let i = 0; i < action.players.length; i++) {
        playerHands.push([]);
        for (let j = 0; j < cardsPerRound; j++) {
          playerHands[i].push(deck[deckIndex++]);
        }
      }
      
      // Turn over top card to discard pile
      const discardPile = [deck[deckIndex++]];
      const remainingDeck = deck.slice(deckIndex);
      
      // Round 1: Player 0 deals, Player 1 goes first (clockwise from dealer)
      const dealerIndex = 0;
      const firstPlayerIndex = (dealerIndex + 1) % action.players.length;
      
      return {
        phase: 'playing',
        players: action.players,
        currentRound: 1,
        currentPlayerIndex: firstPlayerIndex,
        dealerIndex: dealerIndex,
        deck: remainingDeck,
        discardPile,
        playerHands,
        roundEnded: false,
        finalTurnsTaken: new Array(action.players.length).fill(false),
        scores: [],
        wentOutPlayerIndex: null,
        playersWhoWentOut: new Array(action.players.length).fill(false),
        drawnCard: null,
      };
    }

    case 'START_ROUND': {
      const deck = createDeck();
      const cardsPerRound = getCardsPerRound(state.currentRound);
      const playerHands: Card[][] = [];
      
      // Deal new hands
      let deckIndex = 0;
      for (let i = 0; i < state.players.length; i++) {
        playerHands.push([]);
        for (let j = 0; j < cardsPerRound; j++) {
          playerHands[i].push(deck[deckIndex++]);
        }
      }
      
      // Turn over top card to discard pile
      const discardPile = [deck[deckIndex++]];
      const remainingDeck = deck.slice(deckIndex);
      
      // Rotate dealer clockwise for new round
      const newDealerIndex = (state.dealerIndex + 1) % state.players.length;
      // Player clockwise from dealer goes first
      const firstPlayerIndex = (newDealerIndex + 1) % state.players.length;
      
      return {
        ...state,
        phase: 'playing',
        deck: remainingDeck,
        discardPile,
        playerHands,
        roundEnded: false,
        currentPlayerIndex: firstPlayerIndex,
        dealerIndex: newDealerIndex,
        finalTurnsTaken: new Array(state.players.length).fill(false),
        wentOutPlayerIndex: null,
        playersWhoWentOut: new Array(state.players.length).fill(false),
        drawnCard: null,
      };
    }

    case 'DRAW_FROM_DECK': {
      if (state.deck.length === 0) return state;
      const drawnCard = state.deck[0];
      const newDeck = state.deck.slice(1);
      const newHand = [...state.playerHands[action.playerIndex], drawnCard];
      const newHands = [...state.playerHands];
      newHands[action.playerIndex] = newHand;
      
      return {
        ...state,
        deck: newDeck,
        playerHands: newHands,
        drawnCard,
      };
    }

    case 'DRAW_FROM_DISCARD': {
      if (state.discardPile.length === 0) return state;
      const drawnCard = state.discardPile[state.discardPile.length - 1];
      const newDiscardPile = state.discardPile.slice(0, -1);
      const newHand = [...state.playerHands[action.playerIndex], drawnCard];
      const newHands = [...state.playerHands];
      newHands[action.playerIndex] = newHand;
      
      return {
        ...state,
        discardPile: newDiscardPile,
        playerHands: newHands,
        drawnCard,
      };
    }

    case 'DISCARD_CARD': {
      const hand = state.playerHands[action.playerIndex];
      const discardedCard = hand[action.cardIndex];
      const newHand = hand.filter((_, i) => i !== action.cardIndex);
      const newHands = [...state.playerHands];
      newHands[action.playerIndex] = newHand;
      const newDiscardPile = [...state.discardPile, discardedCard];
      
      // If round ended, mark this player as having taken final turn
      let newFinalTurnsTaken = [...state.finalTurnsTaken];
      if (state.roundEnded) {
        newFinalTurnsTaken[action.playerIndex] = true;
        // Check if all players (except the one who went out) have taken final turn
        const allTaken = newFinalTurnsTaken.every((taken, idx) => 
          idx === state.wentOutPlayerIndex || taken
        );
        if (allTaken) {
          return {
            ...state,
            phase: 'roundEnd',
            playerHands: newHands,
            discardPile: newDiscardPile,
            drawnCard: null,
          };
        }
      }
      
      // Move to next player
      let nextPlayerIndex = (action.playerIndex + 1) % state.players.length;
      
      return {
        ...state,
        playerHands: newHands,
        discardPile: newDiscardPile,
        currentPlayerIndex: nextPlayerIndex,
        drawnCard: null,
        finalTurnsTaken: newFinalTurnsTaken,
      };
    }

    case 'TRY_GO_OUT': {
      // Validation happens in component, this just sets the state
      const newFinalTurnsTaken = [...state.finalTurnsTaken];
      newFinalTurnsTaken[action.playerIndex] = true; // Player who went out has taken their turn
      
      // Track that this player went out (they get 0 points)
      const newPlayersWhoWentOut = [...state.playersWhoWentOut];
      newPlayersWhoWentOut[action.playerIndex] = true;
      
      // If round hasn't ended yet, this is the first player going out
      // If round has already ended, this is another player going out during final turns
      const isFirstToGoOut = !state.roundEnded;
      
      return {
        ...state,
        roundEnded: true,
        wentOutPlayerIndex: isFirstToGoOut ? action.playerIndex : state.wentOutPlayerIndex,
        playersWhoWentOut: newPlayersWhoWentOut,
        finalTurnsTaken: newFinalTurnsTaken,
      };
    }


    case 'END_ROUND': {
      return {
        ...state,
        phase: 'roundEnd',
      };
    }

    case 'NEXT_ROUND': {
      if (state.currentRound >= 11) {
        return {
          ...state,
          phase: 'gameEnd',
        };
      }
      
      return {
        ...state,
        currentRound: state.currentRound + 1,
      };
    }

    case 'ENTER_SCORES': {
      const newScores = [...state.scores];
      newScores.push(action.scores);
      
      return {
        ...state,
        scores: newScores,
      };
    }

    default:
      return state;
  }
}

const STORAGE_KEY = '5crowns-game-state';

const getInitialState = (): GameState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fall through to default
    }
  }
  return {
    phase: 'setup',
    players: [],
    currentRound: 1,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    deck: [],
    discardPile: [],
    playerHands: [],
    roundEnded: false,
    finalTurnsTaken: [],
    scores: [],
    wentOutPlayerIndex: null,
    playersWhoWentOut: [],
    drawnCard: null,
  };
};

export default function PlayGame() {
  const [gameState, dispatch] = useReducer(gameReducer, getInitialState());

  // Persist game state to localStorage whenever it changes
  useEffect(() => {
    if (gameState.phase !== 'setup') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } else {
      // Clear saved game when starting fresh
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [gameState]);

  // Sync current player's hand to MeldHelper when in playing phase
  useEffect(() => {
    if (gameState.phase === 'playing' && gameState.playerHands.length > 0) {
      const currentHand = gameState.playerHands[gameState.currentPlayerIndex];
      const round = roundNumberToRound(gameState.currentRound);
      const topDiscard = gameState.discardPile.length > 0 
        ? gameState.discardPile[gameState.discardPile.length - 1] 
        : null;
      
      // Update MeldHelper localStorage
      const meldHelperData = {
        cards: currentHand,
        round: round,
        discardCard: topDiscard,
        isFinalTurn: gameState.roundEnded, // Pass final turn status
      };
      localStorage.setItem('5crowns-meldhelper', JSON.stringify(meldHelperData));
      
      // Trigger custom event for MeldHelper to pick up changes (same tab)
      window.dispatchEvent(new CustomEvent('meldHelperUpdate'));
    }
  }, [gameState.phase, gameState.currentPlayerIndex, gameState.playerHands, gameState.currentRound, gameState.discardPile]);

  // Sync players and current round to Scoresheet when in playing phase
  useEffect(() => {
    if (gameState.phase === 'playing' && gameState.players.length > 0) {
      const round = roundNumberToRound(gameState.currentRound);
      const scoresheetKey = '5crowns-scoresheet';
      const savedScoresheet = localStorage.getItem(scoresheetKey);
      
      let scoresheetData: {
        players: string[];
        scores: Record<string, Record<Round, number>>;
        currentRound: Round;
      };
      
      if (savedScoresheet) {
        try {
          scoresheetData = JSON.parse(savedScoresheet);
        } catch {
          scoresheetData = {
            players: gameState.players,
            scores: {},
            currentRound: round,
          };
        }
      } else {
        scoresheetData = {
          players: gameState.players,
          scores: {},
          currentRound: round,
        };
      }
      
      // Update players list to match game state
      scoresheetData.players = gameState.players;
      
      // Initialize scores for new players (using index as key)
      gameState.players.forEach((_, index) => {
        const key = String(index);
        if (!scoresheetData.scores[key]) {
          scoresheetData.scores[key] = {} as Record<Round, number>;
        }
      });
      
      // Update current round to match the game
      scoresheetData.currentRound = round;
      
      localStorage.setItem(scoresheetKey, JSON.stringify(scoresheetData));
      // Trigger custom event for Scoresheet to pick up changes (same tab)
      window.dispatchEvent(new CustomEvent('scoresheetUpdate'));
    }
  }, [gameState.phase, gameState.currentRound, gameState.players]);

  if (gameState.phase === 'setup') {
    const hasSavedGame = localStorage.getItem(STORAGE_KEY) !== null;
    return (
      <GameSetup
        onStartGame={(players) => dispatch({ type: 'START_GAME', players })}
        hasSavedGame={hasSavedGame}
        onClearSavedGame={() => {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('5crowns-scoresheet');
          localStorage.removeItem('5crowns-meldhelper');
          window.location.reload(); // Reload to reset state
        }}
      />
    );
  }

  if (gameState.phase === 'roundEnd') {
    return (
      <RoundEnd
        gameState={gameState}
        onEnterScores={(scores) => {
          dispatch({ type: 'ENTER_SCORES', scores });
          
          // Sync scores to Scoresheet
          const round = roundNumberToRound(gameState.currentRound);
          const scoresheetKey = '5crowns-scoresheet';
          const savedScoresheet = localStorage.getItem(scoresheetKey);
          let scoresheetData: {
            players: string[];
            scores: Record<string, Record<Round, number>>;
            currentRound: Round;
          };
          
          if (savedScoresheet) {
            try {
              scoresheetData = JSON.parse(savedScoresheet);
            } catch {
              scoresheetData = {
                players: gameState.players,
                scores: {},
                currentRound: round,
              };
            }
          } else {
            scoresheetData = {
              players: gameState.players,
              scores: {},
              currentRound: round,
            };
          }
          
          // Update player list if needed
          scoresheetData.players = gameState.players;
          // Don't update currentRound here - let the useEffect sync it when the round starts
          
          // Initialize scores for players if needed (using index as key)
          gameState.players.forEach((_, index) => {
            const key = String(index);
            if (!scoresheetData.scores[key]) {
              scoresheetData.scores[key] = {} as Record<Round, number>;
            }
          });
          
          // Update scores for current round
          gameState.players.forEach((_, index) => {
            const key = String(index);
            scoresheetData.scores[key][round] = scores[index];
          });
          
          localStorage.setItem(scoresheetKey, JSON.stringify(scoresheetData));
          
          // Trigger custom event for Scoresheet to pick up changes (same tab)
          window.dispatchEvent(new CustomEvent('scoresheetUpdate'));
          
          // Automatically continue to next round (if not the last round)
          if (gameState.currentRound < 11) {
            dispatch({ type: 'NEXT_ROUND' });
            dispatch({ type: 'START_ROUND' });
          } else {
            // Last round - go to game end
            dispatch({ type: 'NEXT_ROUND' });
          }
        }}
      />
    );
  }

  if (gameState.phase === 'gameEnd') {
    return <GameEnd gameState={gameState} />;
  }

  const handleResetGame = () => {
    if (window.confirm('Are you sure you want to reset the game? This will clear all progress, scoresheet, and meld helper data.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('5crowns-scoresheet');
      localStorage.removeItem('5crowns-meldhelper');
      window.location.reload();
    }
  };

  return (
    <div>
      <PlayerTurn
        gameState={gameState}
        onDrawFromDeck={() => dispatch({ type: 'DRAW_FROM_DECK', playerIndex: gameState.currentPlayerIndex })}
        onDrawFromDiscard={() => dispatch({ type: 'DRAW_FROM_DISCARD', playerIndex: gameState.currentPlayerIndex })}
        onDiscard={(cardIndex) => dispatch({ type: 'DISCARD_CARD', playerIndex: gameState.currentPlayerIndex, cardIndex })}
        onTryGoOut={() => dispatch({ type: 'TRY_GO_OUT', playerIndex: gameState.currentPlayerIndex })}
        onResetGame={handleResetGame}
      />
    </div>
  );
}

