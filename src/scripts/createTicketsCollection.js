// Importamos los módulos necesarios de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Importamos las variables de entorno de forma dinámica
const env = import.meta.env || {};

// Configuración de Firebase usando variables de entorno
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_MEASURAMENT_ID
};

// Inicializar Firebase
console.log('Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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