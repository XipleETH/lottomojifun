import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GameResult } from '../types';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface GameHistoryModalProps {
  onClose: () => void;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({ onClose }) => {
  const [history, setHistory] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGameHistory = async () => {
      try {
        setLoading(true);
        const historyQuery = query(
          collection(db, 'game_results'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(historyQuery);
        const results: GameResult[] = snapshot.docs.map(doc => {
          try {
            const data = doc.data();
            // Validar que los datos tengan la estructura esperada
            return {
              id: doc.id,
              timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
              winningNumbers: Array.isArray(data.winningNumbers) ? data.winningNumbers : [],
              firstPrize: Array.isArray(data.firstPrize) ? data.firstPrize : [],
              secondPrize: Array.isArray(data.secondPrize) ? data.secondPrize : [],
              thirdPrize: Array.isArray(data.thirdPrize) ? data.thirdPrize : []
            };
          } catch (error) {
            console.error('Error mapping document in GameHistoryModal:', error, doc.id);
            return null;
          }
        }).filter(result => result !== null) as GameResult[];
        
        console.log('Fetched history results:', results.length);
        setHistory(results);
      } catch (error) {
        console.error('Error fetching game history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGameHistory();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderPrizeWinners = (result: GameResult, prizeType: keyof Pick<GameResult, 'firstPrize' | 'secondPrize' | 'thirdPrize'>) => {
    if (!result || !result[prizeType]) return null;
    
    const winners = result[prizeType];
    if (winners.length === 0) return null;

    const prizeLabels = {
      firstPrize: '🏆 Primer Premio',
      secondPrize: '🥈 Segundo Premio',
      thirdPrize: '🥉 Tercer Premio'
    };

    return (
      <div className="mt-2">
        <span className="font-semibold">{prizeLabels[prizeType]}</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {winners.map((ticket, idx) => (
            <div key={ticket.id || `ticket-${idx}`} 
                 className="bg-white/50 rounded-lg px-3 py-1 text-sm">
              {ticket.numbers?.join(' ') || 'Ticket inválido'}
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
          <h2 className="text-xl font-bold">Historial de Juegos</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-500">Aún no hay juegos registrados</p>
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
                        <span className="font-semibold">Emojis Ganadores:</span>
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