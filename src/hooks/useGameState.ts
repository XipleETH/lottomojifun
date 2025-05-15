import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { useRealTimeTimer } from './useRealTimeTimer';
import { subscribeToUserTickets, subscribeToGameResults } from '../firebase/game';
import { requestGameDraw } from '../firebase/gameServer';

const MAX_TICKETS = 10;

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: true
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  // Suscribirse a los tickets del usuario
  useEffect(() => {
    const unsubscribe = subscribeToUserTickets((tickets) => {
      setGameState(prev => ({
        ...prev,
        tickets
      }));
    });

    return () => unsubscribe();
  }, []);

  // Suscribirse a los resultados del juego en Firebase
  useEffect(() => {
    // Suscribirse a cambios en los resultados
    const unsubscribe = subscribeToGameResults((results) => {
      if (results.length > 0) {
        const latestResult = results[0]; // El primer resultado es el más reciente
        console.log('Nuevo resultado recibido de Firebase:', latestResult);
        
        setGameState(prev => ({
          ...prev,
          winningNumbers: latestResult.winningNumbers,
          lastResults: {
            firstPrize: latestResult.firstPrize,
            secondPrize: latestResult.secondPrize,
            thirdPrize: latestResult.thirdPrize
          }
        }));
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Esta función ahora solo actualiza la UI después de un sorteo
  const onGameProcessed = useCallback(() => {
    console.log('Juego procesado, actualizando UI...');
    // No necesitamos hacer nada aquí, ya que los resultados llegarán a través de la suscripción
  }, []);

  const timeRemaining = useRealTimeTimer(onGameProcessed);

  const forceGameDraw = useCallback(() => {
    console.log('Forzando sorteo manual...');
    requestGameDraw();
  }, []);

  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length || gameState.tickets.length >= MAX_TICKETS) return;
    
    try {
      // Crear un ticket temporal para mostrar inmediatamente
      const tempTicket: Ticket = {
        id: 'temp-' + crypto.randomUUID(),
        numbers,
        timestamp: Date.now(),
        userId: 'temp'
      };
      
      // Actualizar el estado inmediatamente con el ticket temporal
      setGameState(prev => ({
        ...prev,
        tickets: [...prev.tickets, tempTicket]
      }));
      
      // Generar el ticket en Firebase
      const ticket = await import('../firebase/game').then(({ generateTicket: generateFirebaseTicket }) => {
        return generateFirebaseTicket(numbers);
      });
      
      if (!ticket) {
        // Si hay un error, eliminar el ticket temporal
        setGameState(prev => ({
          ...prev,
          tickets: prev.tickets.filter(t => t.id !== tempTicket.id)
        }));
      }
      
    } catch (error) {
      console.error('Error generating ticket:', error);
    }
  }, [gameState.tickets.length]);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket,
    forceGameDraw
  };
}