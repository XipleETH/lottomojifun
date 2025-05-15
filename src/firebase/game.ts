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
  Timestamp,
  getDocs
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
    thirdPrize: data.thirdPrize || [],
    freePrize: data.freePrize || []
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
    console.log('Guardando resultado en Firebase:', result);
    
    // Verificar si ya existe un resultado para este mismo instante de tiempo
    if (result.timestamp) {
      const date = new Date(result.timestamp);
      const minuteKey = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
      
      // Verificar si ya existe un resultado para este minuto
      const existingResultsQuery = query(
        collection(db, GAME_RESULTS_COLLECTION),
        where('minuteKey', '==', minuteKey),
        limit(1)
      );
      
      const existingResults = await getDocs(existingResultsQuery);
      
      if (!existingResults.empty) {
        const existingDoc = existingResults.docs[0];
        console.log(`Ya existe un resultado para el minuto ${minuteKey} con ID: ${existingDoc.id}. No se guardará otro.`);
        return existingDoc.id;
      }
    }
    
    // Preparar objetos de ticket para Firestore (evitar errores de serialización)
    const prepareTickets = (tickets: Ticket[]) => {
      return tickets.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers || [],
        timestamp: typeof ticket.timestamp === 'number' ? ticket.timestamp : Date.now(),
        userId: ticket.userId || 'anonymous'
      }));
    };

    // Verificar que los tickets estén definidos
    const firstPrize = Array.isArray(result.firstPrize) ? result.firstPrize : [];
    const secondPrize = Array.isArray(result.secondPrize) ? result.secondPrize : [];
    const thirdPrize = Array.isArray(result.thirdPrize) ? result.thirdPrize : [];
    const freePrize = Array.isArray(result.freePrize) ? result.freePrize : [];

    // Generar un ID para el documento
    const docId = result.id || crypto.randomUUID();

    const resultData = {
      timestamp: serverTimestamp(),
      dateTime: new Date().toISOString(), // Añadir una fecha legible como respaldo
      winningNumbers: Array.isArray(result.winningNumbers) ? result.winningNumbers : [],
      firstPrize: prepareTickets(firstPrize),
      secondPrize: prepareTickets(secondPrize),
      thirdPrize: prepareTickets(thirdPrize),
      freePrize: prepareTickets(freePrize),
      // Añadir la clave del minuto para facilitar la detección de duplicados
      minuteKey: result.timestamp ? 
        `${new Date(result.timestamp).getFullYear()}-${new Date(result.timestamp).getMonth()+1}-${new Date(result.timestamp).getDate()}-${new Date(result.timestamp).getHours()}-${new Date(result.timestamp).getMinutes()}` :
        `${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}-${new Date().getHours()}-${new Date().getMinutes()}`
    };
    
    console.log('Datos preparados para Firestore:', resultData);
    
    // Usar setDoc en lugar de addDoc
    await setDoc(doc(db, GAME_RESULTS_COLLECTION, docId), resultData);
    console.log('Documento creado en Firestore con ID:', docId);
    
    return docId;
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
  try {
    console.log('[subscribeToGameResults] Configurando suscripción a resultados del juego');
    
    // Usar un mapa para evitar resultados duplicados en el mismo minuto
    const resultsByMinute = new Map<string, GameResult>();
    
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(RESULTS_LIMIT)
    );
    
    return onSnapshot(resultsQuery, (snapshot) => {
      try {
        // Registrar los cambios para diagnóstico
        if (snapshot.docChanges().length > 0) {
          console.log(`[subscribeToGameResults] Cambios detectados: ${snapshot.docChanges().length} documentos`);
          
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              console.log(`[subscribeToGameResults] Documento añadido: ${change.doc.id}`);
            } else if (change.type === 'modified') {
              console.log(`[subscribeToGameResults] Documento modificado: ${change.doc.id}`);
            }
          });
        }
        
        // Procesar todos los documentos - primero almacenarlos por ID para quitar duplicados explícitos
        const resultsById = new Map<string, GameResult>();
        snapshot.docs.forEach(doc => {
          try {
            const result = mapFirestoreGameResult(doc);
            resultsById.set(doc.id, result);
          } catch (error) {
            console.error(`[subscribeToGameResults] Error mapeando documento ${doc.id}:`, error);
          }
        });
        
        // Después agrupar por minuto para eliminar duplicados por tiempo
        const results: GameResult[] = [];
        
        resultsById.forEach(result => {
          // Obtener clave de minuto para agrupar resultados
          const date = new Date(result.timestamp);
          const minuteKey = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          
          // Para duplicados por minuto, quedarnos con el resultado más reciente
          const existingResult = resultsByMinute.get(minuteKey);
          
          if (!existingResult || existingResult.id < result.id) {
            resultsByMinute.set(minuteKey, result);
          }
        });
        
        // Convertir el mapa a un array
        results.push(...resultsByMinute.values());
        
        // Ordenar por timestamp (más reciente primero)
        results.sort((a, b) => b.timestamp - a.timestamp);
        
        // Mostrar un log de diagnóstico
        if (results.length > 0) {
          console.log(`[subscribeToGameResults] Procesados ${results.length} resultados únicos (por minuto) de ${resultsById.size} documentos totales`);
        }
        
        callback(results);
      } catch (error) {
        console.error('[subscribeToGameResults] Error procesando snapshot:', error);
        callback([]);
      }
    }, (error) => {
      console.error('[subscribeToGameResults] Error en suscripción:', error);
      callback([]);
    });
  } catch (error) {
    console.error('[subscribeToGameResults] Error configurando suscripción:', error);
    return () => {}; // Unsubscribe no-op
  }
};

// Suscribirse a los tickets del usuario actual
export const subscribeToUserTickets = (
  callback: (tickets: Ticket[]) => void
) => {
  try {
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
      try {
        const tickets = snapshot.docs.map(doc => {
          try {
            return mapFirestoreTicket(doc);
          } catch (error) {
            console.error('Error mapping ticket document:', error, doc.id);
            return null;
          }
        }).filter(ticket => ticket !== null) as Ticket[];
        
        callback(tickets);
      } catch (error) {
        console.error('Error processing tickets snapshot:', error);
        callback([]);
      }
    }, (error) => {
      console.error('Error in subscribeToUserTickets:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Error setting up user tickets subscription:', error);
    return () => {}; // Unsubscribe no-op
  }
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