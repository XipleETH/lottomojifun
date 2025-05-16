// Script para crear un ticket de usuario con 4 emojis seleccionados en player_tickets
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  serverTimestamp
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

// Lista de emojis disponibles para seleccionar
const AVAILABLE_EMOJIS = [
  '😀', '😎', '🎮', '🎲', '🔥', '💰', '🎁', '🎯',
  '🦄', '🍭', '🎪', '🎠', '🌟', '🎈', '🎨', '🌈',
  '🍕', '🍦', '🍺', '🍹', '🚀', '🏆', '💎', '🎵',
  '🎬', '📱', '💻', '🌍', '🏖️', '🐬', '🦁', '🐢'
];

// Función para crear un ticket con los emojis seleccionados
const createUserTicket = async (userId, username, emojis) => {
  try {
    // Verificar que se hayan seleccionado exactamente 4 emojis
    if (!emojis || emojis.length !== 4) {
      throw new Error('Debes seleccionar exactamente 4 emojis');
    }
    
    // Verificar que todos los emojis seleccionados son válidos
    if (!emojis.every(emoji => AVAILABLE_EMOJIS.includes(emoji))) {
      throw new Error('Uno o más emojis seleccionados no son válidos');
    }
    
    // Obtener el nombre de la colección de tickets activa
    const ticketsCollection = await getTicketsCollectionName();
    console.log(`Usando colección de tickets: ${ticketsCollection}`);
    
    // Generar un hash único para el ticket (simulado)
    const uniqueHash = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Crear el objeto de datos del ticket
    const ticketData = {
      numbers: emojis,
      timestamp: serverTimestamp(),
      userId: userId,
      username: username,
      walletAddress: '0x' + userId.padStart(40, '0'), // Simulamos una dirección de wallet
      fid: 0,
      isFarcasterUser: false,
      verifiedWallet: false,
      chainId: 10,
      ticketHash: uniqueHash,
      createdAt: new Date().toISOString()
    };
    
    // Guardar el ticket en Firestore
    const ticketRef = await addDoc(collection(db, ticketsCollection), ticketData);
    
    console.log(`Ticket creado con ID: ${ticketRef.id} para el usuario ${username}`);
    
    return {
      success: true,
      ticketId: ticketRef.id,
      emojis,
      userId,
      username
    };
  } catch (error) {
    console.error('Error creando ticket:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Función principal para probar la creación de tickets
const main = async () => {
  // Puedes cambiar estos valores para probar
  const userId = 'usuario_prueba';
  const username = 'Usuario de Prueba';
  
  // Estos son los emojis que el usuario ha seleccionado
  // Puedes cambiarlos para probar diferentes combinaciones
  const selectedEmojis = ['🦄', '🎁', '🎵', '🐬'];
  
  console.log('Creando ticket con los siguientes emojis:', selectedEmojis);
  
  const result = await createUserTicket(userId, username, selectedEmojis);
  
  console.log('Resultado:', result);
  
  return result;
};

// Ejecutar la función principal
main()
  .then(result => {
    console.log('Proceso completado:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error no controlado:', error);
    process.exit(1);
  }); 