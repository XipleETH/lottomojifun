// Script para inicializar la colección player_tickets en Firebase
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  serverTimestamp 
} = require('firebase/firestore');

// Configuración de Firebase (reemplazar con tus credenciales)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constantes
const PLAYER_TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_DOC = 'current_game_state';

// Tickets de ejemplo (pueden ser modificados según necesidades)
const EXAMPLE_TICKETS = [
  {
    numbers: ['🌟', '🎈', '🎨', '🌈'],
    userId: 'sistema',
    username: 'Sistema',
    walletAddress: '0x0000000000000000000000000000000000000000',
    fid: 0,
    isFarcasterUser: false,
    ticketHash: 'sistema-player-1',
    verifiedWallet: false,
    chainId: 10
  },
  {
    numbers: ['🦄', '🍭', '🎪', '🎠'],
    userId: 'sistema',
    username: 'Sistema',
    walletAddress: '0x0000000000000000000000000000000000000000',
    fid: 0,
    isFarcasterUser: false,
    ticketHash: 'sistema-player-2',
    verifiedWallet: false,
    chainId: 10
  },
  {
    numbers: ['🎡', '🎢', '🌺', '🦋'],
    userId: 'sistema',
    username: 'Sistema',
    walletAddress: '0x0000000000000000000000000000000000000000',
    fid: 0,
    isFarcasterUser: false,
    ticketHash: 'sistema-player-3',
    verifiedWallet: false,
    chainId: 10
  }
];

// Función principal para crear la colección de tickets
async function createPlayerTicketsCollection() {
  try {
    console.log('Iniciando creación de la colección player_tickets...');
    
    // 1. Crear la colección de tickets con tickets de ejemplo
    const ticketsCollectionRef = collection(db, PLAYER_TICKETS_COLLECTION);
    
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
    
    // 2. Actualizar el estado del juego (solo si no se ha migrado aún)
    try {
      await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
        winningNumbers: [],
        nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
        lastUpdated: new Date(),
        ticketsCollection: PLAYER_TICKETS_COLLECTION // Añadir referencia a la nueva colección
      }, { merge: true });
      
      console.log('Estado del juego actualizado con la nueva colección de tickets');
    } catch (gameStateError) {
      console.error('Error actualizando el estado del juego:', gameStateError);
    }
    
    console.log('Creación completada con éxito');
    
    return { success: true };
  } catch (error) {
    console.error('Error durante la creación de la colección player_tickets:', error);
    return { success: false, error };
  }
}

// Ejecutar la función principal
createPlayerTicketsCollection()
  .then(result => {
    console.log('Resultado:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error no controlado:', error);
    process.exit(1);
  }); 