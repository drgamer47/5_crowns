import { useState } from 'react';
import { 
  SquaresPlusIcon,
  TrashIcon,
  UserIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Card } from '../../types';
import { GameState } from '../../gameTypes';
import { roundNumberToRound } from '../../gameUtils';
import { findMelds } from '../../meldFinder';
import PlayingCard from '../PlayingCard';

interface PlayerTurnProps {
  gameState: GameState;
  onDrawFromDeck: () => void;
  onDrawFromDiscard: () => void;
  onDiscard: (cardIndex: number) => void;
  onTryGoOut: () => void;
  onResetGame?: () => void;
}

export default function PlayerTurn({
  gameState,
  onDrawFromDeck,
  onDrawFromDiscard,
  onDiscard,
  onTryGoOut,
  onResetGame,
}: PlayerTurnProps) {
  const [showGoOutResult, setShowGoOutResult] = useState<{
    success: boolean;
    melds: { cards: Card[]; type: 'book' | 'run' }[];
    message: string;
    discardIndex?: number; // Index of the card that should be discarded
  } | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentHand = gameState.playerHands[gameState.currentPlayerIndex];
  const round = roundNumberToRound(gameState.currentRound);
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const hasDrawn = gameState.drawnCard !== null;

  const handleTryGoOut = () => {
    if (currentHand.length === 0) {
      setShowGoOutResult({
        success: false,
        melds: [],
        message: 'Cannot go out with an empty hand',
      });
      return;
    }

    // Check if we can go out by trying to discard each card
    // If discarding any card leaves a hand where all remaining cards form melds, we can go out
    let bestResult: { success: boolean; melds: { cards: Card[]; type: 'book' | 'run' }[]; message?: string } | null = null;

    let bestDiscardIndex = -1;
    for (let discardIndex = 0; discardIndex < currentHand.length; discardIndex++) {
      // Try discarding this card
      const remainingHand = currentHand.filter((_, idx) => idx !== discardIndex);
      
      // Find melds in the remaining hand
      const melds = findMelds(remainingHand, round);
      
      // Check if all remaining cards can form melds
      const canGoOut = canGoOutWithHand(remainingHand, melds, round);
      
      if (canGoOut.success) {
        bestResult = canGoOut;
        bestDiscardIndex = discardIndex;
        break; // Found a valid way to go out
      }
      
      // Keep track of the best attempt
      if (!bestResult || (canGoOut.melds.length > 0 && bestResult.melds.length === 0)) {
        bestResult = canGoOut;
        bestDiscardIndex = discardIndex;
      }
    }

    if (bestResult && bestResult.success) {
      setShowGoOutResult({
        success: true,
        melds: bestResult.melds,
        message: 'Success! You can go out! Discard the highlighted card below to complete your turn.',
        discardIndex: bestDiscardIndex,
      });
      onTryGoOut();
    } else {
      setShowGoOutResult({
        success: false,
        melds: [],
        message: bestResult?.message || 'Cannot go out - not all cards form valid melds',
      });
    }
  };

  const handleDiscard = (cardIndex: number) => {
    if (!hasDrawn) {
      alert('You must draw a card before discarding');
      return;
    }

    const cardToDiscard = currentHand[cardIndex];
    
    // Warn before discarding a Joker (very valuable card)
    if (cardToDiscard.rank === 'Joker') {
      const confirmDiscard = window.confirm(
        '⚠️ WARNING: You are about to discard a Joker (50 points, can be used as any card).\n\n' +
        'Jokers are extremely valuable and should rarely be discarded. Are you sure you want to discard this Joker?'
      );
      if (!confirmDiscard) {
        return; // User cancelled
      }
    }

    onDiscard(cardIndex);
    setShowGoOutResult(null);
  };

  const getWildDisplay = (roundNumber: number): string => {
    const round = roundNumberToRound(roundNumber);
    return `${round}s & Jokers`;
  };

  const otherPlayers = gameState.players
    .map((player, idx) => ({
      name: player,
      cardCount: gameState.playerHands[idx].length,
    }))
    .filter((_, idx) => idx !== gameState.currentPlayerIndex);

  return (
    <div className="max-w-7xl mx-auto px-6 pb-12">
      {/* Game Info Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Round {gameState.currentRound} - {getWildDisplay(gameState.currentRound)}
            </h2>
            <p className="text-blue-100">
              {gameState.players[gameState.dealerIndex]} is dealing this round
            </p>
            {gameState.roundEnded && (
              <p className="text-amber-200 font-semibold mt-2">
                {gameState.players[gameState.wentOutPlayerIndex!]} went out! Final turns in progress...
              </p>
            )}
          </div>
          
          {/* Right side - Reset button */}
          {onResetGame && (
            <button 
              onClick={onResetGame}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white 
                         rounded-lg font-semibold shadow-md transition-colors
                         flex items-center gap-2">
              <TrashIcon className="w-5 h-5" />
              Reset Game
            </button>
          )}
        </div>
      </div>

      {/* Current Turn Banner */}
      <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-6 mb-6">
        <h3 className="text-3xl font-bold text-amber-900 text-center">
          {currentPlayer}'s Turn
        </h3>
      </div>

      {/* Game State Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <SquaresPlusIcon className="w-12 h-12 mx-auto mb-2 text-blue-600" />
          <div className="text-sm text-gray-600 mb-1">Deck</div>
          <div className="text-2xl font-bold text-gray-900">{gameState.deck.length} cards</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <TrashIcon className="w-12 h-12 mx-auto mb-2 text-gray-600" />
          <div className="text-sm text-gray-600 mb-1">Discard Pile</div>
          <div className="text-2xl font-bold text-gray-900">{gameState.discardPile.length} cards</div>
        </div>
        
        {otherPlayers.map((player, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md p-6 text-center">
            <UserIcon className="w-12 h-12 mx-auto mb-2 text-purple-600" />
            <div className="text-sm text-gray-600 mb-1">{player.name}</div>
            <div className="text-2xl font-bold text-gray-900">{player.cardCount} cards</div>
          </div>
        ))}
      </div>

      {/* Discard Pile Display */}
      {topDiscard && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top of Discard Pile:</h3>
          <div className="flex flex-col items-center gap-4">
            <PlayingCard 
              card={topDiscard} 
              round={round} 
              size="lg" 
              readonly 
              showPoints
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!hasDrawn && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={onDrawFromDeck}
              disabled={gameState.deck.length === 0}
              className="flex-1 min-w-[200px] px-6 py-4 bg-blue-600 text-white 
                         rounded-lg font-bold text-lg hover:bg-blue-700 
                         transition-colors shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              <SquaresPlusIcon className="w-5 h-5" />
              Draw from Deck
            </button>
            {topDiscard && (
              <button
                onClick={onDrawFromDiscard}
                className="flex-1 min-w-[200px] px-6 py-4 bg-green-600 text-white 
                           rounded-lg font-bold text-lg hover:bg-green-700 
                           transition-colors shadow-md hover:shadow-lg
                           flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                {topDiscard.rank === 'Joker' ? '🃏' : topDiscard.suit === 'clubs' ? '♣' : 
                 topDiscard.suit === 'diamonds' ? '♦' : topDiscard.suit === 'hearts' ? '♥' : 
                 topDiscard.suit === 'spades' ? '♠' : '★'} {topDiscard.rank} Take from Discard
              </button>
            )}
          </div>
        </div>
      )}

      {/* Try to Go Out Button */}
      {hasDrawn && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <button
            onClick={handleTryGoOut}
            className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg font-bold text-lg 
                       hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
          >
            Try to Go Out
          </button>
          <p className="text-sm text-gray-600 mt-2 text-center">
            {gameState.roundEnded 
              ? "Final turn - try to go out to minimize your points!"
              : "Validate that all but one card can form melds"}
          </p>
        </div>
      )}

      {/* Go Out Result */}
      {showGoOutResult && (
        <div className={`rounded-xl shadow-md p-6 mb-6 border-2 ${
          showGoOutResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`font-bold text-lg mb-3 ${
            showGoOutResult.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {showGoOutResult.message}
          </p>
          {showGoOutResult.success && showGoOutResult.melds.length > 0 && (
            <div className="space-y-3">
              <div className="font-semibold text-gray-900">Melds:</div>
              {showGoOutResult.melds.map((meld, idx) => (
                <div key={idx} className="flex flex-wrap gap-3">
                  {meld.cards.map((card, cardIdx) => (
                    <PlayingCard
                      key={cardIdx}
                      card={card}
                      round={round}
                      size="sm"
                      readonly
                    />
                  ))}
                </div>
              ))}
              <p className="text-sm text-gray-700 mt-3">
                Now discard one card to complete your turn and go out.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Your Hand */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Your Hand ({currentHand.length} cards)
          </h3>
          {hasDrawn && (
            <button
              onClick={handleTryGoOut}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg 
                         font-semibold hover:bg-purple-700 transition-colors shadow-sm hover:shadow-md
                         flex items-center gap-2"
            >
              <CheckIcon className="w-5 h-5" />
              Try to Go Out
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-4">
          {currentHand.map((card, index) => {
            // Check if this card is in a meld (when going out)
            const isInMeld = showGoOutResult?.success && showGoOutResult.melds.some(meld =>
              meld.cards.some(meldCard => 
                meldCard.suit === card.suit && meldCard.rank === card.rank
              )
            );
            
            // Check if this is the card to discard
            const isDiscardCard = showGoOutResult?.success && showGoOutResult.discardIndex === index;
            
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <PlayingCard
                  card={card}
                  round={round}
                  onClick={hasDrawn ? () => handleDiscard(index) : undefined}
                  size="md"
                  highlighted={isInMeld || isDiscardCard}
                  highlightColor={isDiscardCard ? 'red' : 'green'}
                  showPoints={true}
                />
              </div>
            );
          })}
        </div>
        
        {hasDrawn && (
          <p className="text-sm text-gray-600 mt-4 text-center">
            {showGoOutResult?.success 
              ? 'Cards in green borders are in melds. Discard the card with red border to go out!'
              : 'Click a card to discard it'}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Checks if a hand can go out (all remaining cards must be in melds)
 * This is called with the remaining hand after discarding one card,
 * so ALL cards in the remaining hand must be used in melds
 */
function canGoOutWithHand(
  hand: Card[],
  melds: { cards: Card[]; type: 'book' | 'run' }[],
  _round: '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
): { success: boolean; melds: { cards: Card[]; type: 'book' | 'run' }[]; message?: string } {
  if (hand.length === 0) {
    return { success: false, melds: [], message: 'Hand is empty' };
  }

  if (melds.length === 0) {
    return { success: false, melds: [], message: 'No valid melds found' };
  }

  // Try to find a combination of melds that uses ALL cards
  // (Since we're checking the remaining hand after discarding, all cards must be used)
  const bestCombination = findBestMeldCombination(hand, melds);

  // ALL cards must be used in melds (not all but one, since we already discarded one)
  if (bestCombination.usedCards === hand.length) {
    return { success: true, melds: bestCombination.melds };
  }

  return {
    success: false,
    melds: [],
    message: `Only ${bestCombination.usedCards} of ${hand.length} cards can be used in melds. All ${hand.length} cards must be used to go out.`,
  };
}

/**
 * Finds the best combination of melds that uses the most cards
 */
function findBestMeldCombination(
  hand: Card[],
  melds: { cards: Card[]; type: 'book' | 'run' }[]
): { melds: { cards: Card[]; type: 'book' | 'run' }[]; usedCards: number } {
  if (melds.length === 0) {
    return { melds: [], usedCards: 0 };
  }

  // Create a map of available card instances (by index) for matching
  // This handles duplicate cards correctly
  const availableIndices = new Set<number>();
  for (let i = 0; i < hand.length; i++) {
    availableIndices.add(i);
  }

  const selectedMelds: { cards: Card[]; type: 'book' | 'run' }[] = [];

  // Sort melds by size (larger first) to prioritize bigger melds
  const sortedMelds = [...melds].sort((a, b) => b.cards.length - a.cards.length);

  for (const meld of sortedMelds) {
    // Try to match each card in the meld to an available card in the hand
    const meldIndices: number[] = [];
    const tempAvailable = new Set(availableIndices);
    let canUseMeld = true;

    for (const meldCard of meld.cards) {
      // Find an available card that matches this meld card
      // First try to match by object reference (if meld cards are from the hand)
      let found = false;
      let matchedIndex = -1;
      
      // Check if this meld card is actually in the hand (object reference match)
      const directIndex = hand.findIndex((c, idx) => c === meldCard && tempAvailable.has(idx));
      if (directIndex !== -1) {
        matchedIndex = directIndex;
        found = true;
      } else {
        // Otherwise match by suit and rank
        for (const idx of tempAvailable) {
          const handCard = hand[idx];
          if (handCard.suit === meldCard.suit && handCard.rank === meldCard.rank) {
            matchedIndex = idx;
            found = true;
            break;
          }
        }
      }
      
      if (found) {
        meldIndices.push(matchedIndex);
        tempAvailable.delete(matchedIndex);
      } else {
        canUseMeld = false;
        break;
      }
    }

    if (canUseMeld) {
      // Use this meld - remove the used indices from available
      meldIndices.forEach(idx => availableIndices.delete(idx));
      selectedMelds.push(meld);
    }
  }

  return { 
    melds: selectedMelds, 
    usedCards: hand.length - availableIndices.size 
  };
}

