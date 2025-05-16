// Script para listar tickets de usuario o todos los tickets en la colección
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query,
  where, 
  getDocs,
  orderBy,
  limit,
  doc, 
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
const MAX_TICKETS = 20; // Máximo número de tickets a mostrar

// Función para obtener el nombre de la colección de tickets activa
const getTicketsCollectionName = async () => {
  try {
    const stateDoc = await getDoc(doc(db, 'game_state', GAME_STATE_DOC));
    const data = stateDoc.data();
    
    // Usar la colección especificada en el estado del juego o la predeterminada
    return data?.ticketsCollection || TICKETS_COLLECTION;
  } catch (error) {
    console.error('Error obteniendo nombre de colección de tickets:', error);
    return TICKETS_COLLECTION;
  }
};

// Función para formatear la fecha y hora
const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Desconocido';
  
  let date;
  if (timestamp.toDate) {
    // Es un timestamp de Firestore
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    // Es un objeto con segundos
    date = new Date(timestamp.seconds * 1000);
  } else {
    // Es un valor numérico
    date = new Date(timestamp);
  }
  
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Función para listar los tickets
const listTickets = async (userId = null) => {
  try {
    console.log('Obteniendo tickets...');
    
    // Obtener el nombre de la colección de tickets activa
    const ticketsCollection = await getTicketsCollectionName();
    console.log(`Usando colección de tickets: ${ticketsCollection}`);
    
    let q;
    if (userId) {
      // Consulta para un usuario específico (sin ordenar para evitar necesidad de índice)
      q = query(
        collection(db, ticketsCollection),
        where('userId', '==', userId),
        limit(MAX_TICKETS)
      );
      console.log(`Buscando tickets para el usuario: ${userId}`);
    } else {
      // Consulta para todos los tickets
      q = query(
        collection(db, ticketsCollection),
        orderBy('timestamp', 'desc'),
        limit(MAX_TICKETS)
      );
      console.log('Buscando todos los tickets');
    }
    
    const ticketsSnapshot = await getDocs(q);
    
    if (ticketsSnapshot.empty) {
      console.log('No se encontraron tickets.');
      return [];
    }
    
    console.log(`Se encontraron ${ticketsSnapshot.size} tickets.`);
    
    // Procesar los tickets
    const tickets = ticketsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        numbers: data.numbers || [],
        timestamp: data.timestamp,
        formattedTime: formatDateTime(data.timestamp),
        userId: data.userId || 'desconocido',
        username: data.username || 'Usuario Desconocido',
        walletAddress: data.walletAddress || 'N/A',
        fid: data.fid || 0
      };
    });
    
    // Mostrar los tickets en formato tabular
    console.log('\n==== TICKETS ENCONTRADOS ====');
    console.log('ID | EMOJIS | USUARIO | FECHA | WALLET');
    console.log('--------------------------------------------------------');
    
    tickets.forEach(ticket => {
      const shortId = ticket.id.substring(0, 6) + '...';
      const shortWallet = ticket.walletAddress.substring(0, 8) + '...';
      console.log(`${shortId} | ${ticket.numbers.join(' ')} | ${ticket.username} | ${ticket.formattedTime} | ${shortWallet}`);
    });
    
    console.log('--------------------------------------------------------');
    
    return tickets;
  } catch (error) {
    console.error('Error listando tickets:', error);
    return [];
  }
};

// Función principal
const main = async () => {
  // Obtener argumentos de la línea de comandos
  const args = process.argv.slice(2);
  let userId = null;
  
  if (args.length > 0) {
    userId = args[0];
    console.log(`Buscando tickets para el usuario: ${userId}`);
  } else {
    console.log('Listando todos los tickets (limitado a los más recientes)');
  }
  
  await listTickets(userId);
};

// Ejecutar la función principal
main()
  .then(() => {
    console.log('\nProceso finalizado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nError no controlado:', error);
    process.exit(1);
  }); 