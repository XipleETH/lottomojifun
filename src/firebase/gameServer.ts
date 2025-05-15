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
    
    // Obtener datos de la respuesta
    const data = result.data as { 
      success: boolean; 
      resultId?: string; 
      alreadyProcessed?: boolean;
      error?: string;
    };
    
    if (data.success) {
      if (data.alreadyProcessed) {
        console.log(`Sorteo ya procesado anteriormente con ID: ${data.resultId}`);
      } else {
        console.log(`Sorteo procesado correctamente con ID: ${data.resultId}`);
      }
      return true;
    } else {
      console.error('Error en la función de sorteo:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Error al solicitar sorteo desde Firebase Functions:', error);
    return false;
  }
};

// Suscribirse a cambios en el estado del juego
export const subscribeToGameState = (callback: (nextDrawTime: number) => void) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  
  // Opciones para la suscripción: incluir metadatos para detectar si los datos son del caché local
  const options = { includeMetadataChanges: true };
  
  // Variable para almacenar la función de cancelación de suscripción actual
  let currentUnsubscribe: () => void;
  
  const setupSubscription = () => {
    const unsubscribe = onSnapshot(stateDocRef, options, (snapshot) => {
      // Verificar si los datos vienen del caché o del servidor
      const fromCache = snapshot.metadata.fromCache;
      const data = snapshot.data() || {};
      const now = Date.now();
      
      // Si no hay nextDrawTime o es inválido, calculamos uno nuevo
      let nextDrawTime = data.nextDrawTime?.toMillis() || 0;
      
      // Si no hay un tiempo válido o los datos son del caché y están desactualizados
      if (nextDrawTime <= now || (fromCache && now - nextDrawTime > DRAW_INTERVAL_MS)) {
        // Calcular el próximo minuto completo
        const nextMinute = new Date(now);
        nextMinute.setMinutes(now.getMinutes() + 1);
        nextMinute.setSeconds(0);
        nextMinute.setMilliseconds(0);
        nextDrawTime = nextMinute.getTime();
        
        console.log('Usando tiempo calculado localmente:', new Date(nextDrawTime).toISOString());
      } else {
        console.log('Usando tiempo del servidor:', new Date(nextDrawTime).toISOString(), 
                   fromCache ? '(desde caché)' : '(desde servidor)');
      }
      
      const timeRemaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      callback(nextDrawTime);
    }, (error) => {
      console.error('Error en la suscripción al estado del juego:', error);
      
      // En caso de error, calcular un tiempo local y notificar
      const now = Date.now();
      const nextMinute = new Date(now);
      nextMinute.setMinutes(now.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      const nextDrawTime = nextMinute.getTime();
      
      console.log('Error de conexión, usando tiempo local:', new Date(nextDrawTime).toISOString());
      callback(nextDrawTime);
      
      // Intentar reconectar después de un breve retraso
      setTimeout(() => {
        if (currentUnsubscribe) {
          currentUnsubscribe();
        }
        setupSubscription();
      }, 5000);
    });
    
    // Actualizar la referencia a la función de cancelación actual
    currentUnsubscribe = unsubscribe;
    return unsubscribe;
  };
  
  // Iniciar la suscripción
  const unsubscribe = setupSubscription();
  
  // Devolver una función que cancele la suscripción actual
  return () => {
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }
  };
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