import { 
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, Round } from '../types';
import { findMelds } from '../meldFinder';
import { calculateCardPoints, isWildCard } from '../scoring';

interface DrawRecommendationProps {
  discardCard: Card;
  hand: Card[];
  round: Round;
  melds: { cards: Card[]; type: 'book' | 'run' }[];
}

export default function DrawRecommendation({
  discardCard,
  hand,
  round,
  melds,
}: DrawRecommendationProps) {
  // Simulate adding discard card to hand
  const handWithDiscard = [...hand, discardCard];
  const meldsWithDiscard = findMelds(handWithDiscard, round);

  // Calculate current hand value
  const currentHandValue = hand.reduce((sum, card) => sum + calculateCardPoints(card, round), 0);
  const currentMeldValue = calculateMeldValue(hand, melds, round);

  // Calculate hand value with discard card
  const newHandValue = handWithDiscard.reduce((sum, card) => sum + calculateCardPoints(card, round), 0);
  const newMeldValue = calculateMeldValue(handWithDiscard, meldsWithDiscard, round);

  // Calculate improvement
  const currentRemaining = currentHandValue - currentMeldValue;
  const newRemaining = newHandValue - newMeldValue;
  const improvement = currentRemaining - newRemaining;

  // Evaluate the discard card
  const discardPoints = calculateCardPoints(discardCard, round);
  const isDiscardWild = isWildCard(discardCard, round);
  const discardHelpsMelds = meldsWithDiscard.length > melds.length || newMeldValue > currentMeldValue;

  // Decision logic
  let recommendation: 'take' | 'skip' | 'maybe';
  let reasoning: string[] = [];

  if (isDiscardWild) {
    // Wild cards are almost always worth taking
    recommendation = 'take';
    reasoning.push('Wild cards are extremely valuable (can be used as any card)');
    if (discardCard.rank === 'Joker') {
      reasoning.push('Jokers are worth 50 points if not used in melds');
    } else {
      reasoning.push(`Wild ${discardCard.rank}s are worth 20 points if not used in melds`);
    }
  } else if (discardHelpsMelds && improvement > 0) {
    // Card helps form melds and reduces remaining points
    recommendation = 'take';
    reasoning.push(`This card helps form melds, reducing your remaining points by ${improvement}`);
    reasoning.push(`Would reduce remaining points from ${currentRemaining} to ${newRemaining}`);
  } else if (discardHelpsMelds) {
    // Card helps form melds but might not reduce points much
    recommendation = 'maybe';
    reasoning.push('This card can help form melds');
    if (discardPoints <= 5) {
      reasoning.push(`Low point value (${discardPoints} points) makes it relatively safe`);
      recommendation = 'take';
    } else {
      reasoning.push(`However, it is worth ${discardPoints} points if not used in melds`);
    }
  } else if (discardPoints <= 3) {
    // Low value card, might be worth taking for flexibility
    recommendation = 'maybe';
    reasoning.push(`Low point value (${discardPoints} points) - low risk if it does not help`);
    reasoning.push('Consider taking if you need more cards of this rank or suit');
  } else if (discardPoints >= 10) {
    // High value card, probably skip
    recommendation = 'skip';
    reasoning.push(`High point value (${discardPoints} points) - risky if it does not help form melds`);
    reasoning.push('Better to draw from deck unless you are certain it helps');
  } else {
    // Medium value card
    recommendation = 'maybe';
    reasoning.push(`Medium point value (${discardPoints} points)`);
    reasoning.push('Only take if you can use it in a meld');
  }

  const iconBgColor = recommendation === 'take' 
    ? 'bg-green-500' 
    : recommendation === 'skip'
    ? 'bg-red-500'
    : 'bg-amber-500';

  return (
    <div className={`rounded-xl shadow-md p-6 border-2 ${
      recommendation === 'take' ? 'bg-green-50 border-green-200' :
      recommendation === 'skip' ? 'bg-red-50 border-red-200' :
      'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgColor} shadow-md`}>
          {recommendation === 'take' && <CheckCircleIcon className="w-8 h-8 text-white" />}
          {recommendation === 'skip' && <XCircleIcon className="w-8 h-8 text-white" />}
          {recommendation === 'maybe' && <QuestionMarkCircleIcon className="w-8 h-8 text-white" />}
        </div>
        
        {/* Text content */}
        <div className="flex-1">
          <h3 className={`text-lg font-bold mb-3 ${
            recommendation === 'take' ? 'text-green-900' :
            recommendation === 'skip' ? 'text-red-900' :
            'text-amber-900'
          }`}>
            Draw Recommendation: {
              recommendation === 'take' ? 'Take from Discard' :
              recommendation === 'skip' ? 'Draw from Deck' :
              'Maybe Take Discard'
            }
          </h3>
          <ul className="text-sm space-y-2 text-gray-700 mb-4">
            {reasoning.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          
          {/* Point comparison */}
          <div className="mt-4 pt-4 border-t border-gray-300">
            <div className="flex flex-wrap gap-6 text-sm font-medium">
              <div>
                Current: <span className={`text-lg font-bold ${
                  recommendation === 'take' ? 'text-green-900' :
                  recommendation === 'skip' ? 'text-red-900' :
                  'text-amber-900'
                }`}>{currentRemaining}</span> pts
              </div>
              <div>
                With discard: <span className={`text-lg font-bold ${
                  recommendation === 'take' ? 'text-green-900' :
                  recommendation === 'skip' ? 'text-red-900' :
                  'text-amber-900'
                }`}>{newRemaining}</span> pts
              </div>
              {improvement > 0 && (
                <div className="text-green-700 font-semibold">
                  Improvement: <span className="text-lg">-{improvement} points</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateMeldValue(
  _hand: Card[],
  melds: { cards: Card[]; type: 'book' | 'run' }[],
  round: Round
): number {
  // Find cards used in melds
  const usedCards = new Set<string>();
  melds.forEach((meld) => {
    meld.cards.forEach((card) => {
      // Simple tracking - count each card type once
      const key = `${card.suit}-${card.rank}`;
      if (!usedCards.has(key)) {
        usedCards.add(key);
      }
    });
  });

  // Calculate value of cards in melds
  let meldValue = 0;
  usedCards.forEach((key) => {
    const [suit, rank] = key.split('-');
    const card: Card = { suit: suit as any, rank: rank as any };
    meldValue += calculateCardPoints(card, round);
  });

  return meldValue;
}

