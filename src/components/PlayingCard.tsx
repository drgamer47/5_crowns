import { Card } from '../types';
import { isWildCard } from '../scoring';
import { Round } from '../types';

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  stars: '★',
};

const SUIT_COLORS: Record<string, string> = {
  clubs: '#16a34a', // green
  diamonds: '#3b82f6', // blue
  hearts: '#ef4444', // red
  spades: '#1f2937', // dark gray/black
  stars: '#eab308', // yellow/gold
  joker: '#a855f7', // purple
};

interface PlayingCardProps {
  card: Card;
  round?: Round;
  onClick?: () => void;
  onRemove?: () => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: 'meld' | 'discard' | 'none';
  highlighted?: boolean;
  highlightColor?: 'green' | 'red';
  showPoints?: boolean;
}

export default function PlayingCard({
  card,
  round,
  onClick,
  onRemove,
  readonly = false,
  size = 'md',
  highlight = 'none',
  highlighted = false,
  highlightColor = 'green',
  showPoints = false,
}: PlayingCardProps) {
  const isJoker = card.rank === 'Joker';
  const suitColor = isJoker ? SUIT_COLORS.joker : SUIT_COLORS[card.suit];
  const suitSymbol = isJoker ? '🃏' : SUIT_SYMBOLS[card.suit];
  
  // Determine if card is wild
  const isWild = round ? isWildCard(card, round) : false;
  
  // Size classes
  const sizeClasses = {
    sm: 'min-w-[60px] p-2 text-xs',
    md: 'min-w-[80px] p-3 text-base',
    lg: 'min-w-[100px] p-4 text-lg',
  };
  
  const rankSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  
  const suitSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };
  
  const centerSuitSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };
  
  // Highlight border colors
  const getHighlightClass = () => {
    if (highlighted) {
      return highlightColor === 'green' 
        ? 'border-green-500 ring-4 ring-green-200' 
        : 'border-red-500 ring-4 ring-red-200';
    }
    if (highlight === 'meld') return 'border-green-500 border-4 shadow-lg shadow-green-200';
    if (highlight === 'discard') return 'border-red-500 border-4 shadow-lg shadow-red-200';
    return 'border-gray-200';
  };
  
  const cardClasses = `relative bg-white rounded-lg shadow-md border-2 ${getHighlightClass()} 
    ${sizeClasses[size]} aspect-[2.5/3.5] flex flex-col justify-between
    transition-all duration-200 ${!readonly && (onClick || onRemove) ? 'hover:shadow-lg cursor-pointer group' : ''}
    ${onClick && !readonly ? 'hover:-translate-y-1' : ''}
    ${isWild ? 'ring-2 ring-amber-400 ring-opacity-50' : ''}`;

  const handleClick = () => {
    if (onClick && !readonly) {
      onClick();
    } else if (onRemove && !readonly) {
      onRemove();
    }
  };

  return (
    <div className={cardClasses} onClick={handleClick}>
      {/* Top corner */}
      <div className="flex flex-col items-center">
        <span className={`font-bold ${rankSizeClasses[size]}`} style={{ color: suitColor }}>
          {isJoker ? '★' : card.rank}
        </span>
        <span className={suitSizeClasses[size]} style={{ color: suitColor }}>
          {suitSymbol}
        </span>
      </div>
      
      {/* Center suit symbol */}
      <div className="flex justify-center items-center flex-1">
        <span className={`${centerSuitSizeClasses[size]} opacity-20`} style={{ color: suitColor }}>
          {suitSymbol}
        </span>
      </div>
      
      {/* Bottom corner (upside down) */}
      <div className="flex flex-col items-center rotate-180">
        <span className={`font-bold ${rankSizeClasses[size]}`} style={{ color: suitColor }}>
          {isJoker ? '★' : card.rank}
        </span>
        <span className={suitSizeClasses[size]} style={{ color: suitColor }}>
          {suitSymbol}
        </span>
      </div>
      
      {/* Wild indicator */}
      {isWild && (
        <div className="absolute top-1 left-1 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
          W
        </div>
      )}
      
      {/* Remove button - only show on hover if not readonly */}
      {!readonly && onRemove && !onClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 
                     text-white text-sm hover:bg-red-600 opacity-0 
                     group-hover:opacity-100 transition-opacity flex items-center justify-center
                     shadow-md z-10 font-bold"
          aria-label="Remove card"
        >
          ×
        </button>
      )}
      
      {/* Points display */}
      {showPoints && round && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 
                        px-2 py-0.5 bg-gray-900 text-white text-xs 
                        rounded-full font-semibold whitespace-nowrap shadow-md">
          {isJoker ? '50' : isWild ? '20' : card.rank === 'J' ? '11' : 
           card.rank === 'Q' ? '12' : card.rank === 'K' ? '13' : card.rank} pts
        </div>
      )}
      
      {/* Discard label */}
      {highlight === 'discard' && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 
                        bg-red-500 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
          ← DISCARD
        </div>
      )}
    </div>
  );
}

