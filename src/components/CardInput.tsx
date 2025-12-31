import { useState } from 'react';
import { Card, Suit, Rank } from '../types';

interface CardInputProps {
  cards: Card[];
  onCardsChange: (cards: Card[]) => void;
}

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades', 'stars'];
const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'Joker'];

const SUIT_COLORS: Record<Suit, string> = {
  clubs: 'bg-green-100 border-green-500 text-green-800',
  diamonds: 'bg-blue-100 border-blue-500 text-blue-800',
  hearts: 'bg-red-100 border-red-500 text-red-800',
  spades: 'bg-gray-100 border-gray-500 text-gray-800',
  stars: 'bg-yellow-100 border-yellow-500 text-yellow-800',
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  stars: '★',
};

export default function CardInput({ cards, onCardsChange }: CardInputProps) {
  const [selectedSuit, setSelectedSuit] = useState<Suit>('clubs');
  const [selectedRank, setSelectedRank] = useState<Rank>('3');

  const handleAddCard = () => {
    const newCard: Card = {
      suit: selectedSuit,
      rank: selectedRank,
    };
    onCardsChange([...cards, newCard]);
  };

  const handleRemoveCard = (index: number) => {
    const cardToRemove = cards[index];
    
    // Warn before removing a Joker (very valuable card)
    if (cardToRemove.rank === 'Joker') {
      const confirmRemove = window.confirm(
        '⚠️ WARNING: You are about to remove a Joker (50 points, can be used as any card).\n\n' +
        'Jokers are extremely valuable and should rarely be removed. Are you sure you want to remove this Joker?'
      );
      if (!confirmRemove) {
        return; // User cancelled
      }
    }
    
    onCardsChange(cards.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    // Check if there are any Jokers in the hand
    const hasJokers = cards.some(card => card.rank === 'Joker');
    
    if (hasJokers) {
      const jokerCount = cards.filter(card => card.rank === 'Joker').length;
      const confirmClear = window.confirm(
        `⚠️ WARNING: You are about to clear all cards, including ${jokerCount} Joker${jokerCount > 1 ? 's' : ''} (50 points each, can be used as any card).\n\n` +
        'Jokers are extremely valuable. Are you sure you want to clear all cards?'
      );
      if (!confirmClear) {
        return; // User cancelled
      }
    }
    
    onCardsChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Add Card</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Suit</label>
            <select
              value={selectedSuit}
              onChange={(e) => setSelectedSuit(e.target.value as Suit)}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUITS.map((suit) => (
                <option key={suit} value={suit}>
                  {suit.charAt(0).toUpperCase() + suit.slice(1)} {SUIT_SYMBOLS[suit]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rank</label>
            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value as Rank)}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RANKS.map((rank) => (
                <option key={rank} value={rank}>
                  {rank}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddCard}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add Card
          </button>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Your Hand ({cards.length} cards)</h3>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cards.map((card, index) => {
              const isJoker = card.rank === 'Joker';
              const suitClass = isJoker
                ? 'bg-purple-100 border-purple-500 text-purple-800'
                : SUIT_COLORS[card.suit];
              return (
                <div
                  key={index}
                  className={`px-3 py-2 border-2 rounded-lg font-semibold flex items-center gap-2 ${suitClass}`}
                >
                  <span>
                    {isJoker ? '🃏' : SUIT_SYMBOLS[card.suit]} {card.rank}
                  </span>
                  <button
                    onClick={() => handleRemoveCard(index)}
                    className="text-red-600 hover:text-red-800 font-bold"
                    aria-label="Remove card"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
          No cards added yet. Add at least 3 cards to find melds.
        </div>
      )}
    </div>
  );
}

