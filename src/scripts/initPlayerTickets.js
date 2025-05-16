// Script para inicializar la nueva colección player_tickets
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

// Configuración de Firebase con credenciales reales
const firebaseConfig = {
  apiKey: "AIzaSyAAKC-5_WtcdggxiLnpu-dtHjl9e1Ox9Eo",
  authDomain: "lottomojifun.firebaseapp.com",
  projectId: "lottomojifun",
  storageBucket: "lottomojifun.appspot.com",
  messagingSenderId: "1052272341456",
  appId: "1:1052272341456:web:9fc1d39c8ad347c42c5507"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constantes
const TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_DOC = 'current_game_state';

// Tickets de ejemplo de diferentes estilos (pueden ser modificados según necesidades)
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
    numbers: ['😀', '😎', '🎮', '🎲'],
    userId: 'sistema',
    username: 'Sistema',
    walletAddress: '0x0000000000000000000000000000000000000000',
    fid: 0,
    isFarcasterUser: false,
    ticketHash: 'sistema-player-3',
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
    ticketHash: 'sistema-player-4',
    verifiedWallet: false,
    chainId: 10
  }
];

// Función principal para inicializar la colección player_tickets
async function initializePlayerTickets() {
  try {
    console.log('Iniciando inicialización de la colección player_tickets...');
    
    // 1. Verificar si existen tickets en la colección (evitar duplicados)
    const checkFirstTicket = async () => {
      try {
        const gameStateRef = doc(db, 'game_state', GAME_STATE_DOC);
        const gameStateDoc = await getDoc(gameStateRef);
        
        if (gameStateDoc.exists()) {
          const data = gameStateDoc.data();
          console.log('Estado de juego existente:', data);
          
          // Verificar si la colección ya está configurada correctamente
          if (data.ticketsCollection === TICKETS_COLLECTION && data.initialized) {
            console.log('La colección ya está configurada correctamente en el estado del juego.');
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.error('Error verificando estado del juego:', error);
        return false;
      }
    };
    
    const isAlreadyInitialized = await checkFirstTicket();
    if (isAlreadyInitialized) {
      console.log('La colección player_tickets ya está inicializada. No se crearán tickets de ejemplo duplicados.');
      return { success: true, created: 0 };
    }
    
    // 2. Crear tickets de ejemplo
    const ticketsCollectionRef = collection(db, TICKETS_COLLECTION);
    const createdTickets = [];
    
    for (const ticketData of EXAMPLE_TICKETS) {
      // Añadir timestamp de servidor
      const fullTicketData = {
        ...ticketData,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };
      
      const ticketRef = await addDoc(ticketsCollectionRef, fullTicketData);
      console.log(`Ticket de ejemplo creado con ID: ${ticketRef.id}`);
      createdTickets.push(ticketRef.id);
    }
    
    // 3. Actualizar el estado del juego
    const gameStateRef = doc(db, 'game_state', GAME_STATE_DOC);
    const gameStateDoc = await getDoc(gameStateRef);
    
    if (gameStateDoc.exists()) {
      // Actualizar el documento existente
      await setDoc(gameStateRef, {
        ticketsCollection: TICKETS_COLLECTION,
        initialized: true,
        initDate: new Date().toISOString()
      }, { merge: true });
    } else {
      // Crear documento nuevo
      await setDoc(gameStateRef, {
        ticketsCollection: TICKETS_COLLECTION,
        winningNumbers: [],
        nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
        initialized: true,
        initDate: new Date().toISOString()
      });
    }
    
    console.log('Estado del juego actualizado con la colección player_tickets');
    console.log('Inicialización completada con éxito');
    
    return { success: true, created: createdTickets.length, ticketIds: createdTickets };
  } catch (error) {
    console.error('Error durante la inicialización de player_tickets:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar la función principal
initializePlayerTickets()
  .then(result => {
    console.log('Resultado:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error no controlado:', error);
    process.exit(1);
  }); 