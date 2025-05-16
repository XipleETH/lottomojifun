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

// Generar un ticket
export const generateTicket = async (numbers: string[]): Promise<Ticket | null> => {
  try {
    const user = await getCurrentUser();
    
    // Verificar que el usuario esté autenticado con Farcaster
    if (!user || !user.isFarcasterUser) {
      console.error('Error generating ticket: User is not authenticated with Farcaster');
      return null;
    }
    
    // Verificar que el usuario tenga una billetera
    if (!user.walletAddress) {
      console.error('Error generating ticket: User does not have a wallet address');
      return null;
    }
    
    // En el futuro, aquí podríamos verificar el balance de tokens antes de generar ticket
    // if (parseFloat(user.tokenBalance || "0") < TICKET_PRICE) {
    //   console.error('Error generating ticket: Insufficient token balance');
    //   return null;
    // }
    
    // Generar un hash único para el ticket (simulado)
    const uniqueHash = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Incluir información detallada de Farcaster en el ticket
    const ticketData = {
      numbers,
      timestamp: serverTimestamp(),
      userId: user.id,
      username: user.username || 'usuario',
      walletAddress: user.walletAddress,
      fid: user.fid || 0,
      isFarcasterUser: true,
      verifiedWallet: user.verifiedWallet || false,
      chainId: user.chainId || 10, // Optimism por defecto
      // En el futuro, aquí se incluiría información de la transacción blockchain
      // txHash: "",
      ticketHash: uniqueHash,
      createdAt: new Date().toISOString() // Campo adicional para diagnóstico y backup
    };
    
    // Crear referencia a la colección de tickets (esto creará la colección si no existe)
    const ticketsCollectionRef = collection(db, TICKETS_COLLECTION);
    
    // Intentar añadir el documento con reintento
    let ticketRef;
    let retries = 3;
    
    while (retries > 0) {
      try {
        ticketRef = await addDoc(ticketsCollectionRef, ticketData);
        break; // Si tiene éxito, salir del bucle
      } catch (addError) {
        console.error(`Error al añadir ticket (intento ${4-retries}/3):`, addError);
        retries--;
        
        if (retries === 0) {
          throw new Error(`No se pudo crear el ticket después de 3 intentos: ${addError}`);
        }
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!ticketRef) {
      throw new Error('No se pudo crear la referencia del ticket');
    }
    
    // Simular una transacción en la blockchain (en el futuro esto sería real)
    console.log(`Ticket creado con ID: ${ticketRef.id} para el usuario de Farcaster ${user.username || 'usuario'} (FID: ${user.fid}, Wallet: ${user.walletAddress})`);
    
    // Devolver el ticket creado
    return {
      id: ticketRef.id,
      numbers,
      timestamp: Date.now(),
      userId: user.id,
      walletAddress: user.walletAddress,
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
    console.log('[subscribeToUserTickets] Configurando suscripción a tickets...');
    
    // Variable para almacenar la función de unsubscribe
    let unsubscribeFunc = () => {};
    
    // Primero obtenemos el usuario actual como promesa
    const userPromise = getCurrentUser().then(user => {
      if (!user) {
        console.warn('[subscribeToUserTickets] No hay usuario autenticado, no se pueden obtener tickets');
        callback([]);
        return null;
      }
      
      console.log(`[subscribeToUserTickets] Usuario encontrado (ID: ${user.id}), configurando consulta de tickets`);
      
      try {
        // Crear la colección si no existe (esto no hace nada si ya existe)
        const ticketsCollectionRef = collection(db, TICKETS_COLLECTION);
        
        const ticketsQuery = query(
          ticketsCollectionRef,
          where('userId', '==', user.id),
          orderBy('timestamp', 'desc')
        );
        
        // Configurar la suscripción con manejo de errores
        const unsubscribe = onSnapshot(ticketsQuery, 
          (snapshot) => {
            try {
              console.log(`[subscribeToUserTickets] Snapshot recibido: ${snapshot.docs.length} tickets`);
              
              const tickets = snapshot.docs.map(doc => {
                try {
                  return mapFirestoreTicket(doc);
                } catch (error) {
                  console.error('[subscribeToUserTickets] Error al mapear ticket:', error, doc.id);
                  return null;
                }
              }).filter(ticket => ticket !== null) as Ticket[];
              
              callback(tickets);
            } catch (error) {
              console.error('[subscribeToUserTickets] Error al procesar snapshot:', error);
              callback([]);
            }
          }, 
          (error) => {
            console.error('[subscribeToUserTickets] Error en la suscripción:', error);
            
            // Si el error es que la colección no existe, devolver una lista vacía
            if (error.code === 'permission-denied' || error.code === 'not-found') {
              console.log('[subscribeToUserTickets] Colección no encontrada o sin permisos, devolviendo lista vacía');
              callback([]);
            } else {
              // Para otros errores, intentar recrear la suscripción después de un retraso
              setTimeout(() => {
                console.log('[subscribeToUserTickets] Reintentando suscripción después de error...');
                // Aquí podríamos implementar un nuevo intento, pero por ahora solo mostrar un mensaje
              }, 5000);
            }
          }
        );
        
        // Guardar la función de unsubscribe
        unsubscribeFunc = unsubscribe;
        return unsubscribe;
      } catch (queryError) {
        console.error('[subscribeToUserTickets] Error al configurar consulta:', queryError);
        callback([]);
        return null;
      }
    }).catch(error => {
      console.error('[subscribeToUserTickets] Error al obtener usuario actual:', error);
      callback([]);
      return null;
    });
    
    // Devolver una función de unsubscribe que espera a que se resuelva la promesa
    return () => {
      console.log('[subscribeToUserTickets] Limpiando suscripción');
      unsubscribeFunc();
    };
  } catch (error) {
    console.error('[subscribeToUserTickets] Error general al configurar suscripción:', error);
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