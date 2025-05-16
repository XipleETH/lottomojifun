import { db } from './config';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  serverTimestamp,
  getDocs,
  query,
  limit,
  getDoc
} from 'firebase/firestore';

// Constantes
const DEFAULT_TICKETS_COLLECTION = 'player_tickets'; // Actualizado a la nueva colección
const GAME_STATE_DOC = 'current_game_state';

// Tickets de ejemplo (pueden ser modificados según necesidades)
const EXAMPLE_TICKETS = [
  {
    numbers: ['😀', '😎', '🎮', '🎲'],
    userId: 'sistema',
    username: 'Sistema',
    walletAddress: '0x0000000000000000000000000000000000000000',
    fid: 0,
    isFarcasterUser: false,
    ticketHash: 'sistema-ejemplo-1',
    verifiedWallet: false,
    chainId: 10
  },
  {
    numbers: ['🔥', '💰', '🎁', '🎯'],
    userId: 'sistema',
    username: 'Sistema',
    walletAddress: '0x0000000000000000000000000000000000000000',
    fid: 0,
    isFarcasterUser: false,
    ticketHash: 'sistema-ejemplo-2',
    verifiedWallet: false,
    chainId: 10
  }
];

// Función para obtener el nombre de la colección de tickets activa
export const getTicketsCollectionName = async (): Promise<string> => {
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

/**
 * Verifica si la colección de tickets existe y tiene datos
 * @returns Promise<boolean> - true si la colección existe y tiene documentos
 */
export const ticketsCollectionExists = async (): Promise<boolean> => {
  try {
    // Obtener el nombre de la colección de tickets activa
    const ticketsCollection = await getTicketsCollectionName();
    
    // Intentar obtener algunos documentos de la colección
    const ticketsQuery = query(collection(db, ticketsCollection), limit(1));
    const snapshot = await getDocs(ticketsQuery);
    
    // Si hay al menos un documento, la colección existe y tiene datos
    return !snapshot.empty;
  } catch (error) {
    console.error('Error verificando la colección de tickets:', error);
    return false;
  }
};

/**
 * Inicializa la colección de tickets con tickets de ejemplo
 * @returns Promise<boolean> - true si la inicialización fue exitosa
 */
export const initializeTicketsCollection = async (): Promise<boolean> => {
  try {
    // Obtener el nombre de la colección de tickets activa
    const ticketsCollection = await getTicketsCollectionName();
    console.log(`Inicializando colección de tickets: ${ticketsCollection}...`);
    
    // Verificar si la colección ya existe y tiene datos
    const exists = await ticketsCollectionExists();
    if (exists) {
      console.log(`La colección ${ticketsCollection} ya existe y tiene datos. No se inicializará.`);
      return true;
    }
    
    // 1. Crear la colección de tickets con tickets de ejemplo
    const ticketsCollectionRef = collection(db, ticketsCollection);
    
    for (const ticketData of EXAMPLE_TICKETS) {
      // Añadir timestamp de servidor
      const fullTicketData = {
        ...ticketData,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };
      
      const ticketRef = await addDoc(ticketsCollectionRef, fullTicketData);
      console.log(`Ticket de ejemplo creado con ID: ${ticketRef.id} en ${ticketsCollection}`);
    }
    
    // 2. Actualizar el estado del juego
    await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers: [],
      nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
      lastUpdated: new Date(),
      ticketsCollection: ticketsCollection // Guardar el nombre de la colección activa
    }, { merge: true });
    
    console.log('Estado del juego actualizado con la colección de tickets activa');
    console.log(`✅ Inicialización de la colección ${ticketsCollection} completada con éxito`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error durante la inicialización de la colección de tickets:`, error);
    return false;
  }
}; 