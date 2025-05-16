import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Script para crear la colección de tickets en Firestore
 * Este script inicializa la estructura y añade algunos tickets de ejemplo
 */

// Constantes
const TICKETS_COLLECTION = 'tickets';
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

// Función principal para crear la colección de tickets
async function createTicketsCollection() {
  try {
    console.log('Iniciando creación de la colección de tickets...');
    
    // 1. Crear la colección de tickets con tickets de ejemplo
    const ticketsCollectionRef = collection(db, TICKETS_COLLECTION);
    
    for (const ticketData of EXAMPLE_TICKETS) {
      // Añadir timestamp de servidor
      const fullTicketData = {
        ...ticketData,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };
      
      const ticketRef = await addDoc(ticketsCollectionRef, fullTicketData);
      console.log(`Ticket de ejemplo creado con ID: ${ticketRef.id}`);
    }
    
    // 2. Actualizar el estado del juego
    await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers: [],
      nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
      lastUpdated: new Date()
    });
    
    console.log('Estado del juego actualizado');
    console.log('Creación completada con éxito');
    
    return { success: true };
  } catch (error) {
    console.error('Error durante la creación de la colección de tickets:', error);
    return { success: false, error };
  }
}

// Ejecutar la creación
createTicketsCollection().then(result => {
  if (result.success) {
    console.log('✅ La colección de tickets ha sido creada correctamente');
  } else {
    console.error('❌ Ocurrió un error al crear la colección de tickets:', result.error);
  }
}); 