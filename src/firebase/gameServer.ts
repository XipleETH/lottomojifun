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
  limit,
  onSnapshot
} from 'firebase/firestore';
import { generateRandomEmojis, checkWin } from '../utils/gameLogic';
import { Ticket, GameResult } from '../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DRAW_INTERVAL_MS = 60000; // 1 minuto

// Función para solicitar un sorteo desde Firebase Functions
export const requestGameDraw = async (): Promise<boolean> => {
  try {
    const triggerGameDraw = httpsCallable(functions, 'triggerGameDraw');
    const result = await triggerGameDraw();
    console.log('Solicitud de sorteo enviada a Firebase Functions:', result);
    return true;
  } catch (error) {
    console.error('Error al solicitar sorteo desde Firebase Functions:', error);
    return false;
  }
};

// Suscribirse a cambios en el estado del juego
export const subscribeToGameState = (callback: (nextDrawTime: number) => void) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  
  return onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const nextDrawTime = data.nextDrawTime?.toMillis() || Date.now() + DRAW_INTERVAL_MS;
    callback(nextDrawTime);
  });
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
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    // 3. Actualizar estado del juego con los últimos números ganadores
    await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers: lastWinningNumbers,
      nextDrawTime: Timestamp.fromDate(nextMinute),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    console.log('Game state initialized with last winning numbers');
  } catch (error) {
    console.error('Error initializing game state:', error);
  }
}; 