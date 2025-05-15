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
  getDoc
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
    console.log('Procesando sorteo...');
    
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
      numbers: doc.data().numbers || [],
      timestamp: doc.data().timestamp?.toMillis() || Date.now(),
      userId: doc.data().userId
    }));
    
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
    
    await setDoc(doc(db, GAME_RESULTS_COLLECTION, gameResult.id), gameResult);
    
    console.log('Game draw processed successfully:', gameResult);
  } catch (error) {
    console.error('Error processing game draw:', error);
  }
};

// Inicializar el estado del juego si no existe
export const initializeGameState = async (): Promise<void> => {
  try {
    // Verificar si ya existe un estado del juego
    const stateRef = doc(db, 'game_state', GAME_STATE_DOC);
    const stateDoc = await getDoc(stateRef);
    
    // Si no existe o si el tiempo del próximo sorteo ya pasó, inicializar
    if (!stateDoc.exists() || (stateDoc.data()?.nextDrawTime?.toMillis() || 0) < Date.now()) {
      const now = new Date();
      const nextDrawTime = new Date(now.getTime() + DRAW_INTERVAL_MS);
      
      await setDoc(stateRef, {
        winningNumbers: [],
        nextDrawTime: Timestamp.fromDate(nextDrawTime),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      console.log('Game state initialized with next draw at:', nextDrawTime);
    } else {
      console.log('Game state already exists with next draw at:', stateDoc.data()?.nextDrawTime?.toDate());
    }
  } catch (error) {
    console.error('Error initializing game state:', error);
  }
};

// Función para verificar si es hora de un nuevo sorteo
export const checkAndProcessGameDraw = async (): Promise<boolean> => {
  try {
    const stateRef = doc(db, 'game_state', GAME_STATE_DOC);
    const stateDoc = await getDoc(stateRef);
    
    if (!stateDoc.exists()) {
      await initializeGameState();
      return false;
    }
    
    const nextDrawTime = stateDoc.data()?.nextDrawTime?.toMillis() || 0;
    const now = Date.now();
    
    // Si ya pasó el tiempo del sorteo, procesarlo
    if (nextDrawTime <= now) {
      await processGameDraw();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking game draw time:', error);
    return false;
  }
}; 