import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';

interface TicketGeneratorProps {
  onGenerateTicket: (numbers: string[]) => void;
  disabled: boolean;
  ticketCount: number;
  maxTickets: number;
}

export const TicketGenerator: React.FC<TicketGeneratorProps> = ({
  onGenerateTicket,
  disabled,
  ticketCount,
  maxTickets
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

  // Reset selected emojis when ticket count changes to 0
  useEffect(() => {
    if (ticketCount === 0) {
      setSelectedEmojis([]);
    }
  }, [ticketCount]);

  const handleEmojiSelect = (emoji: string) => {
    if (disabled) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
    
    if (newSelection.length === 4) {
      onGenerateTicket(newSelection);
      setSelectedEmojis([]); // Reset selection after generating ticket
    }
  };

  const handleEmojiDeselect = (index: number) => {
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const handleRandomGenerate = () => {
    if (disabled) {
      console.log('[TicketGenerator] Generación de ticket aleatorio deshabilitada');
      return;
    }
    
    console.log('[TicketGenerator] Generando ticket aleatorio...');
    
    // Generar 4 emojis aleatorios únicos
    const randomEmojis = generateRandomEmojis(4);
    
    // Enviar al hook para que los guarde en Firebase
    console.log('[TicketGenerator] Enviando emojis para guardar en Firebase:', randomEmojis);
    onGenerateTicket(randomEmojis);
    
    // Feedback visual al usuario (opcional)
    setSelectedEmojis([...randomEmojis]); // Mostrar brevemente los emojis seleccionados
    
    // Limpiar después de un momento para preparar para la próxima selección
    setTimeout(() => {
      setSelectedEmojis([]);
    }, 1000);
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-4">
        <EmojiGrid
          selectedEmojis={selectedEmojis}
          onEmojiSelect={handleEmojiSelect}
          onEmojiDeselect={handleEmojiDeselect}
          maxSelections={4}
        />
        
        <button
          onClick={handleRandomGenerate}
          disabled={disabled}
          className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 
                   rounded-xl shadow-lg transform transition hover:scale-105 
                   disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Generate Random Ticket ({ticketCount}/{maxTickets} Today)
        </button>
      </div>
    </div>
  );
};