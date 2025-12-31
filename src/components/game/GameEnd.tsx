import { TrophyIcon as TrophyIconSolid } from '@heroicons/react/24/solid';
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { GameState } from '../../gameTypes';

interface GameEndProps {
  gameState: GameState;
}

export default function GameEnd({ gameState }: GameEndProps) {
  // Calculate total scores for each player
  const totalScores = gameState.players.map((_, playerIndex) => {
    return gameState.scores.reduce((sum, roundScores) => sum + (roundScores[playerIndex] || 0), 0);
  });

  // Find winner (lowest score)
  const minScore = Math.min(...totalScores);
  const winnerIndices = totalScores
    .map((score, index) => (score === minScore ? index : -1))
    .filter((idx) => idx !== -1);

  return (
    <div className="max-w-4xl mx-auto px-6 pb-12">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-4xl font-bold mb-6 text-center text-gray-900 flex items-center justify-center gap-3">
          <TrophyIconSolid className="w-10 h-10 text-amber-500" />
          Game Over!
        </h2>

        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-4 text-gray-900">Final Scores:</h3>
          <div className="space-y-3">
            {gameState.players.map((player, index) => {
              const isWinner = winnerIndices.includes(index);
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                    isWinner 
                      ? 'bg-green-50 border-2 border-green-500 shadow-md' 
                      : 'bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-gray-900">{player}</span>
                    {isWinner && (
                      <span className="text-green-600 font-bold text-lg flex items-center gap-2">
                        <TrophyIconSolid className="w-5 h-5" />
                        Winner!
                      </span>
                    )}
                  </div>
                  <div className={`text-3xl font-bold ${
                    isWinner ? 'text-green-600' : 'text-gray-800'
                  }`}>
                    {totalScores[index]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Round-by-Round Scores:</h3>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Round</th>
                    {gameState.players.map((player, idx) => (
                      <th key={idx} className="px-4 py-3 text-center font-bold text-gray-900">
                        {player}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gameState.scores.map((roundScores, roundIndex) => (
                    <tr 
                      key={roundIndex}
                      className={`border-b border-gray-200 ${
                        roundIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900">Round {roundIndex + 1}</td>
                      {gameState.players.map((_, playerIndex) => (
                        <td key={playerIndex} className="px-4 py-3 text-center text-lg font-semibold text-gray-900">
                          {roundScores[playerIndex] || 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                    <td className="px-4 py-4 text-lg text-gray-900">Total</td>
                    {gameState.players.map((_, playerIndex) => {
                      const isWinner = winnerIndices.includes(playerIndex);
                      return (
                        <td key={playerIndex} className={`px-4 py-4 text-center text-2xl font-bold ${
                          isWinner ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {totalScores[playerIndex]}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="text-center flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => {
              localStorage.removeItem('5crowns-game-state');
              localStorage.removeItem('5crowns-scoresheet');
              localStorage.removeItem('5crowns-meldhelper');
              window.location.reload();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            New Game
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset? This will clear all game data, scoresheet, and meld helper.')) {
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

