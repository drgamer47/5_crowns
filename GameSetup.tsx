import { useState } from 'react';
import { 
  PlusIcon,
  TrashIcon,
  PlayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface GameSetupProps {
  onStartGame: (players: string[]) => void;
  hasSavedGame?: boolean;
  onClearSavedGame?: () => void;
}

export default function GameSetup({ onStartGame, hasSavedGame, onClearSavedGame }: GameSetupProps) {
  const [players, setPlayers] = useState<string[]>(['Player 1', 'Player 2']);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = () => {
    if (newPlayerName.trim() && players.length < 7) {
      setPlayers([...players, newPlayerName.trim()]);
      setNewPlayerName('');
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const handleUpdatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const handleStartGame = () => {
    if (players.length >= 2 && players.length <= 7) {
      onStartGame(players);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 pb-12">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-3xl font-bold mb-6 text-gray-900 flex items-center gap-3">
          <PlayIcon className="w-8 h-8 text-blue-600" />
          Five Crowns - Game Setup
        </h2>
        {hasSavedGame && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 mb-3 font-medium">You have a saved game in progress.</p>
                {onClearSavedGame && (
                  <button
                    onClick={onClearSavedGame}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <TrashIcon className="w-5 h-5" />
                    Start New Game (Clear Saved Game)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <p className="text-gray-600 mb-6 text-lg">Enter 2-7 player names to start the game.</p>

        <div className="space-y-4 mb-6">
          <h3 className="font-bold text-lg text-gray-900">Players:</h3>
          {players.map((player, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="text"
                value={player}
                onChange={(e) => handleUpdatePlayer(index, e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder={`Player ${index + 1}`}
              />
              {players.length > 2 && (
                <button
                  onClick={() => handleRemovePlayer(index)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  <TrashIcon className="w-5 h-5" />
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {players.length < 7 && (
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPlayer();
                }
              }}
              placeholder="Enter new player name"
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <button
              onClick={handleAddPlayer}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Player
            </button>
          </div>
        )}

        <button
          onClick={handleStartGame}
          disabled={players.length < 2 || players.length > 7}
          className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <PlayIcon className="w-6 h-6" />
          Start Game
        </button>
      </div>
    </div>
  );
}

