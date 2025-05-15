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
  
  return onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const winningNumbers = data.winningNumbers || [];
    const nextDrawTime = data.nextDrawTime?.toMillis() || Date.now() + 60000;
    const timeRemaining = Math.max(0, Math.floor((nextDrawTime - Date.now()) / 1000));
    
    callback(winningNumbers, timeRemaining);
  }, (error) => {
    console.error('Error subscribing to game state:', error);
    callback([], 60);
  });
}; 