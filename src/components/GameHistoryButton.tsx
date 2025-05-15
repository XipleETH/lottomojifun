import React, { useState } from 'react';
import { History } from 'lucide-react';
import { GameHistoryModal } from './GameHistoryModal';

export const GameHistoryButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 
                   text-white rounded-lg px-4 py-2 shadow-lg transition-all 
                   hover:scale-105 flex items-center gap-2"
        aria-label="Game History"
      >
        <History size={20} />
        <span>Historial de Juegos</span>
      </button>

      {isModalOpen && <GameHistoryModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}