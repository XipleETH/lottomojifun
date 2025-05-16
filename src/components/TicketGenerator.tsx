import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';
import { createPlayerTicket, createRandomTicket } from '../utils/ticketHelper';
import { toast } from 'react-hot-toast';
import { useAuth } from '../components/AuthProvider';

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
  const { user } = useAuth(); // Obtener la información del usuario autenticado

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
    
    // Verificar si el usuario está autenticado
    if (!user || !user.id) {
      toast.error('Debes iniciar sesión para crear tickets');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Primero, usar la función original para mantener la compatibilidad con el sistema
      onGenerateTicket(emojis);
      
      // Usar los datos del usuario autenticado
      const userId = user.id;
      const username = user.username || 'Usuario';
      const walletAddress = user.walletAddress;
      const fid = user.fid;
      
      console.log('[TicketGenerator] Creando ticket con emojis:', emojis.join(' '));
      console.log('[TicketGenerator] Datos del usuario:', { userId, username, walletAddress, fid });
      
      const result = await createPlayerTicket(userId, username, emojis, walletAddress, fid);
      
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
    
    // Verificar si el usuario está autenticado
    if (!user || !user.id) {
      toast.error('Debes iniciar sesión para crear tickets');
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
      
      // Usar los datos del usuario autenticado
      const userId = user.id;
      const username = user.username || 'Usuario';
      const walletAddress = user.walletAddress;
      const fid = user.fid;
      
      console.log('[TicketGenerator] Datos del usuario para ticket aleatorio:', { userId, username, walletAddress, fid });
      
      const result = await createRandomTicket(userId, username, walletAddress, fid);
      
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
          disabled={disabled || isSubmitting || !user}
          className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 
                   rounded-xl shadow-lg transform transition hover:scale-105 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   ${isSubmitting ? 'opacity-75 cursor-wait' : ''}`}
        >
          {isSubmitting ? 'Generando...' : 
           !user ? 'Inicia sesión para crear tickets' :
           `Generate Random Ticket (${ticketCount}/${maxTickets} Today)`}
        </button>
      </div>
    </div>
  );
};