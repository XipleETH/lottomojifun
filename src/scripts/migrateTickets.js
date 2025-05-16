// Script para migrar tickets existentes a la nueva colección player_tickets
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  getDocs,
  getDoc,
  query,
  where,
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
const OLD_TICKETS_COLLECTION = 'tickets';
const NEW_TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_DOC = 'current_game_state';

// Función principal para migrar los tickets
async function migrateTickets() {
  try {
    console.log('Iniciando migración de tickets...');
    
    // 1. Verificar si existen tickets en la colección antigua
    const oldTicketsRef = collection(db, OLD_TICKETS_COLLECTION);
    const oldTicketsSnapshot = await getDocs(oldTicketsRef);
    
    if (oldTicketsSnapshot.empty) {
      console.log('No hay tickets en la colección antigua para migrar.');
      
      // Actualizar el documento de estado del juego de todos modos
      await updateGameState();
      return { success: true, migrated: 0 };
    }
    
    // 2. Migrar los tickets a la nueva colección
    const newTicketsRef = collection(db, NEW_TICKETS_COLLECTION);
    let migratedCount = 0;
    
    for (const oldTicketDoc of oldTicketsSnapshot.docs) {
      const oldTicketData = oldTicketDoc.data();
      
      // Añadir el ID original como campo adicional
      const newTicketData = {
        ...oldTicketData,
        originalId: oldTicketDoc.id,
        migratedAt: new Date().toISOString(),
        // Asegurar que tengamos un timestamp
        timestamp: oldTicketData.timestamp || serverTimestamp()
      };
      
      try {
        const newTicketRef = await addDoc(newTicketsRef, newTicketData);
        console.log(`Ticket migrado: ${oldTicketDoc.id} -> ${newTicketRef.id}`);
        migratedCount++;
      } catch (error) {
        console.error(`Error migrando ticket ${oldTicketDoc.id}:`, error);
      }
    }
    
    // 3. Actualizar el documento de estado del juego
    await updateGameState();
    
    console.log(`Migración completada: ${migratedCount} tickets migrados.`);
    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error('Error durante la migración de tickets:', error);
    return { success: false, error: error.message };
  }
}

// Función para actualizar el documento de estado del juego
async function updateGameState() {
  try {
    const gameStateRef = doc(db, 'game_state', GAME_STATE_DOC);
    const gameStateDoc = await getDoc(gameStateRef);
    
    if (gameStateDoc.exists()) {
      // Actualizar el documento existente
      await setDoc(gameStateRef, {
        ticketsCollection: NEW_TICKETS_COLLECTION,
        migrationCompleted: true,
        migrationDate: new Date().toISOString()
      }, { merge: true });
      
      console.log('Documento de estado del juego actualizado con la nueva colección de tickets.');
    } else {
      // Crear documento nuevo
      await setDoc(gameStateRef, {
        ticketsCollection: NEW_TICKETS_COLLECTION,
        winningNumbers: [],
        nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
        migrationCompleted: true,
        migrationDate: new Date().toISOString()
      });
      
      console.log('Documento de estado del juego creado con la nueva colección de tickets.');
    }
    
    return true;
  } catch (error) {
    console.error('Error actualizando el documento de estado del juego:', error);
    return false;
  }
}

// Ejecutar el script
migrateTickets()
  .then(result => {
    console.log('Resultado de la migración:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error no controlado:', error);
    process.exit(1);
  }); 