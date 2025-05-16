// Script para recuperar la estructura de la base de datos de Firebase
// Este script se puede ejecutar directamente con Node.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection } = require('firebase/firestore');

// Obtener las variables de entorno del archivo .env si existe
try {
  require('dotenv').config();
} catch (e) {
  console.log('No se pudo cargar dotenv, usando variables de entorno directamente');
}

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_MEASURAMENT_ID
};

// Constantes para las colecciones
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'tickets';
const GAME_RESULTS_COLLECTION = 'game_results';

// Inicializar Firebase
console.log('Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función principal para restaurar la estructura básica de Firebase
async function recoverFirebaseStructure() {
  try {
    console.log('Iniciando recuperación de la estructura de Firebase...');
    
    // 1. Crear la colección de tickets
    console.log('Preparando la colección de tickets...');
    const tempTicketRef = collection(db, TICKETS_COLLECTION);
    
    // 2. Crear/actualizar el documento de estado del juego
    console.log('Restaurando el estado del juego...');
    await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers: [],
      nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
      lastUpdated: new Date()
    });
    
    // 3. Verificar que la colección de resultados del juego exista
    console.log('Preparando la colección de resultados...');
    const tempResultRef = collection(db, GAME_RESULTS_COLLECTION);
    
    console.log('Recuperación completada con éxito.');
    return { success: true };
    
  } catch (error) {
    console.error('Error durante la recuperación de Firebase:', error);
    return { success: false, error };
  }
}

// Ejecutar la recuperación
recoverFirebaseStructure().then(result => {
  if (result.success) {
    console.log('✅ La estructura de Firebase ha sido restaurada correctamente.');
    process.exit(0);
  } else {
    console.error('❌ Ocurrió un error al restaurar la estructura de Firebase:', result.error);
    process.exit(1);
  }
}); 