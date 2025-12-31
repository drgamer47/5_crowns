import { useState, useEffect } from 'react';
import { TrophyIcon as TrophyIconSolid } from '@heroicons/react/24/solid';
import { Round } from '../types';

const ROUNDS: Round[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface ScoresheetData {
  players: string[];
  scores: Record<string, Record<Round, number>>; // Key is player index as string
  currentRound: Round;
}

const STORAGE_KEY = '5crowns-scoresheet';

export default function Scoresheet() {
  const [data, setData] = useState<ScoresheetData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to default
      }
    }
    return {
      players: ['Player 1', 'Player 2'],
      scores: {},
      currentRound: '3',
    };
  });

  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [playerEditValue, setPlayerEditValue] = useState('');

  // Initialize scores for new players (using index as key)
  useEffect(() => {
    const newScores = { ...data.scores };
    let changed = false;
    data.players.forEach((_, index) => {
      const key = String(index);
      if (!newScores[key]) {
        newScores[key] = {} as Record<Round, number>;
        ROUNDS.forEach((round) => {
          newScores[key][round] = 0;
        });
        changed = true;
      }
    });
    if (changed) {
      setData((prev) => ({ ...prev, scores: newScores }));
    }
  }, [data.players, data.scores]);

  // Load data from localStorage when component mounts or window gains focus
  const loadFromStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const loadedData = JSON.parse(saved);
        // Use loaded players directly (preserves duplicates and order)
        // If loaded data has players, use them; otherwise keep current
        setData((prev) => {
          const loadedPlayers = loadedData.players || [];
          const currentPlayers = prev.players || [];
          
          // If loaded data has players, use them (preserves all players including duplicates)
          // Otherwise keep current players
          // Limit to maximum 7 players
          let finalPlayers = loadedPlayers.length > 0 ? loadedPlayers : currentPlayers;
          if (finalPlayers.length > 7) {
            finalPlayers = finalPlayers.slice(0, 7);
          }
          
          return {
            ...loadedData,
            players: finalPlayers,
          };
        });
      } catch {
        // Ignore parse errors
      }
    }
  };

  // Listen for storage events (from other tabs) and window focus
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const loadedData = JSON.parse(e.newValue);
          // Use loaded players directly (preserves duplicates and order)
          setData((prev) => {
            const loadedPlayers = loadedData.players || [];
            const currentPlayers = prev.players || [];
            
            // If loaded data has players, use them (preserves all players including duplicates)
            // Otherwise keep current players
            // Limit to maximum 7 players
            let finalPlayers = loadedPlayers.length > 0 ? loadedPlayers : currentPlayers;
            if (finalPlayers.length > 7) {
              finalPlayers = finalPlayers.slice(0, 7);
            }
            
            return {
              ...loadedData,
              players: finalPlayers,
            };
          });
        } catch {
          // Ignore parse errors
        }
      }
    };

    const handleFocus = () => {
      loadFromStorage();
    };

    // Load on mount
    loadFromStorage();
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    // Also listen for custom events (for same-tab updates from PlayGame)
    const handleCustomStorage = () => {
      loadFromStorage();
    };
    window.addEventListener('scoresheetUpdate', handleCustomStorage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('scoresheetUpdate', handleCustomStorage);
    };
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleScoreChange = (playerIndex: number, round: Round, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    const key = String(playerIndex);
    setData((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [key]: {
          ...prev.scores[key] || {},
          [round]: numValue,
        },
      },
    }));
  };

  const handleAddPlayer = () => {
    // Maximum 7 players allowed
    if (data.players.length >= 7) {
      return;
    }
    setData((prev) => ({
      ...prev,
      players: [...prev.players, `Player ${prev.players.length + 1}`],
    }));
  };

  const handleRemovePlayer = (index: number) => {
    if (data.players.length <= 1) return;
    setData((prev) => {
      const newPlayers = prev.players.filter((_, i) => i !== index);
      const newScores: Record<string, Record<Round, number>> = {};
      // Reindex scores after removing a player
      newPlayers.forEach((_, newIndex) => {
        const oldIndex = newIndex >= index ? newIndex + 1 : newIndex;
        const oldKey = String(oldIndex);
        if (prev.scores[oldKey]) {
          newScores[String(newIndex)] = prev.scores[oldKey];
        }
      });
      return {
        ...prev,
        players: newPlayers,
        scores: newScores,
      };
    });
  };

  const handlePlayerNameEdit = (index: number) => {
    setEditingPlayer(index);
    setPlayerEditValue(data.players[index]);
  };

  const handlePlayerNameSave = (index: number) => {
    if (playerEditValue.trim()) {
      const newName = playerEditValue.trim();
      setData((prev) => {
        const newPlayers = [...prev.players];
        newPlayers[index] = newName;
        // Scores are keyed by index, so no need to update scores object
        return {
          ...prev,
          players: newPlayers,
        };
      });
    }
    setEditingPlayer(null);
    setPlayerEditValue('');
  };

  const handleSetCurrentRound = (round: Round) => {
    setData((prev) => ({ ...prev, currentRound: round }));
  };

  const calculateTotal = (playerIndex: number): number => {
    const key = String(playerIndex);
    return ROUNDS.reduce((sum, round) => {
      return sum + (data.scores[key]?.[round] || 0);
    }, 0);
  };

  const getLowestTotal = (): number => {
    const totals = data.players.map((_, index) => calculateTotal(index));
    return Math.min(...totals);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all scores? This cannot be undone.')) {
      const newScores: Record<string, Record<Round, number>> = {};
      data.players.forEach((_, index) => {
        const key = String(index);
        newScores[key] = {} as Record<Round, number>;
        ROUNDS.forEach((round) => {
          newScores[key][round] = 0;
        });
      });
      setData((prev) => ({
        ...prev,
        scores: newScores,
        currentRound: '3',
      }));
    }
  };

  const getWildDisplay = (roundIndex: number): string => {
    return `${ROUNDS[roundIndex - 1]} is wild`;
  };

  const handleTestRound = () => {
    if (data.players.length === 0) return;
    
    const currentRoundIndex = ROUNDS.indexOf(data.currentRound);
    if (currentRoundIndex === -1) return;
    
    // Generate random scores for current round
    // At least one player must go out (0 points), and multiple players can go out
    const newScores = { ...data.scores };
    
    // Determine how many players go out (1 to min(3, total players))
    // First player always goes out, others have a chance
    const numPlayersWhoWentOut = Math.min(
      Math.floor(Math.random() * Math.min(3, data.players.length)) + 1,
      data.players.length
    );
    
    // Create array of player indices and shuffle to randomly select who goes out
    const playerIndices = Array.from({ length: data.players.length }, (_, i) => i);
    for (let i = playerIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerIndices[i], playerIndices[j]] = [playerIndices[j], playerIndices[i]];
    }
    
    // First numPlayersWhoWentOut players in shuffled array go out
    const wentOutIndices = new Set(playerIndices.slice(0, numPlayersWhoWentOut));
    
    data.players.forEach((_, index) => {
      const key = String(index);
      if (!newScores[key]) {
        newScores[key] = {} as Record<Round, number>;
      }
      
      if (wentOutIndices.has(index)) {
        newScores[key][data.currentRound] = 0;
      } else {
        // Random score between 5 and 150
        newScores[key][data.currentRound] = Math.floor(Math.random() * 146) + 5;
      }
    });
    
    // Advance to next round if not the last round
    const nextRoundIndex = currentRoundIndex + 1;
    const nextRound = nextRoundIndex < ROUNDS.length ? ROUNDS[nextRoundIndex] : data.currentRound;
    
    setData((prev) => ({
      ...prev,
      scores: newScores,
      currentRound: nextRound,
    }));
  };

  const lowestTotal = getLowestTotal();

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 pb-4 sm:pb-8 md:pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
        <div className="flex justify-between items-center flex-wrap gap-2 sm:gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Scoresheet</h1>
          <div className="flex gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
            <button
              onClick={handleAddPlayer}
              disabled={data.players.length >= 7}
              className="px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg 
                         text-xs sm:text-sm md:text-base font-medium 
                         hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md
                         disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
              title={data.players.length >= 7 ? "Maximum 7 players allowed" : "Add a new player"}
            >
              Add Player
            </button>
            <button
              onClick={handleTestRound}
              className="px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-purple-600 text-white rounded-lg 
                         text-xs sm:text-sm md:text-base font-medium 
                         hover:bg-purple-700 transition-colors shadow-sm hover:shadow-md"
              title="Generate random scores for current round and advance to next round"
            >
              Test Round
            </button>
            <button
              onClick={handleClearAll}
              className="px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-red-500 text-white rounded-lg 
                         text-xs sm:text-sm md:text-base font-medium 
                         hover:bg-red-600 transition-colors shadow-sm hover:shadow-md"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Score Grid */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-hidden">
          <table className="w-full text-xs sm:text-sm md:text-base" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-3 text-left font-bold text-gray-900 
                               bg-gray-50 border-r border-gray-200" style={{ width: '50px' }}>
                  Round
                </th>
                {data.players.map((player, index) => (
                  <th key={index} className="px-0.5 py-1 sm:px-1 sm:py-1.5 md:px-4 md:py-3 text-center">
                    {editingPlayer === index ? (
                      <input
                        type="text"
                        value={playerEditValue}
                        onChange={(e) => setPlayerEditValue(e.target.value)}
                        onBlur={() => handlePlayerNameSave(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePlayerNameSave(index);
                          } else if (e.key === 'Escape') {
                            setEditingPlayer(null);
                          }
                        }}
                        className="font-bold text-gray-900 bg-transparent border-0 
                                   text-center hover:bg-gray-100 rounded px-1 py-0.5 sm:px-2 sm:py-1
                                   focus:bg-white focus:ring-2 focus:ring-blue-500 w-full text-xs sm:text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-0.5 sm:gap-2 flex-col sm:flex-row">
                        <span className="font-bold text-gray-900 text-[10px] sm:text-sm md:text-base truncate max-w-full">{player}</span>
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            onClick={() => handlePlayerNameEdit(index)}
                            className="text-gray-400 hover:text-blue-600 transition-colors text-[10px] sm:text-sm"
                            aria-label="Edit player name"
                          >
                            ✏️
                          </button>
                          {data.players.length > 1 && (
                            <button
                              onClick={() => handleRemovePlayer(index)}
                              className="text-gray-400 hover:text-red-600 transition-colors text-[10px] sm:text-sm"
                              aria-label="Remove player"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROUNDS.map((round, roundIndex) => {
                const isCurrentRound = round === data.currentRound;
                return (
                  <tr
                    key={round}
                    className={`border-b border-gray-200 transition-colors cursor-pointer
                               ${isCurrentRound ? 'bg-blue-50' : 'hover:bg-gray-50'}
                               ${roundIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    onClick={() => handleSetCurrentRound(round)}
                  >
                    <td className="px-1 py-1 sm:px-2 sm:py-1.5 md:px-4 md:py-3 bg-inherit border-r border-gray-200">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm md:text-lg font-bold text-gray-900">{round}</span>
                        <span className="px-1 py-0.5 sm:px-1.5 sm:py-0.5 md:px-2 md:py-1 bg-amber-100 text-amber-800 
                                         text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap">
                          {getWildDisplay(roundIndex + 1)}
                        </span>
                        {isCurrentRound && (
                          <span className="px-1 py-0.5 sm:px-1.5 sm:py-0.5 md:px-2 md:py-1 bg-blue-600 text-white 
                                           text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap">
                            CURRENT
                          </span>
                        )}
                      </div>
                    </td>
                    {data.players.map((_, playerIndex) => {
                      const key = String(playerIndex);
                      return (
                        <td key={playerIndex} className="px-0.5 py-1 sm:px-1 sm:py-1.5 md:px-4 md:py-3">
                          <input
                            type="number"
                            min="0"
                            value={data.scores[key]?.[round] || 0}
                            onChange={(e) => handleScoreChange(playerIndex, round, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-center text-xs sm:text-sm md:text-lg font-semibold border-2 
                                       border-gray-200 rounded px-0.5 py-0.5 sm:px-1 sm:py-0.5 md:px-3 md:py-2
                                       focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                                       hover:border-gray-300 transition-colors"
                            placeholder="—"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td className="px-1 py-1 sm:px-2 sm:py-2 md:px-4 md:py-4 bg-gray-100 border-r border-gray-300">
                  <span className="text-xs sm:text-sm md:text-lg text-gray-900">Total</span>
                </td>
                {data.players.map((_, playerIndex) => {
                  const total = calculateTotal(playerIndex);
                  const isLowest = total === lowestTotal && total > 0;
                  return (
                    <td key={playerIndex} className="px-0.5 py-1 sm:px-1 sm:py-2 md:px-4 md:py-4 text-center">
                      <span className={`text-sm sm:text-lg md:text-2xl font-bold ${
                        isLowest ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {total}
                      </span>
                      {isLowest && (
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-green-600 font-semibold mt-0.5 sm:mt-1">
                          <TrophyIconSolid className="w-3 h-3 sm:w-4 sm:h-4" />
                          WINNER
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

