import { useState, useCallback, useEffect } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { 
  generateTicket as generateFirebaseTicket, 
  subscribeToUserTickets,
  subscribeToCurrentGameState,
  subscribeToGameResults
} from '../firebase/game';

const MAX_TICKETS = 10;

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: true
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);

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

  // Suscribirse al estado actual del juego
  useEffect(() => {
    const unsubscribe = subscribeToCurrentGameState((winningNumbers, timeRemaining) => {
      setGameState(prev => ({
        ...prev,
        winningNumbers
      }));
      setTimeRemaining(timeRemaining);
    });

    return () => unsubscribe();
  }, []);

  // Suscribirse a los resultados del juego
  useEffect(() => {
    const unsubscribe = subscribeToGameResults((results) => {
      if (results.length > 0) {
        const latestResult = results[0];
        setGameState(prev => ({
          ...prev,
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

  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length || gameState.tickets.length >= MAX_TICKETS) return;
    
    await generateFirebaseTicket(numbers);
  }, [gameState.tickets.length]);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket
  };
}