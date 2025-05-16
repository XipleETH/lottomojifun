import { db } from './config';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
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
const DEFAULT_TICKETS_COLLECTION = 'player_tickets'; // Cambiado a player_tickets por defecto
const GAME_STATE_DOC = 'current_game_state';
const RESULTS_LIMIT = 50;

// Función para obtener el nombre de la colección de tickets activa
const getTicketsCollectionName = async (): Promise<string> => {
  try {
    const stateDoc = await getDoc(doc(db, 'game_state', GAME_STATE_DOC));
    const data = stateDoc.data();
    
    // Usar la colección especificada en el estado del juego o la predeterminada
    return data?.ticketsCollection || DEFAULT_TICKETS_COLLECTION;
  } catch (error) {
    console.error('Error obteniendo nombre de colección de tickets:', error);
    return DEFAULT_TICKETS_COLLECTION;
  }
};

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

// Generar un ticket
export const generateTicket = async (numbers: string[]): Promise<Ticket | null> => {
  try {
    const user = await getCurrentUser();
    
    // Verificar que el usuario esté autenticado con Farcaster
    if (!user || !user.isFarcasterUser) {
      console.error('Error generating ticket: User is not authenticated with Farcaster');
      return null;
    }
    
    // Ya no requerimos billetera obligatoria - usamos una dirección genérica en su lugar
    const walletAddress = user.walletAddress || `0x${user.id.replace('farcaster-', '')}`; 
    
    // Verificar que los números sean exactamente 4 emojis
    if (!numbers || numbers.length !== 4) {
      console.error('Error generating ticket: Invalid numbers (must be exactly 4 emojis)');
      return null;
    }
    
    // Obtener el nombre de la colección de tickets activa
    const ticketsCollection = await getTicketsCollectionName();
    console.log(`Usando colección de tickets: ${ticketsCollection}`);
    
    // Generar un hash único para el ticket (simulado)
    const uniqueHash = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Incluir información detallada de Farcaster en el ticket
    const ticketData = {
      numbers,
      timestamp: serverTimestamp(),
      userId: user.id,
      username: user.username,
      walletAddress: walletAddress,
      fid: user.fid || 0,
      isFarcasterUser: true,
      verifiedWallet: user.verifiedWallet || false,
      chainId: user.chainId || 10, // Optimism por defecto
      ticketHash: uniqueHash,
      createdAt: new Date().toISOString()
    };
    
    // Guardar el ticket en Firestore
    const ticketRef = await addDoc(collection(db, ticketsCollection), ticketData);
    
    console.log(`Ticket creado con ID: ${ticketRef.id} para el usuario de Farcaster ${user.username} (FID: ${user.fid}, Wallet: ${walletAddress})`);
    console.log(`Emojis seleccionados: ${numbers.join(' ')}`);
    
    // Devolver el ticket creado
    return {
      id: ticketRef.id,
      numbers,
      timestamp: Date.now(),
      userId: user.id,
      walletAddress: walletAddress,
      fid: user.fid
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
    // Primero obtenemos el usuario actual como promesa
    getCurrentUser().then(async user => {
      if (!user) {
        callback([]);
        return () => {};
      }
      
      // Obtener el nombre de la colección de tickets activa
      const ticketsCollection = await getTicketsCollectionName();
      console.log(`[subscribeToUserTickets] Usando colección de tickets: ${ticketsCollection}`);
      
      const ticketsQuery = query(
        collection(db, ticketsCollection),
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
    }).catch(error => {
      console.error('Error getting current user or tickets collection:', error);
      callback([]);
      return () => {};
    });
    
    // Devolver una función de unsubscribe temporal
    return () => {
      // Esta función será reemplazada cuando se resuelva la promesa
    };
  } catch (error) {
    console.error('Error setting up user tickets subscription:', error);
    callback([]);
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