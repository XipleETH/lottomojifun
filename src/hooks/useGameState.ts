import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { useRealTimeTimer } from './useRealTimeTimer';
import { subscribeToUserTickets, subscribeToGameResults } from '../firebase/game';
import { requestManualGameDraw, subscribeToGameState } from '../firebase/gameServer';

const MAX_TICKETS = 10;

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: true
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  // Suscribirse a los tickets del usuario y al estado del juego
  useEffect(() => {
    // Suscribirse a los tickets del usuario
    const unsubscribeTickets = subscribeToUserTickets((tickets) => {
      setGameState(prev => ({
        ...prev,
        tickets
      }));
    });

    // Suscribirse al estado del juego para obtener los números ganadores actuales
    const unsubscribeState = subscribeToGameState((nextDrawTime, winningNumbers) => {
      setGameState(prev => ({
        ...prev,
        winningNumbers
      }));
    });

    return () => {
      unsubscribeTickets();
      unsubscribeState();
    };
  }, []);

  // Suscribirse a los resultados del juego en Firebase
  useEffect(() => {
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
            thirdPrize: latestResult.thirdPrize,
            freePrize: latestResult.freePrize || [] // Compatibilidad con resultados antiguos
          }
        }));
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Esta función se llama cuando termina el temporizador
  const onGameProcessed = useCallback(() => {
    // No es necesario solicitar manualmente un nuevo sorteo
    // El sorteo lo ejecuta automáticamente la Cloud Function cada minuto
    console.log('Temporizador terminado, esperando próximo sorteo automático...');
  }, []);

  // Obtener el tiempo restante del temporizador
  const timeRemaining = useRealTimeTimer(onGameProcessed);

  // Función para forzar un sorteo manualmente
  const forceGameDraw = useCallback(() => {
    console.log('Forzando sorteo manual...');
    requestManualGameDraw();
  }, []);

  // Función para generar un nuevo ticket
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