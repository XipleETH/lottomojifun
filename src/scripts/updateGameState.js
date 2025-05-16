// Script para actualizar rápidamente el documento de estado del juego en Firebase
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
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

// Función principal para actualizar el documento de estado del juego
async function updateGameState() {
  try {
    console.log('Actualizando el documento de estado del juego...');
    
    // Verificar si existe el documento de estado del juego
    const gameStateRef = doc(db, 'game_state', GAME_STATE_DOC);
    const gameStateDoc = await getDoc(gameStateRef);
    
    if (gameStateDoc.exists()) {
      const data = gameStateDoc.data();
      console.log('Estado actual del juego:', data);
      
      // Actualizar el documento existente
      await setDoc(gameStateRef, {
        ticketsCollection: TICKETS_COLLECTION,
        forcedUpdate: true,
        updateDate: new Date().toISOString()
      }, { merge: true });
      
      console.log('Documento de estado del juego actualizado correctamente con la nueva colección.');
    } else {
      // Crear documento nuevo
      await setDoc(gameStateRef, {
        ticketsCollection: TICKETS_COLLECTION,
        winningNumbers: [],
        nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
        forcedUpdate: true,
        updateDate: new Date().toISOString()
      });
      
      console.log('Documento de estado del juego creado con la nueva colección de tickets.');
    }
    
    // Verificar el estado actualizado
    const updatedStateDoc = await getDoc(gameStateRef);
    console.log('Estado del juego actualizado:', updatedStateDoc.data());
    
    return { 
      success: true, 
      message: 'Estado del juego actualizado con la nueva colección player_tickets' 
    };
  } catch (error) {
    console.error('Error actualizando el documento de estado del juego:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar la función principal
updateGameState()
  .then(result => {
    console.log('Resultado:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error no controlado:', error);
    process.exit(1);
  }); 