import { useState, useCallback, useRef } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { checkWin, generateRandomEmojis } from '../utils/gameLogic';
import { addGameResult } from '../utils/gameHistory';
import { useRealTimeTimer } from './useRealTimeTimer';

const MAX_TICKETS = 10;

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: true
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const processingRef = useRef(false);
  const lastProcessedTimeRef = useRef<number>(0);

  const processGame = useCallback(() => {
    // Prevent duplicate processing within the same second
    const now = Date.now();
    if (processingRef.current || (now - lastProcessedTimeRef.current) < 1000) {
      return;
    }

    processingRef.current = true;
    lastProcessedTimeRef.current = now;

    try {
      const winning = generateRandomEmojis(4);
      const results = {
        firstPrize: [] as Ticket[],
        secondPrize: [] as Ticket[],
        thirdPrize: [] as Ticket[]
      };

      setGameState(prevState => {
        const currentTickets = prevState.tickets || [];
        currentTickets.forEach(ticket => {
          if (!ticket?.numbers) return;
          const winStatus = checkWin(ticket.numbers, winning);
          if (winStatus.firstPrize) results.firstPrize.push(ticket);
          else if (winStatus.secondPrize) results.secondPrize.push(ticket);
          else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
        });

        const gameResult: GameResult = {
          id: crypto.randomUUID(),
          timestamp: now,
          winningNumbers: winning,
          ...results
        };
        
        // Add result to history
        addGameResult(gameResult);

        return {
          ...initialGameState,
          winningNumbers: winning,
          lastResults: results,
        };
      });
    } finally {
      // Reset processing flag after a short delay
      setTimeout(() => {
        processingRef.current = false;
      }, 1000);
    }
  }, []);

  const timeRemaining = useRealTimeTimer(processGame);

  const generateTicket = useCallback((numbers: string[]) => {
    if (!numbers?.length || gameState.tickets.length >= MAX_TICKETS) return;
    
    const newTicket: Ticket = {
      id: crypto.randomUUID(),
      numbers,
      timestamp: Date.now()
    };

    setGameState(prev => ({
      ...prev,
      tickets: [...(prev.tickets || []), newTicket]
    }));
  }, [gameState.tickets.length]);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket
  };
}