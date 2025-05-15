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
    
    // Llamar al callback con el tiempo restante y los números ganadores
    callback(nextDrawTime, winningNumbers);
  });
};

// Inicializar el estado del juego si no existe
export const initializeGameState = async (): Promise<void> => {
  try {
    console.log('[initializeGameState] Verificando estado del juego...');
    
    // Primero verificar si ya existe un estado del juego válido
    const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
    const stateDoc = await getDoc(stateDocRef);
    const now = new Date();
    
    // Si existe un documento y tiene un tiempo de sorteo futuro válido, no hacer nada
    if (stateDoc.exists()) {
      const data = stateDoc.data();
      const nextDrawTime = data.nextDrawTime?.toMillis() || 0;
      
      if (nextDrawTime > now.getTime()) {
        const timeRemaining = Math.floor((nextDrawTime - now.getTime()) / 1000);
        console.log(`[initializeGameState] Estado del juego ya inicializado con un tiempo de sorteo válido (en ${timeRemaining}s):`, new Date(nextDrawTime).toLocaleTimeString());
        return;
      } else {
        console.log('[initializeGameState] El tiempo de sorteo existente ya pasó, calculando nuevo tiempo');
      }
    } else {
      console.log('[initializeGameState] No se encontró un estado del juego, creando uno nuevo');
    }
    
    // IMPORTANTE: En lugar de actualizar el estado del juego directamente,
    // solo verificar si hay resultados recientes y esperar a que la función
    // programada en Firebase Functions actualice el estado
    
    // 1. Obtener el último resultado del juego
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(resultsQuery);
    let lastWinningNumbers: string[] = [];
    let shouldUpdateState = true;
    
    if (!snapshot.empty) {
      const latestDoc = snapshot.docs[0];
      const data = latestDoc.data();
      lastWinningNumbers = data.winningNumbers || [];
      
      // Verificar si el resultado es reciente (menos de 2 minutos)
      const resultTime = data.timestamp?.toMillis() || 0;
      if (resultTime > 0 && (now.getTime() - resultTime) < 120000) {
        console.log('[initializeGameState] Se encontró un resultado reciente, no es necesario actualizar el estado');
        shouldUpdateState = false;
      } else {
        console.log('[initializeGameState] Últimos números ganadores encontrados:', lastWinningNumbers);
      }
    }
    
    // Solo actualizar el estado si es necesario
    if (shouldUpdateState) {
      // 2. Calcular próximo sorteo
      const nextMinute = new Date(now);
      nextMinute.setMinutes(now.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      
      // 3. Actualizar estado del juego con los últimos números ganadores
      await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
        winningNumbers: lastWinningNumbers,
        nextDrawTime: Timestamp.fromDate(nextMinute),
        lastUpdated: serverTimestamp(),
        source: 'client-init'
      }, { merge: true });
      
      console.log('[initializeGameState] Estado del juego inicializado con el próximo sorteo a las:', nextMinute.toLocaleTimeString());
    }
  } catch (error) {
    console.error('[initializeGameState] Error al inicializar el estado del juego:', error);
  }
}; 