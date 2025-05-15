import { db } from './config';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  setDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  where,
  Timestamp 
} from 'firebase/firestore';
import { GameResult, Ticket } from '../types';
import { getCurrentUser } from './auth';

const GAME_RESULTS_COLLECTION = 'game_results';
const TICKETS_COLLECTION = 'tickets';
const GAME_STATE_DOC = 'current_game_state';
const RESULTS_LIMIT = 50;

// Convertir documento de Firestore a nuestro tipo de resultado de juego
const mapFirestoreGameResult = (doc: any): GameResult => {
  const data = doc.data();
  
  // Asegurarse de que los tickets tengan la estructura correcta
  const mapTickets = (tickets: any[]): Ticket[] => {
    if (!tickets || !Array.isArray(tickets)) return [];
    
    return tickets.map(ticket => ({
      id: ticket.id || '',
      numbers: ticket.numbers || [],
      timestamp: ticket.timestamp?.toMillis ? ticket.timestamp.toMillis() : (ticket.timestamp || Date.now()),
      userId: ticket.userId || ''
    }));
  };
  
  return {
    id: doc.id,
    timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now()),
    winningNumbers: data.winningNumbers || [],
    firstPrize: mapTickets(data.firstPrize || []),
    secondPrize: mapTickets(data.secondPrize || []),
    thirdPrize: mapTickets(data.thirdPrize || [])
  };
};

// Convertir documento de Firestore a nuestro tipo de ticket
const mapFirestoreTicket = (doc: any): Ticket => {
  const data = doc.data();
  return {
    id: doc.id,
    numbers: data.numbers || [],
    timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now()),
    userId: data.userId || ''
  };
};

// Guardar un resultado de juego
export const saveGameResult = async (result: GameResult): Promise<string | null> => {
  try {
    const resultRef = await addDoc(collection(db, GAME_RESULTS_COLLECTION), {
      timestamp: serverTimestamp(),
      winningNumbers: result.winningNumbers,
      firstPrize: result.firstPrize,
      secondPrize: result.secondPrize,
      thirdPrize: result.thirdPrize
    });
    
    return resultRef.id;
  } catch (error) {
    console.error('Error saving game result:', error);
    return null;
  }
};

// Generar un ticket
export const generateTicket = async (numbers: string[]): Promise<Ticket | null> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.error('No user logged in');
      return null;
    }
    
    const ticketData = {
      numbers,
      timestamp: serverTimestamp(),
      userId: user.id
    };
    
    console.log('Generando ticket para usuario:', user.id);
    const ticketRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    
    return {
      id: ticketRef.id,
      numbers,
      timestamp: Date.now(),
      userId: user.id
    };
  } catch (error) {
    console.error('Error generating ticket:', error);
    return null;
  }
};

// Suscribirse a los resultados de juegos
export const subscribeToGameResults = (
  callback: (results: GameResult[]) => void
) => {
  const resultsQuery = query(
    collection(db, GAME_RESULTS_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(RESULTS_LIMIT)
  );
  
  return onSnapshot(resultsQuery, (snapshot) => {
    const results = snapshot.docs.map(mapFirestoreGameResult);
    callback(results);
  });
};

// Suscribirse a los tickets del usuario actual
export const subscribeToUserTickets = (
  callback: (tickets: Ticket[]) => void
) => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('No user logged in, cannot subscribe to tickets');
    callback([]);
    return () => {};
  }
  
  console.log('Suscribiéndose a tickets para usuario:', user.id);
  const ticketsQuery = query(
    collection(db, TICKETS_COLLECTION),
    where('userId', '==', user.id),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(ticketsQuery, (snapshot) => {
    const tickets = snapshot.docs.map(mapFirestoreTicket);
    console.log('Tickets recibidos:', tickets.length);
    callback(tickets);
  }, (error) => {
    console.error('Error subscribing to tickets:', error);
    callback([]);
  });
};

// Suscribirse al estado actual del juego
export const subscribeToCurrentGameState = (
  callback: (winningNumbers: string[], timeRemaining: number) => void
) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  
  // Función para calcular el tiempo restante
  const calculateTimeRemaining = (nextDrawTime: number): number => {
    const now = Date.now();
    const diff = nextDrawTime - now;
    // Asegurar que el tiempo restante sea entre 0 y 60 segundos
    return Math.max(0, Math.min(60, Math.floor(diff / 1000)));
  };
  
  // Actualizar el tiempo restante cada segundo
  let clientInterval: number | null = null;
  let lastNextDrawTime: number = 0;
  
  const setupInterval = (nextDrawTime: number) => {
    // Limpiar intervalo anterior si existe
    if (clientInterval) {
      clearInterval(clientInterval);
    }
    
    lastNextDrawTime = nextDrawTime;
    
    // Calcular tiempo restante inicial
    let remainingTime = calculateTimeRemaining(nextDrawTime);
    callback([], remainingTime);
    
    // Actualizar cada segundo
    clientInterval = window.setInterval(() => {
      remainingTime = calculateTimeRemaining(nextDrawTime);
      callback([], remainingTime);
      
      // Si llegamos a cero, no necesitamos seguir actualizando
      if (remainingTime <= 0 && clientInterval) {
        clearInterval(clientInterval);
        clientInterval = null;
      }
    }, 1000);
  };
  
  // Suscribirse a cambios en Firestore
  const unsubscribe = onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const winningNumbers = data.winningNumbers || [];
    const nextDrawTime = data.nextDrawTime?.toMillis() || Date.now() + 60000;
    
    // Solo configurar un nuevo intervalo si el tiempo de sorteo ha cambiado
    if (nextDrawTime !== lastNextDrawTime) {
      setupInterval(nextDrawTime);
    }
    
    // Notificar con los números ganadores y el tiempo restante actual
    const timeRemaining = calculateTimeRemaining(nextDrawTime);
    callback(winningNumbers, timeRemaining);
    
    console.log(`Estado del juego actualizado: ${winningNumbers.join(' ')} - Próximo sorteo en ${timeRemaining} segundos`);
  }, (error) => {
    console.error('Error subscribing to game state:', error);
    callback([], 60);
  });
  
  // Función de limpieza
  return () => {
    unsubscribe();
    if (clientInterval) {
      clearInterval(clientInterval);
      clientInterval = null;
    }
  };
}; 