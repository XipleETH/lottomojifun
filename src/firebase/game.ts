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
  return {
    id: doc.id,
    timestamp: data.timestamp?.toMillis() || Date.now(),
    winningNumbers: data.winningNumbers || [],
    firstPrize: data.firstPrize || [],
    secondPrize: data.secondPrize || [],
    thirdPrize: data.thirdPrize || []
  };
};

// Convertir documento de Firestore a nuestro tipo de ticket
const mapFirestoreTicket = (doc: any): Ticket => {
  const data = doc.data();
  return {
    id: doc.id,
    numbers: data.numbers || [],
    timestamp: data.timestamp?.toMillis() || Date.now(),
    userId: data.userId
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
    
    const ticketData = {
      numbers,
      timestamp: serverTimestamp(),
      userId: user?.id || 'anonymous'
    };
    
    const ticketRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    
    return {
      id: ticketRef.id,
      numbers,
      timestamp: Date.now(),
      userId: user?.id || 'anonymous'
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
    callback([]);
    return () => {};
  }
  
  const ticketsQuery = query(
    collection(db, TICKETS_COLLECTION),
    where('userId', '==', user.id),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(ticketsQuery, (snapshot) => {
    const tickets = snapshot.docs.map(mapFirestoreTicket);
    callback(tickets);
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
  });
}; 