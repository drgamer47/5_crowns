import { useState } from 'react';
import { 
  CheckCircleIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { GameState } from '../../gameTypes';
import { roundNumberToRound } from '../../gameUtils';
import { calculateCardPoints } from '../../scoring';
import PlayingCard from '../PlayingCard';

interface RoundEndProps {
  gameState: GameState;
  onEnterScores: (scores: number[]) => void;
}

export default function RoundEnd({ gameState, onEnterScores }: RoundEndProps) {
  const [scoresEntered, setScoresEntered] = useState(false);
  const round = roundNumberToRound(gameState.currentRound);

  // Calculate points for each player
  // Any player who went out gets 0 points
  const playerPoints = gameState.playerHands.map((hand, index) => {
    // If this player went out (first or during final turn), their score is 0
    if (gameState.playersWhoWentOut[index]) {
      return 0;
    }
    // Otherwise, calculate points from remaining cards
    return hand.reduce((sum, card) => sum + calculateCardPoints(card, round), 0);
  });

  const handleEnterScores = () => {
    onEnterScores(playerPoints);
    setScoresEntered(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-12">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-3xl font-bold mb-4 text-gray-900 flex items-center gap-3">
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
          Round {gameState.currentRound} Complete
        </h2>
        <p className="text-gray-600 mb-6 text-lg">
          {gameState.players[gameState.wentOutPlayerIndex!]} went out first!
        </p>

        <div className="space-y-4 mb-6">
          {gameState.players.map((player, index) => (
            <div key={index} className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {player}
                  {gameState.playersWhoWentOut[index] && (
                    <span className="ml-3 text-green-600 font-bold text-lg flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5" />
                      {index === gameState.wentOutPlayerIndex 
                        ? 'Went Out First - 0 points!' 
                        : 'Went Out - 0 points!'}
                    </span>
                  )}
                </h3>
                <div className={`text-3xl font-bold ${
                  gameState.playersWhoWentOut[index] ? 'text-green-600' : 'text-red-600'
                }`}>
                  {playerPoints[index]} points
                </div>
              </div>
              {!gameState.playersWhoWentOut[index] && (
                <>
                  <div className="text-sm text-gray-600 mb-3 font-medium">
                    Remaining cards ({gameState.playerHands[index].length}):
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {gameState.playerHands[index].map((card, cardIndex) => (
                      <div key={cardIndex} className="flex items-center gap-2">
                        <PlayingCard card={card} round={round} size="sm" readonly />
                        <span className="text-sm font-semibold text-gray-700">
                          {calculateCardPoints(card, round)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {gameState.playersWhoWentOut[index] && (
                <div className="text-sm text-green-600 font-semibold bg-green-50 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Successfully went out with all cards in melds!
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleEnterScores}
            disabled={scoresEntered}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            {scoresEntered ? 'Scores Entered' : 'Enter Scores & Continue'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset the game? This will clear all progress, scoresheet, and meld helper data.')) {
                localStorage.removeItem('5crowns-game-state');
                localStorage.removeItem('5crowns-scoresheet');
                localStorage.removeItem('5crowns-meldhelper');
                window.location.reload();
              }
            }}
            className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <TrashIcon className="w-5 h-5" />
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}

