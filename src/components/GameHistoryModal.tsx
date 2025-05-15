import React from 'react';
import { X } from 'lucide-react';
import { getGameHistory } from '../utils/gameHistory';
import { GameResult } from '../types';

interface GameHistoryModalProps {
  onClose: () => void;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({ onClose }) => {
  const history = getGameHistory();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderPrizeWinners = (result: GameResult, prizeType: keyof Pick<GameResult, 'firstPrize' | 'secondPrize' | 'thirdPrize'>) => {
    if (!result || !result[prizeType]) return null;
    
    const winners = result[prizeType];
    if (winners.length === 0) return null;

    const prizeLabels = {
      firstPrize: '🏆 First Prize',
      secondPrize: '🥈 Second Prize',
      thirdPrize: '🥉 Third Prize'
    };

    return (
      <div className="mt-2">
        <span className="font-semibold">{prizeLabels[prizeType]}</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {winners.map(ticket => (
            <div key={ticket.id} 
                 className="bg-white/50 rounded-lg px-3 py-1 text-sm">
              {ticket.numbers.join(' ')}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 bg-purple-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Game History</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
          {history.length === 0 ? (
            <p className="text-center text-gray-500">No games played yet</p>
          ) : (
            <div className="space-y-6">
              {history.map(result => (
                <div key={result.id} 
                     className="bg-purple-50 rounded-xl p-4 shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">
                        {formatDate(result.timestamp)}
                      </p>
                      <div className="mt-2">
                        <span className="font-semibold">Winning Emojis:</span>
                        <div className="flex gap-2 mt-1 text-2xl">
                          {result.winningNumbers?.map((emoji, i) => (
                            <span key={i}>{emoji}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderPrizeWinners(result, 'firstPrize')}
                  {renderPrizeWinners(result, 'secondPrize')}
                  {renderPrizeWinners(result, 'thirdPrize')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}