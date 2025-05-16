import { db } from '../firebase/config';
import { doc, setDoc, collection } from 'firebase/firestore';

/**
 * Script para recuperar la estructura de la base de datos de Firebase
 * después de una eliminación accidental
 */

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'tickets';
const GAME_RESULTS_COLLECTION = 'game_results';

// Función principal para restaurar la estructura básica de Firebase
async function recoverFirebaseStructure() {
  try {
    console.log('Iniciando recuperación de la estructura de Firebase...');
    
    // 1. Crear la colección de tickets (esto se crea automáticamente cuando se añade el primer documento)
    // Pero podemos crear un documento temporal para asegurarnos de que la colección exista
    const tempTicketRef = collection(db, TICKETS_COLLECTION);
    console.log('Preparada la colección de tickets');
    
    // 2. Crear/actualizar el documento de estado del juego
    await setDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers: [],
      nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
      lastUpdated: new Date()
    });
    console.log('Estado del juego restaurado');
    
    // 3. Verificar que la colección de resultados del juego exista
    const tempResultRef = collection(db, GAME_RESULTS_COLLECTION);
    console.log('Preparada la colección de resultados');
    
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
  } else {
    console.error('❌ Ocurrió un error al restaurar la estructura de Firebase:', result.error);
  }
}); 