import { useState, useCallback, useRef } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { checkWin, generateRandomEmojis } from '../utils/gameLogic';
import { addGameResult } from '../utils/gameHistory';
import { useRealTimeTimer } from './useRealTimeTimer';
import { subscribeToUserTickets } from '../firebase/game';
import { useEffect } from 'react';
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

  // Cargar el último resultado al iniciar
  useEffect(() => {
    const fetchLastGameResult = async () => {
      try {
        console.log('Cargando último resultado de juego...');
        const resultsQuery = query(
          collection(db, 'game_results'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const snapshot = await getDocs(resultsQuery);
        if (!snapshot.empty) {
          const lastResultDoc = snapshot.docs[0];
          const data = lastResultDoc.data();
          
          // Función para extraer el timestamp en milisegundos
          const getTimestamp = (firestoreTimestamp: any): number => {
            if (firestoreTimestamp?.toMillis) {
              return firestoreTimestamp.toMillis();
            } else if (typeof firestoreTimestamp === 'string') {
              return new Date(firestoreTimestamp).getTime();
            } else if (firestoreTimestamp?.seconds) {
              return firestoreTimestamp.seconds * 1000 + (firestoreTimestamp.nanoseconds / 1000000);
            } else {
              return Date.now();
            }
          };
          
          console.log('Último resultado encontrado:', data);
          
          setGameState(prev => ({
            ...prev,
            winningNumbers: Array.isArray(data.winningNumbers) ? data.winningNumbers : [],
            lastResults: {
              firstPrize: Array.isArray(data.firstPrize) ? data.firstPrize : [],
              secondPrize: Array.isArray(data.secondPrize) ? data.secondPrize : [],
              thirdPrize: Array.isArray(data.thirdPrize) ? data.thirdPrize : []
            }
          }));
        } else {
          console.log('No se encontraron resultados previos');
        }
      } catch (error) {
        console.error('Error al cargar el último resultado:', error);
      }
    };
    
    fetchLastGameResult();
  }, []);

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

  const processGame = useCallback(() => {
    // Prevent duplicate processing within the same second
    const now = Date.now();
    if (processingRef.current || (now - lastProcessedTimeRef.current) < 1000) {
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

      setGameState(prevState => {
        // Filtrar tickets temporales y procesar sólo los tickets reales
        const currentTickets = prevState.tickets.filter(ticket => !ticket.id?.startsWith('temp-'));
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

        setDoc(doc(db, 'game_results', gameResult.id), resultData)
          .then(() => {
            console.log('Resultado guardado en Firebase con ID:', gameResult.id);
          })
          .catch(error => {
            console.error('Error al guardar resultado en Firebase:', error);
          });

        return {
          ...prevState,
          tickets: currentTickets, // Mantener los tickets actuales
          winningNumbers: winning,
          lastResults: results,
        };
      });
    } catch (error) {
      console.error('Error procesando el juego:', error);
    } finally {
      // Reset processing flag after a short delay
      setTimeout(() => {
        processingRef.current = false;
      }, 1000);
    }
  }, []);

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