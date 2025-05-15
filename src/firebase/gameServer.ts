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
    
    // 2. Calcular próximo sorteo - asegurar que sea exactamente 60 segundos desde ahora
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
    
    console.log(`Procesando ${tickets.length} tickets para el sorteo`);
    
    // 5. Comprobar ganadores
    const results = {
      firstPrize: [] as Ticket[],
      secondPrize: [] as Ticket[],
      thirdPrize: [] as Ticket[]
    };
    
    tickets.forEach(ticket => {
      if (!ticket?.numbers) return;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      if (winStatus.firstPrize) {
        console.log(`¡Ticket ganador de primer premio! ID: ${ticket.id}`);
        results.firstPrize.push(ticket);
      }
      else if (winStatus.secondPrize) {
        console.log(`¡Ticket ganador de segundo premio! ID: ${ticket.id}`);
        results.secondPrize.push(ticket);
      }
      else if (winStatus.thirdPrize) {
        console.log(`¡Ticket ganador de tercer premio! ID: ${ticket.id}`);
        results.thirdPrize.push(ticket);
      }
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
    console.log(`Próximo sorteo a las: ${nextDrawTime.toLocaleTimeString()}`);
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
      // Calcular el próximo minuto exacto
      const now = new Date();
      // Redondear al siguiente minuto
      const nextMinute = new Date(Math.ceil(now.getTime() / 60000) * 60000);
      
      const nextDrawTime = nextMinute;
      
      await setDoc(stateRef, {
        winningNumbers: [],
        nextDrawTime: Timestamp.fromDate(nextDrawTime),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      console.log('Game state initialized with next draw at:', nextDrawTime.toLocaleTimeString());
    } else {
      const nextDrawTime = new Date(stateDoc.data()?.nextDrawTime?.toMillis());
      console.log('Game state already exists with next draw at:', nextDrawTime.toLocaleTimeString());
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
      console.log('No existe estado del juego, inicializando...');
      await initializeGameState();
      return false;
    }
    
    const nextDrawTime = stateDoc.data()?.nextDrawTime?.toMillis() || 0;
    const now = Date.now();
    const timeRemaining = Math.floor((nextDrawTime - now) / 1000);
    
    console.log(`Tiempo restante para el próximo sorteo: ${timeRemaining} segundos`);
    
    // Si ya pasó el tiempo del sorteo, procesarlo
    if (nextDrawTime <= now) {
      console.log('Es hora del sorteo, procesando...');
      await processGameDraw();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking game draw time:', error);
    return false;
  }
}; 