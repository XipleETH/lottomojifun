import { db } from './config';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { generateRandomEmojis, checkWin } from '../utils/gameLogic';
import { Ticket, GameResult } from '../types';

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DRAW_INTERVAL_MS = 60000; // 1 minuto

// Esta función se ejecutaría en un servidor (Cloud Function)
// Aquí la implementamos como una función que se puede llamar manualmente para simular
export const processGameDraw = async (): Promise<void> => {
  try {
    // 1. Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    
    // 2. Calcular próximo sorteo
    const now = new Date();
    const nextDrawTime = new Date(now.getTime() + DRAW_INTERVAL_MS);
    
    // 3. Actualizar estado del juego
    await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextDrawTime),
      lastUpdated: serverTimestamp()
    });
    
    // 4. Obtener tickets activos
    const ticketsSnapshot = await getDocs(collection(db, TICKETS_COLLECTION));
    const tickets: Ticket[] = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Ticket));
    
    // 5. Comprobar ganadores
    const results = {
      firstPrize: [] as Ticket[],
      secondPrize: [] as Ticket[],
      thirdPrize: [] as Ticket[]
    };
    
    tickets.forEach(ticket => {
      if (!ticket?.numbers) return;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
    });
    
    // 6. Guardar resultado
    const gameResult: GameResult = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      winningNumbers,
      ...results
    };
    
    // Preparar datos serializables para Firestore
    const serializableResult = {
      id: gameResult.id,
      timestamp: serverTimestamp(),
      dateTime: new Date().toISOString(), // Fecha legible como respaldo
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
    
    await setDoc(doc(db, GAME_RESULTS_COLLECTION, gameResult.id), serializableResult);
    
    console.log('Game draw processed successfully:', gameResult);
  } catch (error) {
    console.error('Error processing game draw:', error);
  }
};

// Inicializar el estado del juego si no existe
export const initializeGameState = async (): Promise<void> => {
  try {
    // 1. Obtener el último resultado del juego
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(resultsQuery);
    let lastWinningNumbers: string[] = [];
    
    if (!snapshot.empty) {
      const latestDoc = snapshot.docs[0];
      const data = latestDoc.data();
      lastWinningNumbers = data.winningNumbers || [];
      console.log('Últimos números ganadores encontrados:', lastWinningNumbers);
    }
    
    // 2. Calcular próximo sorteo
    const now = new Date();
    const nextDrawTime = new Date(now.getTime() + DRAW_INTERVAL_MS);
    
    // 3. Actualizar estado del juego con los últimos números ganadores
    await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers: lastWinningNumbers,
      nextDrawTime: Timestamp.fromDate(nextDrawTime),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    console.log('Game state initialized with last winning numbers');
  } catch (error) {
    console.error('Error initializing game state:', error);
  }
}; 