import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { 
  generateTicket as generateFirebaseTicket, 
  subscribeToUserTickets,
  subscribeToCurrentGameState,
  subscribeToGameResults
} from '../firebase/game';
import { checkAndProcessGameDraw, processGameDraw } from '../firebase/gameServer';
import { useAuth } from '../components/AuthProvider';

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
  const { user } = useAuth();

  // Verificar si es hora de un nuevo sorteo
  useEffect(() => {
    const checkDraw = async () => {
      const processed = await checkAndProcessGameDraw();
      console.log("Verificación de sorteo:", processed ? "Procesado" : "No necesario");
    };
    
    // Verificar al inicio y cada 5 segundos
    checkDraw();
    const interval = setInterval(checkDraw, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Suscribirse a los tickets del usuario
  useEffect(() => {
    if (!user) return;
    
    console.log("Suscribiéndose a tickets del usuario:", user.id);
    const unsubscribe = subscribeToUserTickets((tickets) => {
      console.log("Tickets recibidos:", tickets.length);
      setGameState(prev => ({
        ...prev,
        tickets
      }));
    });

    return () => unsubscribe();
  }, [user]);

  // Suscribirse al estado actual del juego
  useEffect(() => {
    console.log("Suscribiéndose al estado del juego");
    const unsubscribe = subscribeToCurrentGameState((winningNumbers, remainingTime) => {
      console.log("Estado del juego actualizado:", { winningNumbers, remainingSeconds: remainingTime });
      
      setGameState(prev => ({
        ...prev,
        winningNumbers
      }));
      
      setTimeRemaining(remainingTime);
      
      // Si el contador llega a cero, verificar si es hora de un sorteo
      if (remainingTime <= 0) {
        console.log("Contador llegó a cero, verificando sorteo...");
        checkAndProcessGameDraw();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Suscribirse a los resultados del juego
  useEffect(() => {
    console.log("Suscribiéndose a resultados del juego");
    const unsubscribe = subscribeToGameResults((results) => {
      if (results.length > 0) {
        console.log("Resultados recibidos:", results[0]);
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

  // Generar un ticket aleatorio
  const generateRandomTicket = useCallback(async () => {
    if (gameState.tickets.length >= MAX_TICKETS) return;
    
    // Generar 4 emojis aleatorios
    const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', 
                   '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗'];
    
    const randomEmojis = Array(4).fill(0).map(() => {
      const randomIndex = Math.floor(Math.random() * emojis.length);
      return emojis[randomIndex];
    });
    
    await generateTicket(randomEmojis);
  }, [gameState.tickets.length]);

  // Generar un ticket con emojis específicos
  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length || gameState.tickets.length >= MAX_TICKETS || !user) return;
    
    console.log("Generando ticket:", numbers);
    await generateFirebaseTicket(numbers);
  }, [gameState.tickets.length, user]);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket,
    generateRandomTicket
  };
}