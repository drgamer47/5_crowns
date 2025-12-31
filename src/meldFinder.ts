import { Card, Meld, Round } from './types';
import { isWildCard } from './scoring';

/**
 * Rank order for runs (no wrapping - K does not connect to 3)
 * This is the valid sequence: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K
 */
const RANK_ORDER: string[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Finds all valid melds (books and runs) in a hand
 * Books: 3+ cards of the same rank
 * Runs: 3+ consecutive cards of the same suit (no wrapping)
 * 
 * @param cards - Array of cards in the hand
 * @param round - Current round (determines wild cards)
 * @returns Array of all valid melds found
 */
export function findMelds(cards: Card[], round: Round): Meld[] {
  // Input validation
  if (!cards || !Array.isArray(cards)) {
    return [];
  }
  
  if (cards.length < 3) {
    return [];
  }

  const melds: Meld[] = [];

  // Find books (same rank)
  const books = findBooks(cards, round);
  melds.push(...books);

  // Find runs (consecutive same suit)
  const runs = findRuns(cards, round);
  melds.push(...runs);

  return melds;
}

/**
 * Finds books: 3+ cards of the same rank
 * Handles:
 * - Regular cards of the same rank
 * - Wild cards can represent any rank
 * - Books of all wilds (e.g., [Joker, Joker, Joker])
 * - Books of 10+ cards
 * - Face card books (J, Q, K)
 * - Duplicate cards from two decks
 * 
 * @param cards - Array of cards in the hand
 * @param round - Current round (determines wild cards)
 * @returns Array of valid books
 */
function findBooks(cards: Card[], round: Round): Meld[] {
  const books: Meld[] = [];
  const seen = new Set<string>();
  
  // Separate wilds from regular cards
  const wildCards = cards.filter(card => isWildCard(card, round));
  const regularCards = cards.filter(card => !isWildCard(card, round));
  
  // Group regular cards by rank (handles duplicate cards correctly)
  const rankGroups = new Map<string, Card[]>();
  regularCards.forEach(card => {
    if (!rankGroups.has(card.rank)) {
      rankGroups.set(card.rank, []);
    }
    rankGroups.get(card.rank)!.push(card);
  });
  
  // Create books from each rank group (with or without wilds)
  rankGroups.forEach((groupCards, _rank) => {
    const totalAvailable = groupCards.length + wildCards.length;
    
    if (totalAvailable >= 3) {
      // We can make a book with this rank
      // Try using different numbers of wilds (0 to all available)
      // This generates all possible book combinations
      for (let numWilds = 0; numWilds <= wildCards.length; numWilds++) {
        const numRegular = groupCards.length;
        const totalCards = numRegular + numWilds;
        
        if (totalCards >= 3) {
          // Create book with this combination
          const bookCards = [
            ...groupCards,
            ...wildCards.slice(0, numWilds)
          ];
          
          // Create unique key based on card indices in original hand
          // This handles duplicate cards correctly by tracking specific instances
          const usedIndices = new Set<number>();
          const cardIndices: number[] = [];
          
          for (const card of bookCards) {
            // Find the first unused index for this card
            let found = false;
            for (let i = 0; i < cards.length; i++) {
              if (usedIndices.has(i)) continue;
              
              if (cards[i] === card || 
                  (cards[i].suit === card.suit && cards[i].rank === card.rank)) {
                usedIndices.add(i);
                cardIndices.push(i);
                found = true;
                break;
              }
            }
            if (!found) {
              // Couldn't find a matching card - skip this book combination
              cardIndices.length = 0;
              break;
            }
          }
          
          if (cardIndices.length === bookCards.length) {
            const cardIds = cardIndices.sort((a, b) => a - b).join(',');
            if (!seen.has(cardIds)) {
              seen.add(cardIds);
              books.push({
                type: 'book',
                cards: bookCards
              });
            }
          }
        }
      }
    }
  });

  // Book of all wilds (if 3+ wild cards available)
  // This handles cases like [Joker, Joker, Joker] or [3♣, 3♦, 3♥] in round 3
  if (wildCards.length >= 3) {
    // Generate all possible combinations of 3+ wild cards
    for (let bookSize = 3; bookSize <= wildCards.length; bookSize++) {
      const bookCards = wildCards.slice(0, bookSize);
      
      // Create unique key by tracking specific card instances
      const usedIndices = new Set<number>();
      const cardIndices: number[] = [];
      
      for (const card of bookCards) {
        // Find the first unused index for this wild card
        let found = false;
        for (let i = 0; i < cards.length; i++) {
          if (usedIndices.has(i)) continue;
          
          if (cards[i] === card || 
              (isWildCard(cards[i], round) && isWildCard(card, round) && 
               cards[i].suit === card.suit && cards[i].rank === card.rank)) {
            usedIndices.add(i);
            cardIndices.push(i);
            found = true;
            break;
          }
        }
        if (!found) {
          // Couldn't find a matching card - skip this book combination
          cardIndices.length = 0;
          break;
        }
      }
      
      if (cardIndices.length === bookSize) {
        const cardIds = cardIndices.sort((a, b) => a - b).join(',');
        if (!seen.has(cardIds)) {
          seen.add(cardIds);
          books.push({
            type: 'book',
            cards: bookCards
          });
        }
      }
    }
  }
  
  return books;
}

/**
 * Finds runs: 3+ consecutive cards of the same suit
 * Rules:
 * - NO wrapping (K does NOT connect to 3)
 * - Wild cards can fill gaps or extend sequences
 * - Maximum length: 3→K = 11 cards
 * - Handles stars suit (★)
 * 
 * @param cards - Array of cards in the hand
 * @param round - Current round (determines wild cards)
 * @returns Array of valid runs
 */
function findRuns(cards: Card[], round: Round): Meld[] {
  const runs: Meld[] = [];
  const seen = new Set<string>();
  const suitGroups = new Map<string, Card[]>();

  // Group cards by suit
  // Wild cards (Jokers and wild numbers) can be used in ANY suit
  cards.forEach((card) => {
    if (card.rank === 'Joker' || isWildCard(card, round)) {
      // Jokers and wild cards can be used in any suit
      ['clubs', 'diamonds', 'hearts', 'spades', 'stars'].forEach((suit) => {
        if (!suitGroups.has(suit)) {
          suitGroups.set(suit, []);
        }
        // Add a reference to the original card (not a copy)
        suitGroups.get(suit)!.push(card);
      });
    } else {
      const suit = card.suit;
      if (!suitGroups.has(suit)) {
        suitGroups.set(suit, []);
      }
      suitGroups.get(suit)!.push(card);
    }
  });

  // Find runs in each suit
  suitGroups.forEach((suitCards, _suit) => {
    const runsInSuit = findRunsInSuit(suitCards, round, cards);
    runsInSuit.forEach((run) => {
      // Create unique key based on card indices (sorted)
      // This ensures we don't create duplicate runs with the same card instances
      const cardIndices = run.cards.map(c => {
        // Find all matching indices
        const indices: number[] = [];
        for (let i = 0; i < cards.length; i++) {
          if (cards[i] === c || 
              (cards[i].suit === c.suit && cards[i].rank === c.rank)) {
            indices.push(i);
          }
        }
        return indices;
      }).flat().sort((a, b) => a - b);
      
      const cardIds = cardIndices.join(',');
      if (!seen.has(cardIds)) {
        seen.add(cardIds);
        runs.push(run);
      }
    });
  });

  return runs;
}

/**
 * Finds runs within a single suit
 * Handles:
 * - Consecutive sequences (e.g., 5-6-7)
 * - Gaps filled by wilds (e.g., 5-6-8 with wild as 7 → 5-6-7(wild)-8)
 * - Multiple gaps filled by multiple wilds
 * - Extending sequences with wilds (e.g., 4-5 + wild → 4-5-6)
 * - Runs ending at K (valid, no wrapping)
 * - Sorting cards properly (recognizes [7♣, 5♣, 6♣] as valid run)
 * 
 * @param cards - Cards in this suit (may include wilds that can represent this suit)
 * @param round - Current round
 * @param originalCards - Original hand array (for tracking card instances)
 * @returns Array of valid runs in this suit
 */
function findRunsInSuit(cards: Card[], round: Round, originalCards?: Card[]): Meld[] {
  const runs: Meld[] = [];
  const seen = new Set<string>();
  
  // Use originalCards if provided (for tracking instances), otherwise use cards
  const cardSource = originalCards || cards;
  
  // Separate wild cards from regular cards
  const regularCards = cards.filter((card) => !isWildCard(card, round));
  const wildCards = cards.filter((card) => isWildCard(card, round));
  
  /**
   * Helper to create unique key for a run based on card instances (by index)
   * This ensures we don't reuse the same card instance multiple times
   * Handles duplicate cards correctly by tracking specific indices
   */
  const getRunKey = (runCards: Card[]): string => {
    // Track which indices we've already used
    const usedIndices = new Set<number>();
    const cardIndices: number[] = [];
    
    for (const card of runCards) {
      // Find the first unused index for this card
      let found = false;
      for (let i = 0; i < cardSource.length; i++) {
        if (usedIndices.has(i)) continue;
        
        const origCard = cardSource[i];
        // Match by object reference first, then by suit/rank
        if (origCard === card || 
            (origCard.suit === card.suit && origCard.rank === card.rank) ||
            (isWildCard(origCard, round) && isWildCard(card, round))) {
          usedIndices.add(i);
          cardIndices.push(i);
          found = true;
          break;
        }
      }
      if (!found) {
        // Couldn't find a matching card - this shouldn't happen, but handle gracefully
        return '';
      }
    }
    
    return cardIndices.sort((a, b) => a - b).join(',');
  };

  // Sort regular cards by rank
  regularCards.sort((a, b) => {
    const aIndex = RANK_ORDER.indexOf(a.rank);
    const bIndex = RANK_ORDER.indexOf(b.rank);
    if (aIndex === -1 || bIndex === -1) return 0; // Invalid rank, keep order
    return aIndex - bIndex;
  });

  // Handle duplicate ranks - keep all instances but track them separately
  // We'll process each unique rank position
  const rankPositions: { card: Card; index: number }[] = [];
  regularCards.forEach((card, idx) => {
    rankPositions.push({ card, index: idx });
  });

  // Find all consecutive sequences (without gaps)
  for (let i = 0; i < rankPositions.length; i++) {
    for (let j = i + 2; j < rankPositions.length; j++) {
      const sequence = rankPositions.slice(i, j + 1);
      const sequenceRanks = sequence.map((s) => s.card.rank);
      
      // Check if sequence is consecutive (no gaps)
      let isConsecutive = true;
      for (let k = 0; k < sequence.length - 1; k++) {
        const currentIndex = RANK_ORDER.indexOf(sequenceRanks[k]);
        const nextIndex = RANK_ORDER.indexOf(sequenceRanks[k + 1]);
        if (currentIndex === -1 || nextIndex === -1 || nextIndex - currentIndex !== 1) {
          isConsecutive = false;
          break;
        }
      }

      if (isConsecutive) {
        const runCards = sequence.map(s => s.card);
        const runKey = getRunKey(runCards);
        if (runKey && !seen.has(runKey)) {
          seen.add(runKey);
          runs.push({
            type: 'run',
            cards: runCards,
          });
        }
      }
    }
  }

  // Try to create runs using wild cards to fill gaps or extend sequences
  if (wildCards.length > 0 && rankPositions.length > 0) {
    // Strategy 1: Fill gaps in sequences
    // Example: [3♥, 6♥] with 2 wilds → [3♥, wild as 4♥, wild as 5♥, 6♥]
    for (let i = 0; i < rankPositions.length; i++) {
      for (let j = i + 1; j < rankPositions.length; j++) {
        const startCard = rankPositions[i].card;
        const endCard = rankPositions[j].card;
        const startIndex = RANK_ORDER.indexOf(startCard.rank);
        const endIndex = RANK_ORDER.indexOf(endCard.rank);
        
        if (startIndex === -1 || endIndex === -1) continue;
        if (startIndex >= endIndex) continue; // Invalid sequence
        
        // Calculate how many cards are needed to fill the gap
        const totalCardsNeeded = endIndex - startIndex + 1; // Including start and end
        const cardsWeHave = j - i + 1; // Cards between i and j (inclusive)
        const wildsNeeded = totalCardsNeeded - cardsWeHave;
        
        // Check if we have enough wilds and the sequence is valid
        if (wildsNeeded >= 0 && wildsNeeded <= wildCards.length && totalCardsNeeded >= 3) {
          // Build the sequence: start + all cards in between + wilds to fill gaps + end
          const sequence: Card[] = [startCard];
          
          // Add all cards between start and end
          for (let k = i + 1; k < j; k++) {
            sequence.push(rankPositions[k].card);
          }
          
          // Add wilds to fill remaining gaps
          if (wildsNeeded > 0) {
            sequence.push(...wildCards.slice(0, wildsNeeded));
          }
          
          // Add end card
          sequence.push(endCard);
          
          if (sequence.length >= 3) {
            const runKey = getRunKey(sequence);
            if (runKey && !seen.has(runKey)) {
              seen.add(runKey);
              runs.push({
                type: 'run',
                cards: sequence,
              });
            }
          }
        }
      }
    }
    
    // Strategy 2: Extend 2-card consecutive sequences with wilds
    // Example: [4★, 5★] with wild → [4★, 5★, wild as 6★]
    for (let i = 0; i < rankPositions.length - 1; i++) {
      const card1 = rankPositions[i].card;
      const card2 = rankPositions[i + 1].card;
      const index1 = RANK_ORDER.indexOf(card1.rank);
      const index2 = RANK_ORDER.indexOf(card2.rank);
      
      if (index1 === -1 || index2 === -1) continue;
      
      // Check if cards are consecutive
      if (index2 - index1 === 1 && wildCards.length > 0) {
        // Try extending after (e.g., 4-5 + wild → 4-5-6)
        // Only extend if we haven't reached K (no wrapping)
        if (index2 < RANK_ORDER.length - 1) {
          const extendedAfter = [card1, card2, ...wildCards.slice(0, 1)];
          const runKey = getRunKey(extendedAfter);
          if (runKey && !seen.has(runKey)) {
            seen.add(runKey);
            runs.push({
              type: 'run',
              cards: extendedAfter,
            });
          }
        }
        
        // Try extending before (e.g., wild + 4-5 → 3-4-5)
        // Only extend if we haven't reached 3 (no wrapping)
        if (index1 > 0) {
          const extendedBefore = [...wildCards.slice(0, 1), card1, card2];
          const runKey = getRunKey(extendedBefore);
          if (runKey && !seen.has(runKey)) {
            seen.add(runKey);
            runs.push({
              type: 'run',
              cards: extendedBefore,
            });
          }
        }
      }
    }
    
    // Strategy 3: Extend existing runs (3+ cards) with wild cards
    // Only use wild cards that aren't already in the run
    const extendedRuns: Meld[] = [];
    runs.forEach((run) => {
      const runRanks = run.cards.filter((c) => !isWildCard(c, round)).map((c) => c.rank);
      if (runRanks.length === 0) return; // Can't extend a run of all wilds
      
      // Count how many wild cards are already in this run
      const wildsInRun = run.cards.filter((c) => isWildCard(c, round));
      const unusedWilds = wildCards.filter(wc => !wildsInRun.includes(wc));
      
      if (unusedWilds.length <= 0) return; // No unused wild cards available
      
      const firstRank = runRanks[0];
      const lastRank = runRanks[runRanks.length - 1];
      const firstIndex = RANK_ORDER.indexOf(firstRank);
      const lastIndex = RANK_ORDER.indexOf(lastRank);

      if (firstIndex === -1 || lastIndex === -1) return;

      // Try extending before (only if we haven't reached 3 - no wrapping)
      if (firstIndex > 0 && unusedWilds.length > 0) {
        const extendedBefore = [unusedWilds[0], ...run.cards];
        const runKey = getRunKey(extendedBefore);
        if (runKey && !seen.has(runKey)) {
          seen.add(runKey);
          extendedRuns.push({
            type: 'run',
            cards: extendedBefore,
          });
        }
      }

      // Try extending after (only if we haven't reached K - no wrapping)
      if (lastIndex < RANK_ORDER.length - 1 && unusedWilds.length > 0) {
        const extendedAfter = [...run.cards, unusedWilds[0]];
        const runKey = getRunKey(extendedAfter);
        if (runKey && !seen.has(runKey)) {
          seen.add(runKey);
          extendedRuns.push({
            type: 'run',
            cards: extendedAfter,
          });
        }
      }
    });
    runs.push(...extendedRuns);
  }

  return runs;
}

/**
 * Checks if all cards in a hand can be used in melds
 * This is used to validate "going out" scenarios
 * 
 * @param hand - The hand to check
 * @param melds - Available melds
 * @param round - Current round
 * @returns True if all cards can be used in melds
 */
function canAllCardsFormMelds(hand: Card[], melds: Meld[], round: Round): boolean {
  if (hand.length === 0) return true;
  if (melds.length === 0) return false;

  // Track which card indices are used in melds
  const usedIndices = new Set<number>();
  const availableIndices = new Set<number>();
  for (let i = 0; i < hand.length; i++) {
    availableIndices.add(i);
  }
  
  // Try to match each meld to available cards
  for (const meld of melds) {
    const tempAvailable = new Set(availableIndices);
    const meldIndices: number[] = [];
    
    for (const meldCard of meld.cards) {
      // First try to match by object reference (if meld cards are from the hand)
      let found = false;
      let matchedIndex = -1;
      
      const directIndex = hand.findIndex((c, idx) => c === meldCard && tempAvailable.has(idx));
      if (directIndex !== -1) {
        matchedIndex = directIndex;
        found = true;
      } else {
        // Otherwise match by suit and rank, or if both are wild cards
        for (const idx of tempAvailable) {
          const handCard = hand[idx];
          // Match if suit and rank match, OR if both are wild cards
          const bothWild = isWildCard(handCard, round) && isWildCard(meldCard, round);
          const suitRankMatch = handCard.suit === meldCard.suit && handCard.rank === meldCard.rank;
          
          if (suitRankMatch || bothWild) {
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
        // Can't match this meld card - this meld can't be used
        return false;
      }
    }
    
    // Mark all matched indices as used
    meldIndices.forEach(idx => {
      usedIndices.add(idx);
      availableIndices.delete(idx);
    });
  }

  // All cards must be used
  return usedIndices.size === hand.length;
}

/**
 * Finds the best combination of non-overlapping melds for the Meld Helper
 * Returns the optimal combination that uses the most cards
 * 
 * @param hand - The hand to check
 * @param round - Current round
 * @returns Best meld combination, leftover cards, and whether player can go out
 */
export function findBestMeldCombinationForHelper(hand: Card[], round: Round): {
  melds: Meld[];
  leftoverCards: Card[];
  canGoOut: boolean;
} {
  if (!hand || hand.length === 0) {
    return { melds: [], leftoverCards: [], canGoOut: false };
  }

  // Find all possible melds
  const allMelds = findMelds(hand, round);
  
  if (allMelds.length === 0) {
    return { melds: [], leftoverCards: [...hand], canGoOut: false };
  }

  // Find the best combination using the existing function
  const best = findBestMeldCombination(hand, allMelds);
  
  // Calculate leftover cards
  const usedIndices = new Set<number>();
  best.melds.forEach(meld => {
    meld.cards.forEach(meldCard => {
      // Find matching card in hand
      for (let i = 0; i < hand.length; i++) {
        if (usedIndices.has(i)) continue;
        if (hand[i] === meldCard || 
            (hand[i].suit === meldCard.suit && hand[i].rank === meldCard.rank)) {
          usedIndices.add(i);
          break;
        }
      }
    });
  });
  
  const leftoverCards = hand.filter((_, index) => !usedIndices.has(index));
  
  // canGoOut = true if 0 or 1 cards remain (1 card can be discarded to go out)
  const canGoOut = leftoverCards.length <= 1;
  
  return {
    melds: best.melds,
    leftoverCards,
    canGoOut
  };
}

/**
 * Finds the best combination of melds that uses the most cards
 * Used for "going out" validation
 * 
 * @param hand - The hand to check
 * @param melds - Available melds
 * @returns Best meld combination and number of cards used
 */
export function findBestMeldCombination(hand: Card[], melds: Meld[]): { melds: Meld[]; usedCards: number } {
  if (melds.length === 0) {
    return { melds: [], usedCards: 0 };
  }

  // Create a map of available card instances (by index) for matching
  const availableIndices = new Set<number>();
  for (let i = 0; i < hand.length; i++) {
    availableIndices.add(i);
  }

  const selectedMelds: Meld[] = [];

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

/**
 * Suggests which card to discard based on melds found
 * 
 * Rules:
 * - Prefer discards that allow going out (all remaining cards in melds)
 * - Never suggest wild cards/jokers on regular turns (unless no other option)
 * - On final turn, can suggest wild cards to minimize points
 * - When all cards are in melds, suggest lowest point card
 * - Suggest highest point unused card when some cards aren't in melds
 * 
 * @param cards - Cards in hand
 * @param round - Current round
 * @param melds - Available melds
 * @param isFinalTurn - If true, allows suggesting wild cards/jokers when no melds can be formed
 * @returns Suggested card to discard, or null if no suggestion
 */
export function suggestDiscard(cards: Card[], round: Round, melds: Meld[], isFinalTurn: boolean = false): Card | null {
  // Input validation
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  // Helper function to calculate card points
  // Note: Round 11 (K) means Kings are wild (20pts), not 13pts
  const getCardPoints = (card: Card): number => {
    if (card.rank === 'Joker') return 50;
    if (isWildCard(card, round)) return 20; // Wild cards (including K in round K) are 20pts
    if (card.rank === 'J') return 11;
    if (card.rank === 'Q') return 12;
    if (card.rank === 'K') return 13; // Only if not wild
    const numValue = parseInt(card.rank);
    return isNaN(numValue) ? 0 : numValue;
  };

  // Strategy 1: Check if discarding any card would allow going out
  // (All remaining cards must form melds - this is the best case)
  for (let discardIndex = 0; discardIndex < cards.length; discardIndex++) {
    const remainingHand = cards.filter((_, idx) => idx !== discardIndex);
    
    // If remaining hand has fewer than 3 cards, can't form melds (need at least 3 for a meld)
    if (remainingHand.length < 3) {
      continue; // Can't go out with less than 3 cards
    }
    
    const remainingMelds = findMelds(remainingHand, round);
    
    // Check if all remaining cards can form melds
    if (canAllCardsFormMelds(remainingHand, remainingMelds, round)) {
      // This discard would allow going out - suggest it!
      return cards[discardIndex];
    }
  }

  // Strategy 2: If no melds can be formed at all
  if (melds.length === 0) {
    if (isFinalTurn) {
      // Final turn: suggest highest point card (including wilds/jokers) to minimize points
      return cards.reduce((highest, card) => {
        const highestPoints = getCardPoints(highest);
        const cardPoints = getCardPoints(card);
        return cardPoints > highestPoints ? card : highest;
      });
    } else {
      // Regular turn: never suggest wild cards/jokers, suggest highest point non-wild card
      const nonWildCards = cards.filter(card => !isWildCard(card, round));
      if (nonWildCards.length > 0) {
        return nonWildCards.reduce((highest, card) => {
          const highestPoints = getCardPoints(highest);
          const cardPoints = getCardPoints(card);
          return cardPoints > highestPoints ? card : highest;
        });
      }
      // If somehow all cards are wild (shouldn't happen), suggest lowest point wild
      return cards.reduce((lowest, card) => {
        const lowestPoints = getCardPoints(lowest);
        const cardPoints = getCardPoints(card);
        return cardPoints < lowestPoints ? card : lowest;
      });
    }
  }

  // Strategy 3: Find unused cards (cards not in any melds)
  // Track which specific card instances are used
  const unusedCards: Card[] = [];
  const usedIndices = new Set<number>();
  
  // Count how many of each card type are in the hand
  const handCounts = new Map<string, number>();
  cards.forEach((card) => {
    const key = `${card.suit}-${card.rank}`;
    handCounts.set(key, (handCounts.get(key) || 0) + 1);
  });

  // Count how many of each card type are used in melds
  const meldCounts = new Map<string, number>();
  melds.forEach((meld) => {
    meld.cards.forEach((card) => {
      const key = `${card.suit}-${card.rank}`;
      meldCounts.set(key, (meldCounts.get(key) || 0) + 1);
    });
  });

  // Determine which specific card instances are unused
  cards.forEach((card, index) => {
    const key = `${card.suit}-${card.rank}`;
    const handCount = handCounts.get(key) || 0;
    const meldCount = meldCounts.get(key) || 0;
    
    // Count how many instances of this type we've already marked as used
    let markedAsUsed = 0;
    for (let i = 0; i < index; i++) {
      if (usedIndices.has(i)) {
        const otherKey = `${cards[i].suit}-${cards[i].rank}`;
        if (otherKey === key) markedAsUsed++;
      }
    }
    
    // If all instances of this type are in melds, mark this one as used
    if (meldCount >= handCount) {
      usedIndices.add(index);
    } 
    // If some instances are unused and we haven't marked all meld instances yet
    else if (markedAsUsed < meldCount) {
      // This instance is used
      usedIndices.add(index);
    } 
    // Otherwise, this instance is unused
    else {
      unusedCards.push(card);
    }
  });

  // Strategy 4: If all cards are in melds
  if (unusedCards.length === 0) {
    // All cards are in melds - suggest the lowest point card
    return cards.reduce((lowest, card) => {
      const lowestPoints = getCardPoints(lowest);
      const cardPoints = getCardPoints(card);
      return cardPoints < lowestPoints ? card : lowest;
    });
  }

  // Strategy 5: If ALL cards are unused (no cards are in any melds)
  if (unusedCards.length === cards.length) {
    if (isFinalTurn) {
      // Final turn: suggest highest point card (including wilds/jokers) to minimize points
      return cards.reduce((highest, card) => {
        const highestPoints = getCardPoints(highest);
        const cardPoints = getCardPoints(card);
        return cardPoints > highestPoints ? card : highest;
      });
    } else {
      // Regular turn: never suggest wild cards/jokers, suggest highest point non-wild card
      const nonWildCards = cards.filter(card => !isWildCard(card, round));
      if (nonWildCards.length > 0) {
        return nonWildCards.reduce((highest, card) => {
          const highestPoints = getCardPoints(highest);
          const cardPoints = getCardPoints(card);
          return cardPoints > highestPoints ? card : highest;
        });
      }
      // If somehow all cards are wild (shouldn't happen), suggest lowest point wild
      return cards.reduce((lowest, card) => {
        const lowestPoints = getCardPoints(lowest);
        const cardPoints = getCardPoints(card);
        return cardPoints < lowestPoints ? card : lowest;
      });
    }
  }

  // Strategy 6: Some cards are in melds, some are not
  // Only suggest discards that leave a valid hand (can form at least one meld)
  const validDiscards: Card[] = [];
  
  for (const unusedCard of unusedCards) {
    const discardIndex = cards.findIndex(c => c === unusedCard);
    if (discardIndex === -1) continue;
    
    const remainingHand = cards.filter((_, idx) => idx !== discardIndex);
    
    // If remaining hand has fewer than 3 cards, can't form melds
    if (remainingHand.length < 3) {
      continue; // Don't suggest this discard
    }
    
    // Check if remaining hand can form at least one meld
    const remainingMelds = findMelds(remainingHand, round);
    if (remainingMelds.length > 0) {
      // Check if all remaining cards can be used in melds (ideal case)
      if (canAllCardsFormMelds(remainingHand, remainingMelds, round)) {
        // All remaining cards can be used in melds - this is a valid discard
        validDiscards.push(unusedCard);
      } else {
        // At least one meld can be formed - still valid but not ideal
        validDiscards.push(unusedCard);
      }
    }
  }
  
  // If we found valid discards (that leave meldable hands), suggest from those
  if (validDiscards.length > 0) {
    // Separate wild cards from non-wild cards
    // Wild cards should almost NEVER be discarded because they're so valuable
    const nonWildValid = validDiscards.filter(card => !isWildCard(card, round));
    const wildValid = validDiscards.filter(card => isWildCard(card, round));
    
    // If there are any non-wild valid discards, suggest the highest point one
    if (nonWildValid.length > 0) {
      return nonWildValid.reduce((highest, card) => {
        const highestPoints = getCardPoints(highest);
        const cardPoints = getCardPoints(card);
        return cardPoints > highestPoints ? card : highest;
      });
    }
    
    // Only suggest a wild card if there are NO non-wild valid discards
    if (wildValid.length > 0) {
      // Among wild cards, suggest the one with the lowest point value
      return wildValid.reduce((lowest, card) => {
        const lowestPoints = getCardPoints(lowest);
        const cardPoints = getCardPoints(card);
        return cardPoints < lowestPoints ? card : lowest;
      });
    }
  }
  
  // Strategy 7: Fallback - suggest from unused cards (but prefer non-wild)
  const nonWildCards = unusedCards.filter(card => !isWildCard(card, round));
  const wildCards = unusedCards.filter(card => isWildCard(card, round));

  // If there are any non-wild unused cards, suggest the highest point one
  if (nonWildCards.length > 0) {
    return nonWildCards.reduce((highest, card) => {
      const highestPoints = getCardPoints(highest);
      const cardPoints = getCardPoints(card);
      return cardPoints > highestPoints ? card : highest;
    });
  }

  // Only suggest a wild card if there are NO non-wild unused cards
  // (This should be very rare - wild cards are extremely valuable)
  if (wildCards.length > 0) {
    // Among wild cards, suggest the one with the lowest point value
    // (Jokers are 50, wild number cards are 20)
    return wildCards.reduce((lowest, card) => {
      const lowestPoints = getCardPoints(lowest);
      const cardPoints = getCardPoints(card);
      return cardPoints < lowestPoints ? card : lowest;
    });
  }

  // Fallback (shouldn't happen)
  return unusedCards.length > 0 ? unusedCards[0] : cards[0];
}
