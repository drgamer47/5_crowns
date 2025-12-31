import { useState, useEffect, useRef } from 'react';
import { 
  SquaresPlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card, Round, Suit, Rank } from '../types';
import { findMelds, suggestDiscard, findBestMeldCombinationForHelper } from '../meldFinder';
import { calculateCardPoints, isWildCard } from '../scoring';
import PlayingCard from './PlayingCard';
import DrawRecommendation from './DrawRecommendation';

const ROUNDS: Round[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  stars: '★',
};

const STORAGE_KEY = '5crowns-meldhelper';

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades', 'stars'];
const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'Joker'];

export default function MeldHelper() {
  const isLoadingFromStorage = useRef(false);
  
  const [cards, setCards] = useState<Card[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.cards || [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [round, setRound] = useState<Round>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.round || '3';
      } catch {
        return '3';
      }
    }
    return '3';
  });

  const [discardCard, setDiscardCard] = useState<Card | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.discardCard || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isFinalTurn, setIsFinalTurn] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.isFinalTurn || false;
      } catch {
        return false;
      }
    }
    return false;
  });

  const [selectedSuit, setSelectedSuit] = useState<Suit>('clubs');
  const [selectedRank, setSelectedRank] = useState<Rank>('3');

  // Load data from localStorage when component mounts or window gains focus
  const loadFromStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        isLoadingFromStorage.current = true;
        const data = JSON.parse(saved);
        if (data.cards) setCards(data.cards);
        if (data.round) setRound(data.round);
        if (data.discardCard !== undefined) setDiscardCard(data.discardCard);
        if (data.isFinalTurn !== undefined) setIsFinalTurn(data.isFinalTurn);
        setTimeout(() => {
          isLoadingFromStorage.current = false;
        }, 0);
      } catch {
        isLoadingFromStorage.current = false;
      }
    }
  };

  // Listen for storage events (from other tabs) and window focus
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.cards) setCards(data.cards);
          if (data.round) setRound(data.round);
          if (data.discardCard !== undefined) setDiscardCard(data.discardCard);
          if (data.isFinalTurn !== undefined) setIsFinalTurn(data.isFinalTurn);
        } catch {
          // Ignore parse errors
        }
      }
    };

    const handleFocus = () => {
      loadFromStorage();
    };

    loadFromStorage();
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    const handleCustomStorage = () => {
      loadFromStorage();
    };
    window.addEventListener('meldHelperUpdate', handleCustomStorage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('meldHelperUpdate', handleCustomStorage);
    };
  }, []);

  // Save to localStorage whenever cards, round, or discardCard changes
  useEffect(() => {
    if (!isLoadingFromStorage.current) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cards, round, discardCard, isFinalTurn })
      );
    }
  }, [cards, round, discardCard, isFinalTurn]);

  // Find the best combination of non-overlapping melds
  const bestCombination = cards.length >= 3 
    ? findBestMeldCombinationForHelper(cards, round)
    : { melds: [], leftoverCards: cards, canGoOut: false };
  
  // Keep raw melds for discard suggestion (needs all possible melds)
  const rawMelds = cards.length >= 3 ? findMelds(cards, round) : [];
  
  // Sort cards in runs by rank order for display (for the best combination)
  const melds = bestCombination.melds.map(meld => {
    if (meld.type === 'run') {
      const rankOrder: string[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const regularCards = meld.cards.filter(c => !isWildCard(c, round) && c.rank !== 'Joker');
      const wildCards = meld.cards.filter(c => isWildCard(c, round) || c.rank === 'Joker');
      
      regularCards.sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
      
      if (regularCards.length > 0) {
        const firstRankIndex = rankOrder.indexOf(regularCards[0].rank);
        const lastRankIndex = rankOrder.indexOf(regularCards[regularCards.length - 1].rank);
        
        const sortedCards: Card[] = [];
        let regularIndex = 0;
        let wildIndex = 0;
        
        for (let i = firstRankIndex; i <= lastRankIndex; i++) {
          const expectedRank = rankOrder[i];
          if (regularIndex < regularCards.length && regularCards[regularIndex].rank === expectedRank) {
            sortedCards.push(regularCards[regularIndex]);
            regularIndex++;
          } else if (wildIndex < wildCards.length) {
            sortedCards.push(wildCards[wildIndex]);
            wildIndex++;
          }
        }
        
        while (wildIndex < wildCards.length) {
          sortedCards.push(wildCards[wildIndex]);
          wildIndex++;
        }
        
        return { ...meld, cards: sortedCards };
      } else {
        const sortedCards = [...meld.cards].sort((a, b) => {
          if (a.rank === 'Joker') return 1;
          if (b.rank === 'Joker') return -1;
          return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        });
        return { ...meld, cards: sortedCards };
      }
    }
    return meld;
  });
  
  const discardSuggestion = cards.length > 0 ? suggestDiscard(cards, round, rawMelds, isFinalTurn) : null;

  const calculateHandPoints = (): number => {
    return cards.reduce((sum, card) => sum + calculateCardPoints(card, round), 0);
  };

  const calculateMeldPoints = (): number => {
    const usedCards = new Set<string>();
    melds.forEach((meld) => {
      meld.cards.forEach((card) => {
        usedCards.add(`${card.suit}-${card.rank}`);
      });
    });

    const unusedCards = cards.filter((card) => {
      return !usedCards.has(`${card.suit}-${card.rank}`);
    });

    return unusedCards.reduce((sum, card) => {
      return sum + calculateCardPoints(card, round);
    }, 0);
  };

  const handleAddCard = () => {
    const newCard: Card = {
      suit: selectedSuit,
      rank: selectedRank,
    };
    setCards([...cards, newCard]);
  };

  const handleRemoveCard = (index: number) => {
    const cardToRemove = cards[index];
    
    if (cardToRemove.rank === 'Joker') {
      const confirmRemove = window.confirm(
        '⚠️ WARNING: You are about to remove a Joker (50 points, can be used as any card).\n\n' +
        'Jokers are extremely valuable and should rarely be removed. Are you sure you want to remove this Joker?'
      );
      if (!confirmRemove) {
        return;
      }
    }
    
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    const hasJokers = cards.some(card => card.rank === 'Joker');
    
    if (hasJokers) {
      const jokerCount = cards.filter(card => card.rank === 'Joker').length;
      const confirmClear = window.confirm(
        `⚠️ WARNING: You are about to clear all cards, including ${jokerCount} Joker${jokerCount > 1 ? 's' : ''} (50 points each, can be used as any card).\n\n` +
        'Jokers are extremely valuable. Are you sure you want to clear all cards?'
      );
      if (!confirmClear) {
        return;
      }
    }
    
    setCards([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 mb-6 sticky top-0 z-20">
        <div className="flex flex-wrap justify-between items-center gap-4 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Meld Helper</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Current Round:</label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value as Round)}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {ROUNDS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-700">
                Wild: {round}s & Jokers
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFinalTurn}
                onChange={(e) => setIsFinalTurn(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Final Turn</span>
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {/* Add Card Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <SquaresPlusIcon className="w-6 h-6 text-blue-600" />
            Add Card
          </h2>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Suit</label>
              <select
                value={selectedSuit}
                onChange={(e) => setSelectedSuit(e.target.value as Suit)}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white min-w-[140px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                {SUITS.map((suit) => (
                  <option key={suit} value={suit}>
                    {suit.charAt(0).toUpperCase() + suit.slice(1)} {SUIT_SYMBOLS[suit]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rank</label>
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value as Rank)}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white min-w-[100px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              Add Card
            </button>
          </div>
        </div>

        {/* Your Hand Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Your Hand <span className="text-gray-500 font-normal">({cards.length} cards)</span>
            </h2>
            {cards.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all shadow-sm hover:shadow-md"
              >
                Clear All
              </button>
            )}
          </div>
          
          {cards.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {cards.map((card, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <PlayingCard
                    card={card}
                    round={round}
                    onRemove={() => handleRemoveCard(index)}
                    size="md"
                    showPoints
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full py-12 text-center text-gray-400">
              <SquaresPlusIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg">No cards in hand</p>
              <p className="text-sm">Add cards above to get started</p>
            </div>
          )}
        </div>

        {/* Discard Pile Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <TrashIcon className="w-6 h-6 text-gray-600" />
            Discard Pile (Top Card)
          </h2>
          
          <div className="space-y-4">
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Suit</label>
                <select
                  value={discardCard?.suit || 'clubs'}
                  onChange={(e) => {
                    if (discardCard) {
                      setDiscardCard({ ...discardCard, suit: e.target.value as Suit });
                    } else {
                      setDiscardCard({ suit: e.target.value as Suit, rank: '3' });
                    }
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white min-w-[140px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  {SUITS.map((suit) => (
                    <option key={suit} value={suit}>
                      {suit.charAt(0).toUpperCase() + suit.slice(1)} {SUIT_SYMBOLS[suit]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rank</label>
                <select
                  value={discardCard?.rank || '3'}
                  onChange={(e) => {
                    if (discardCard) {
                      setDiscardCard({ ...discardCard, rank: e.target.value as Rank });
                    } else {
                      setDiscardCard({ suit: 'clubs', rank: e.target.value as Rank });
                    }
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white min-w-[100px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  {RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setDiscardCard(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all shadow-sm hover:shadow-md"
              >
                Clear
              </button>
            </div>
            
            {discardCard ? (
              <div className="flex flex-col items-center gap-4">
                <PlayingCard 
                  card={discardCard} 
                  round={round} 
                  readonly 
                  size="lg"
                  showPoints
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No discard card set</p>
                <p className="text-sm mt-1">Select suit and rank above to add a discard card</p>
              </div>
            )}
          </div>
        </div>

        {/* Draw Recommendation */}
        {discardCard && cards.length > 0 && (
          <DrawRecommendation
            discardCard={discardCard}
            hand={cards}
            round={round}
            melds={melds}
          />
        )}

        {/* Validation Messages */}
        {cards.length < 3 && cards.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-amber-800">
            <p className="font-medium">Need at least 3 cards to form a meld</p>
          </div>
        )}

        {cards.length >= 3 && bestCombination.melds.length === 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-800">
            <p className="font-medium">No valid melds found in your hand</p>
          </div>
        )}

        {/* Found Melds Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            Found Melds <span className="text-gray-500 font-normal">
              ({bestCombination.melds.length > 0 ? '1 combination' : '0 combinations'})
            </span>
          </h2>
          
          {bestCombination.melds.length > 0 ? (
            <div className="space-y-4">
              {/* Best Combination Group */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
                {/* Header with total cards */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <SquaresPlusIcon className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      Best Combination - {bestCombination.melds.reduce((sum, m) => sum + m.cards.length, 0)} cards total
                    </h3>
                  </div>
                  {bestCombination.canGoOut && (
                    <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
                      ✓ You can go out!
                    </span>
                  )}
                </div>
                
                {/* Group books together */}
                {bestCombination.melds.filter(m => m.type === 'book').length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <SquaresPlusIcon className="w-4 h-4 text-blue-600" />
                      Books:
                    </h4>
                    <div className="space-y-3 ml-6">
                      {bestCombination.melds
                        .filter(m => m.type === 'book')
                        .map((meld, i) => {
                          const rank = meld.cards.find(c => !isWildCard(c, round))?.rank || 
                                      (isWildCard(meld.cards[0], round) ? 'Wild' : meld.cards[0].rank);
                          return (
                            <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                  Book of {rank}s
                                </span>
                                <span className="text-xs text-gray-500">
                                  {meld.cards.length} cards
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {meld.cards.map((card, j) => (
                                  <PlayingCard key={j} card={card} round={round} readonly size="sm" />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                
                {/* Group runs together */}
                {bestCombination.melds.filter(m => m.type === 'run').length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ArrowPathIcon className="w-4 h-4 text-purple-600" />
                      Runs:
                    </h4>
                    <div className="space-y-3 ml-6">
                      {bestCombination.melds
                        .filter(m => m.type === 'run')
                        .map((meld, i) => {
                          const suit = meld.cards.find(c => !isWildCard(c, round))?.suit || 
                                      (isWildCard(meld.cards[0], round) ? 'any' : meld.cards[0].suit);
                          const suitSymbol = suit === 'any' ? '★' : 
                                           suit === 'clubs' ? '♣' :
                                           suit === 'diamonds' ? '♦' :
                                           suit === 'hearts' ? '♥' :
                                           suit === 'spades' ? '♠' : '★';
                          const suitName = suit === 'any' ? 'Any' :
                                        suit.charAt(0).toUpperCase() + suit.slice(1);
                          return (
                            <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                                  Run of {suitName} {suitSymbol}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {meld.cards.length} cards
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {meld.cards.map((card, j) => (
                                  <PlayingCard key={j} card={card} round={round} readonly size="sm" />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                
                {/* Leftover cards */}
                {bestCombination.leftoverCards.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="flex items-center gap-2 mb-2">
                      <TrashIcon className="w-4 h-4 text-red-600" />
                      <h4 className="text-sm font-semibold text-gray-700">
                        Remaining cards ({bestCombination.leftoverCards.length}):
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bestCombination.leftoverCards.map((card, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <PlayingCard card={card} round={round} readonly size="sm" showPoints />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Total remaining points: {bestCombination.leftoverCards.reduce((sum, card) => 
                        sum + calculateCardPoints(card, round), 0
                      )}
                    </p>
                  </div>
                )}
                
                {bestCombination.leftoverCards.length === 0 && (
                  <div className="mt-4 pt-4 border-t border-green-300">
                    <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <span className="text-lg">✓</span>
                      All cards are in melds! You can go out by discarding any card.
                    </p>
                  </div>
                )}
                
                {bestCombination.leftoverCards.length === 1 && bestCombination.canGoOut && (
                  <div className="mt-4 pt-4 border-t border-green-300">
                    <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <span className="text-lg">✓</span>
                      You can go out! Discard the remaining card to complete your turn.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : cards.length >= 3 ? (
            <div className="py-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-600">No valid melds found in your hand</p>
              <p className="text-sm text-gray-500 mt-1">Add more cards or try different combinations</p>
            </div>
          ) : (
            <div className="py-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-600">Need at least 3 cards to form a meld</p>
            </div>
          )}
        </div>

        {/* Discard Suggestion */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <TrashIcon className="w-6 h-6 text-red-600" />
            Discard Suggestion
          </h2>
          
          {discardSuggestion ? (
            <div className="flex flex-col items-center gap-4">
              <PlayingCard 
                card={discardSuggestion} 
                round={round}
                size="lg" 
                highlighted 
                highlightColor="red"
                showPoints
                readonly
              />
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {calculateMeldPoints() === 0 
                    ? "All cards are in melds. If you must discard, this is the lowest point card."
                    : "This card is not part of any meld or has the highest point value among unused cards."}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No discard suggestion available</p>
            </div>
          )}
        </div>

        {/* Points Summary */}
        {cards.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Points Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2 font-medium">Total Hand Points</div>
                <div className="text-3xl font-bold text-gray-900">{calculateHandPoints()}</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="text-sm text-gray-600 mb-2 font-medium">Points in Melds</div>
                <div className="text-3xl font-bold text-green-600">
                  {calculateHandPoints() - calculateMeldPoints()}
                </div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <div className="text-sm text-gray-600 mb-2 font-medium">Remaining Points</div>
                <div className="text-3xl font-bold text-red-600">{calculateMeldPoints()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
