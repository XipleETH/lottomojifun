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
  const processedResultsRef = useRef<Set<string>>(new Set());
  const lastProcessedMinuteRef = useRef<string>('');

  // Suscribirse a los tickets del usuario y al estado del juego
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripciones...');
    
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
      console.log('[useGameState] Limpiando suscripciones de tickets y estado del juego');
      unsubscribeTickets();
      unsubscribeState();
    };
  }, []);

  // Función para obtener la clave de minuto de un timestamp
  const getMinuteKey = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  };

  // Suscribirse a los resultados del juego en Firebase
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripción a resultados del juego');
    const unsubscribe = subscribeToGameResults((results) => {
      if (results.length > 0) {
        const latestResult = results[0]; // El primer resultado es el más reciente
        
        // Solo procesar si es un resultado nuevo que no hemos visto antes
        const resultMinute = getMinuteKey(latestResult.timestamp);
        const resultId = latestResult.id || 'unknown';
        
        if (!processedResultsRef.current.has(resultId) && resultMinute !== lastProcessedMinuteRef.current) {
          console.log(`[useGameState] Nuevo resultado recibido para el minuto ${resultMinute} con ID: ${resultId}`, latestResult);
          processedResultsRef.current.add(resultId);
          lastProcessedMinuteRef.current = resultMinute;
          
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
        } else {
          console.log(`[useGameState] Ignorando resultado ya procesado para el minuto ${resultMinute} con ID: ${resultId}`);
        }
      }
    });
    
    return () => {
      console.log('[useGameState] Limpiando suscripción a resultados del juego');
      unsubscribe();
    };
  }, []);

  // Esta función se llama cuando termina el temporizador
  const onGameProcessed = useCallback(() => {
    // No es necesario solicitar manualmente un nuevo sorteo
    // El sorteo lo ejecuta automáticamente la Cloud Function cada minuto
    console.log('[useGameState] Temporizador terminado, esperando próximo sorteo automático...');
    
    // IMPORTANTE: NO hacer nada aquí que pueda desencadenar un sorteo
    // Solo registrar que el temporizador ha terminado
  }, []);

  // Obtener el tiempo restante del temporizador
  const timeRemaining = useRealTimeTimer(onGameProcessed);

  // Función para forzar un sorteo manualmente
  const forceGameDraw = useCallback(() => {
    console.log('[useGameState] Forzando sorteo manual...');
    requestManualGameDraw();
  }, []);

  // Función para generar un nuevo ticket
  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length || gameState.tickets.length >= MAX_TICKETS) {
      console.log('[useGameState] No se puede generar ticket: validaciones fallidas', { 
        numbersLength: numbers?.length, 
        currentTickets: gameState.tickets.length, 
        maxTickets: MAX_TICKETS 
      });
      return;
    }
    
    console.log('[useGameState] Generando ticket con números:', numbers);
    
    try {
      // Crear un ticket temporal para mostrar inmediatamente
      const tempId = 'temp-' + crypto.randomUUID();
      const tempTicket: Ticket = {
        id: tempId,
        numbers,
        timestamp: Date.now(),
        userId: 'temp'
      };
      
      console.log('[useGameState] Creando ticket temporal con ID:', tempId);
      
      // Actualizar el estado inmediatamente con el ticket temporal
      setGameState(prev => ({
        ...prev,
        tickets: [...prev.tickets, tempTicket]
      }));
      
      // Generar el ticket en Firebase (con reintentos internos)
      console.log('[useGameState] Llamando a Firebase para guardar ticket...');
      const { generateTicket: generateFirebaseTicket } = await import('../firebase/game');
      const ticket = await generateFirebaseTicket(numbers);
      
      if (ticket) {
        console.log('[useGameState] Ticket guardado en Firebase correctamente:', ticket.id);
      } else {
        // Si hay un error, eliminar el ticket temporal
        console.error('[useGameState] Error guardando ticket en Firebase');
        setGameState(prev => ({
          ...prev,
          tickets: prev.tickets.filter(t => t.id !== tempId)
        }));
        
        // Intentar de nuevo la conexión de Firestore
        console.log('[useGameState] Intentando reconexión con Firestore...');
        import('../firebase/initTickets').then(({ ticketsCollectionExists }) => {
          ticketsCollectionExists().then(exists => {
            console.log('[useGameState] Estado de la colección de tickets:', exists ? 'Disponible' : 'No disponible');
          });
        });
      }
    } catch (error) {
      console.error('[useGameState] Error generando ticket:', error);
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