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
  const lastUpdateRef = { timestamp: 0, processId: '', winningNumbers: [] as string[] };
  
  console.log('[subscribeToGameState] Iniciando suscripción a cambios en el estado del juego');
  
  return onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const now = Date.now();
    
    // Determinar el origen de esta actualización
    const isServerUpdate = !!data.lastProcessId;
    const isClientEmergency = data.source === 'client-emergency-init';
    const isClientTimeOnly = data.source === 'client-init-time-only';
    
    // Obtener el tiempo del próximo sorteo (esto siempre lo procesamos)
    let nextDrawTime = data.nextDrawTime?.toMillis() || 0;
    
    // Si no hay un tiempo válido o ya pasó, calcular el próximo minuto
    if (nextDrawTime <= now) {
      const nextMinute = new Date(now);
      nextMinute.setMinutes(now.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      nextDrawTime = nextMinute.getTime();
    }
    
    // Obtener los números ganadores actuales, SOLO si la actualización viene del servidor
    // o si no tenemos números ganadores previos
    let winningNumbers = lastUpdateRef.winningNumbers;
    
    if (isServerUpdate) {
      // Es una actualización del servidor, actualizar los números ganadores
      winningNumbers = data.winningNumbers || [];
      console.log(`[subscribeToGameState] Actualización del servidor: procesando números ganadores (${winningNumbers.join(', ')})`);
      
      // Guardar estos valores como la última actualización válida
      lastUpdateRef.timestamp = now;
      lastUpdateRef.processId = data.lastProcessId;
      lastUpdateRef.winningNumbers = [...winningNumbers];
    } else if (lastUpdateRef.winningNumbers.length === 0 && data.winningNumbers && Array.isArray(data.winningNumbers)) {
      // Si no tenemos números ganadores previos, usar los que hay (inicialización)
      winningNumbers = data.winningNumbers;
      lastUpdateRef.winningNumbers = [...winningNumbers];
      console.log(`[subscribeToGameState] Primera carga: usando números ganadores disponibles (${winningNumbers.join(', ')})`);
    } else if (!isClientTimeOnly && !isClientEmergency) {
      // Es una actualización que no viene del servidor ni es una inicialización conocida
      console.log('[subscribeToGameState] Ignorando actualización que no viene del servidor', {
        source: data.source,
        hasWinningNumbers: !!data.winningNumbers,
        nextDrawTime: new Date(nextDrawTime).toLocaleTimeString()
      });
    }
    
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
        console.log('[initializeGameState] El tiempo de sorteo existente ya pasó, pero NO actualizaremos los números ganadores');
        
        // Solo actualizaremos el nextDrawTime, pero mantendremos los números ganadores existentes
        if (data.winningNumbers && Array.isArray(data.winningNumbers)) {
          const nextMinute = new Date(now);
          nextMinute.setMinutes(now.getMinutes() + 1);
          nextMinute.setSeconds(0);
          nextMinute.setMilliseconds(0);
          
          // Actualizar SOLO el nextDrawTime, preservando los winningNumbers existentes
          await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
            nextDrawTime: Timestamp.fromDate(nextMinute),
            lastUpdated: serverTimestamp(),
            source: 'client-init-time-only',
            clientInitTime: now.toISOString()
          }, { merge: true });
          
          console.log('[initializeGameState] Solo se actualizó el tiempo del próximo sorteo a:', nextMinute.toLocaleTimeString());
          return;
        }
      }
    }
    
    // Si no existe documento, esperar a que la función Firebase lo cree
    console.log('[initializeGameState] No se encontró un estado del juego o no tiene los datos correctos, esperando a que Firebase Functions lo cree...');
    
    // NO crearemos ningún documento o actualizaremos números ganadores,
    // Dejaremos que la función programada lo haga
    
    // Esperar 3 segundos y comprobar de nuevo
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar una vez más
    const retryDoc = await getDoc(stateDocRef);
    if (!retryDoc.exists()) {
      console.log('[initializeGameState] Aún no existe documento, creando uno mínimo...');
      
      // Crear un documento mínimo solo con nextDrawTime, sin números ganadores
      const nextMinute = new Date(now);
      nextMinute.setMinutes(now.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      
      await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
        nextDrawTime: Timestamp.fromDate(nextMinute),
        lastUpdated: serverTimestamp(),
        source: 'client-emergency-init',
        winningNumbers: [], // Array vacío, no generamos números
        clientEmergencyInitTime: now.toISOString()
      });
      
      console.log('[initializeGameState] Creado documento de emergencia con próximo sorteo a las:', nextMinute.toLocaleTimeString());
    } else {
      console.log('[initializeGameState] El documento ya existe después de esperar, no es necesario crear uno');
    }
  } catch (error) {
    console.error('[initializeGameState] Error al inicializar el estado del juego:', error);
  }
}; 