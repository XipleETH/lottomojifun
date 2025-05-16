import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';
import { createPlayerTicket, createRandomTicket } from '../utils/ticketHelper';
import { toast } from 'react-hot-toast';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset selected emojis when ticket count changes to 0
  useEffect(() => {
    if (ticketCount === 0) {
      setSelectedEmojis([]);
    }
  }, [ticketCount]);

  const handleEmojiSelect = (emoji: string) => {
    if (disabled || isSubmitting) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
    
    if (newSelection.length === 4) {
      handleTicketCreation(newSelection);
    }
  };

  const handleEmojiDeselect = (index: number) => {
    if (isSubmitting) return;
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const handleTicketCreation = async (emojis: string[]) => {
    if (disabled || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Primero, usar la función original para mantener la compatibilidad con el sistema
      onGenerateTicket(emojis);
      
      // Usamos también nuestro nuevo helper para guardar en player_tickets
      // Nota: en una implementación real, deberías obtener estos datos de autenticación
      const userId = `user_${Date.now()}`;
      const username = 'Usuario de Juego';
      
      console.log('[TicketGenerator] Creando ticket con emojis:', emojis.join(' '));
      
      const result = await createPlayerTicket(userId, username, emojis);
      
      if (result.success) {
        toast.success('¡Ticket creado con éxito!');
        console.log(`[TicketGenerator] Ticket guardado en player_tickets: ${result.ticketId}`);
        
        // Limpiar selección después de generar el ticket
        setTimeout(() => {
          setSelectedEmojis([]);
          setIsSubmitting(false);
        }, 1000);
      } else {
        toast.error(`Error: ${result.error}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('[TicketGenerator] Error creando ticket:', error);
      toast.error('Error al crear el ticket');
      setIsSubmitting(false);
    }
  };

  const handleRandomGenerate = async () => {
    if (disabled || isSubmitting) {
      console.log('[TicketGenerator] Generación de ticket aleatorio deshabilitada');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('[TicketGenerator] Generando ticket aleatorio...');
      
      // Generar 4 emojis aleatorios únicos
      const randomEmojis = generateRandomEmojis(4);
      
      // Enviar al hook para que los guarde en Firebase
      console.log('[TicketGenerator] Enviando emojis para guardar en Firebase:', randomEmojis);
      onGenerateTicket(randomEmojis);
      
      // Usamos también nuestro nuevo helper
      const userId = `user_${Date.now()}`;
      const username = 'Usuario de Juego';
      
      const result = await createRandomTicket(userId, username);
      
      if (result.success) {
        toast.success('¡Ticket aleatorio creado con éxito!');
        console.log(`[TicketGenerator] Ticket aleatorio guardado en player_tickets: ${result.ticketId}`);
      } else {
        toast.error(`Error: ${result.error}`);
      }
      
      // Feedback visual al usuario
      setSelectedEmojis([...randomEmojis]);
      
      // Limpiar después de un momento
      setTimeout(() => {
        setSelectedEmojis([]);
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error('[TicketGenerator] Error generando ticket aleatorio:', error);
      toast.error('Error al crear el ticket aleatorio');
      setIsSubmitting(false);
    }
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
          disabled={disabled || isSubmitting}
          className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 
                   rounded-xl shadow-lg transform transition hover:scale-105 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   ${isSubmitting ? 'opacity-75 cursor-wait' : ''}`}
        >
          {isSubmitting ? 'Generando...' : `Generate Random Ticket (${ticketCount}/${maxTickets} Today)`}
        </button>
      </div>
    </div>
  );
};