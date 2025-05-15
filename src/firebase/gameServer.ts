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
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import { Ticket, GameResult } from '../types';

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DRAW_INTERVAL_MS = 60000; // 1 minuto

// Función para solicitar un sorteo manual (solo para uso administrativo)
export const requestManualGameDraw = async (): Promise<boolean> => {
  try {
    const triggerGameDraw = httpsCallable(functions, 'triggerGameDraw');
    await triggerGameDraw();
    console.log('Solicitud de sorteo manual enviada a Firebase Functions');
    return true;
  } catch (error) {
    console.error('Error al solicitar sorteo manual desde Firebase Functions:', error);
    return false;
  }
};

// Suscribirse a cambios en el estado del juego
export const subscribeToGameState = (callback: (nextDrawTime: number, winningNumbers: string[]) => void) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  
  // Mantener un registro del último estado para evitar actualizaciones duplicadas
  let lastNextDrawTime = 0;
  let lastWinningNumbersStr = '';
  
  return onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const now = Date.now();
    
    // Obtener el tiempo del próximo sorteo
    let nextDrawTime = data.nextDrawTime?.toMillis() || 0;
    
    // Si no hay un tiempo válido o ya pasó, calcular el próximo minuto
    if (nextDrawTime <= now) {
      const nextMinute = new Date(now);
      nextMinute.setMinutes(now.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      nextDrawTime = nextMinute.getTime();
    }
    
    // Obtener los números ganadores actuales
    const winningNumbers = data.winningNumbers || [];
    const winningNumbersStr = JSON.stringify(winningNumbers);
    
    // Solo llamar al callback si los datos han cambiado
    if (nextDrawTime !== lastNextDrawTime || winningNumbersStr !== lastWinningNumbersStr) {
      console.log('Estado del juego actualizado:', {
        nextDrawTime: new Date(nextDrawTime).toLocaleTimeString(),
        winningNumbers
      });
      
      // Actualizar los valores de la última actualización
      lastNextDrawTime = nextDrawTime;
      lastWinningNumbersStr = winningNumbersStr;
      
      // Llamar al callback con el tiempo restante y los números ganadores
      callback(nextDrawTime, winningNumbers);
    }
  });
};

// Inicializar el estado del juego si no existe
export const initializeGameState = async (): Promise<void> => {
  try {
    console.log('Iniciando inicialización del estado del juego...');
    
    // Verificar si ya existe un estado del juego
    const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
    const stateDoc = await getDoc(stateDocRef);
    
    if (stateDoc.exists()) {
      const data = stateDoc.data();
      const nextDrawTime = data.nextDrawTime?.toMillis() || 0;
      
      // Si ya existe un estado con un tiempo futuro, no hacer nada
      if (nextDrawTime > Date.now()) {
        console.log('Estado del juego ya inicializado con tiempo válido:', new Date(nextDrawTime).toLocaleTimeString());
        return;
      }
    }
    
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
    
    console.log('Estado del juego inicializado con el próximo sorteo a las:', nextMinute.toLocaleTimeString());
  } catch (error) {
    console.error('Error al inicializar el estado del juego:', error);
  }
}; 