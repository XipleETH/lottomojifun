// Script interactivo para crear un ticket seleccionando emojis en la terminal
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import readline from 'readline';

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

// Crear interfaz de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para hacer preguntas al usuario y obtener respuestas
const pregunta = (texto) => {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta.trim());
    });
  });
};

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

// Función para mostrar los emojis disponibles con índices
const mostrarEmojisDisponibles = () => {
  console.log('\nEmojis disponibles:');
  AVAILABLE_EMOJIS.forEach((emoji, index) => {
    const numeroEmoji = (index + 1).toString().padStart(2, '0');
    process.stdout.write(`${numeroEmoji}: ${emoji}  `);
    if ((index + 1) % 8 === 0) console.log(''); // Nueva línea cada 8 emojis
  });
  console.log('\n');
};

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

// Función principal interactiva
const main = async () => {
  try {
    console.log('=== Creación de Ticket de Lotería LottoMoji ===');
    
    // Solicitar información del usuario
    const userId = await pregunta('Ingresa tu ID de usuario: ');
    const username = await pregunta('Ingresa tu nombre de usuario: ');
    
    // Mostrar emojis disponibles
    mostrarEmojisDisponibles();
    
    // Solicitar selección de emojis
    console.log('Selecciona 4 emojis por su número (1-32):');
    const selectedEmojisIndices = [];
    
    for (let i = 1; i <= 4; i++) {
      const seleccion = await pregunta(`Emoji ${i}/4: `);
      const indice = parseInt(seleccion) - 1;
      
      if (isNaN(indice) || indice < 0 || indice >= AVAILABLE_EMOJIS.length) {
        console.log('Número inválido. Intenta de nuevo.');
        i--; // Repetir esta iteración
      } else {
        selectedEmojisIndices.push(indice);
        console.log(`Seleccionado: ${AVAILABLE_EMOJIS[indice]}`);
      }
    }
    
    // Convertir índices a emojis
    const selectedEmojis = selectedEmojisIndices.map(indice => AVAILABLE_EMOJIS[indice]);
    
    // Confirmar selección
    console.log('\nHas seleccionado los siguientes emojis:');
    console.log(selectedEmojis.join(' '));
    
    const confirmacion = await pregunta('¿Confirmar la creación del ticket? (s/n): ');
    
    if (confirmacion.toLowerCase() === 's') {
      console.log('Creando ticket...');
      const result = await createUserTicket(userId, username, selectedEmojis);
      
      if (result.success) {
        console.log('\n¡Ticket creado con éxito!');
        console.log('ID del ticket:', result.ticketId);
        console.log('Emojis seleccionados:', result.emojis.join(' '));
      } else {
        console.log('\nError al crear el ticket:', result.error);
      }
    } else {
      console.log('Creación de ticket cancelada.');
    }
  } catch (error) {
    console.error('Error en el proceso interactivo:', error);
  } finally {
    rl.close();
  }
};

// Ejecutar la función principal
main()
  .then(() => {
    console.log('\nProceso finalizado.');
    setTimeout(() => process.exit(0), 1000); // Dar tiempo para que las conexiones se cierren
  })
  .catch(error => {
    console.error('\nError no controlado:', error);
    setTimeout(() => process.exit(1), 1000);
  }); 