import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { checkWin, generateRandomEmojis } from '../utils/gameLogic';
import { addGameResult } from '../utils/gameHistory';
import { useRealTimeTimer } from './useRealTimeTimer';
import { subscribeToUserTickets, subscribeToGameResults } from '../firebase/game';
import { db } from '../firebase/config';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

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
    // Obtener el último resultado al cargar
    const fetchLatestResult = async () => {
      try {
        console.log('Obteniendo último resultado de Firebase...');
        const resultsQuery = query(
          collection(db, 'game_results'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const snapshot = await getDocs(resultsQuery);
        if (!snapshot.empty) {
          const latestDoc = snapshot.docs[0];
          const data = latestDoc.data();
          
          console.log('Último resultado obtenido:', data);
          
          // Función para mapear los tickets de Firestore a nuestro formato
          const mapFirestoreTickets = (firestoreTickets: any[]): Ticket[] => {
            if (!Array.isArray(firestoreTickets)) return [];
            return firestoreTickets.map(ticket => ({
              id: ticket.id || '',
              numbers: ticket.numbers || [],
              timestamp: typeof ticket.timestamp === 'number' ? ticket.timestamp : Date.now(),
              userId: ticket.userId || 'anonymous'
            }));
          };
          
          // Extraer los datos del resultado
          const firstPrize = mapFirestoreTickets(data.firstPrize || []);
          const secondPrize = mapFirestoreTickets(data.secondPrize || []);
          const thirdPrize = mapFirestoreTickets(data.thirdPrize || []);
          const winningNumbers = data.winningNumbers || [];
          
          // Actualizar el estado con el último resultado
          setGameState(prev => ({
            ...prev,
            winningNumbers,
            lastResults: {
              firstPrize,
              secondPrize,
              thirdPrize
            }
          }));
        } else {
          console.log('No se encontraron resultados previos');
        }
      } catch (error) {
        console.error('Error al obtener el último resultado:', error);
      }
    };
    
    fetchLatestResult();
    
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

  const processGame = useCallback(() => {
    // Prevent duplicate processing within the same second
    const now = Date.now();
    if (processingRef.current || (now - lastProcessedTimeRef.current) < 5000) {
      console.log('Evitando procesamiento duplicado, tiempo desde último proceso:', now - lastProcessedTimeRef.current, 'ms');
      return;
    }

    processingRef.current = true;
    lastProcessedTimeRef.current = now;

    try {
      console.log('Procesando juego...');
      const winning = generateRandomEmojis(4);
      console.log('Números ganadores generados:', winning);
      
      const results = {
        firstPrize: [] as Ticket[],
        secondPrize: [] as Ticket[],
        thirdPrize: [] as Ticket[]
      };

      // Filtrar tickets temporales y procesar sólo los tickets reales
      const currentTickets = gameState.tickets.filter(ticket => !ticket.id?.startsWith('temp-'));
      console.log('Tickets activos:', currentTickets.length);
      
      currentTickets.forEach(ticket => {
        if (!ticket?.numbers) return;
        const winStatus = checkWin(ticket.numbers, winning);
        if (winStatus.firstPrize) results.firstPrize.push(ticket);
        else if (winStatus.secondPrize) results.secondPrize.push(ticket);
        else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
      });

      console.log('Resultados:', {
        firstPrize: results.firstPrize.length,
        secondPrize: results.secondPrize.length,
        thirdPrize: results.thirdPrize.length
      });

      const gameResult: GameResult = {
        id: crypto.randomUUID(),
        timestamp: now,
        winningNumbers: winning,
        firstPrize: [...results.firstPrize],
        secondPrize: [...results.secondPrize],
        thirdPrize: [...results.thirdPrize]
      };
      
      // Add result to history
      addGameResult(gameResult);
      console.log('Resultado añadido al historial local');
      
      // Save result to Firebase
      const resultData = {
        timestamp: serverTimestamp(),
        dateTime: new Date().toISOString(),
        winningNumbers: gameResult.winningNumbers,
        firstPrize: gameResult.firstPrize.map(ticket => ({
          id: ticket.id,
          numbers: ticket.numbers,
          timestamp: ticket.timestamp,
          userId: ticket.userId || 'anonymous'
        })),
        secondPrize: gameResult.secondPrize.map(ticket => ({
          id: ticket.id,
          numbers: ticket.numbers,
          timestamp: ticket.timestamp,
          userId: ticket.userId || 'anonymous'
        })),
        thirdPrize: gameResult.thirdPrize.map(ticket => ({
          id: ticket.id,
          numbers: ticket.numbers,
          timestamp: ticket.timestamp,
          userId: ticket.userId || 'anonymous'
        }))
      };

      // El resultado se actualizará automáticamente a través de la suscripción
      setDoc(doc(db, 'game_results', gameResult.id), resultData)
        .then(() => {
          console.log('Resultado guardado en Firebase con ID:', gameResult.id);
        })
        .catch(error => {
          console.error('Error al guardar resultado en Firebase:', error);
        });

    } catch (error) {
      console.error('Error procesando el juego:', error);
    } finally {
      // Reset processing flag after a longer delay
      setTimeout(() => {
        processingRef.current = false;
      }, 5000);
    }
  }, [gameState.tickets]);

  const timeRemaining = useRealTimeTimer(processGame);

  const forceGameDraw = useCallback(() => {
    console.log('Forzando sorteo manual...');
    processGame();
  }, [processGame]);

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