// Script para diagnosticar problemas con Firebase
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc,
  getDoc,
  getDocs,
  query,
  limit,
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
console.log('🔥 Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constantes
const DEFAULT_TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_DOC = 'current_game_state';
const TEST_USER_ID = 'test-diagnostic-' + Date.now();

// Función para obtener el nombre de la colección de tickets activa
const getTicketsCollectionName = async () => {
  try {
    console.log('📝 Consultando colección de tickets activa...');
    const stateDoc = await getDoc(doc(db, 'game_state', GAME_STATE_DOC));
    if (!stateDoc.exists()) {
      console.log('❌ El documento de estado no existe. Intentando crearlo...');
      await createGameState();
      return DEFAULT_TICKETS_COLLECTION;
    }
    
    const data = stateDoc.data();
    console.log('✅ Documento de estado obtenido correctamente:', data);
    
    // Usar la colección especificada en el estado del juego o la predeterminada
    return data?.ticketsCollection || DEFAULT_TICKETS_COLLECTION;
  } catch (error) {
    console.error('❌ Error obteniendo nombre de colección de tickets:', error);
    return DEFAULT_TICKETS_COLLECTION;
  }
};

// Función para crear estado del juego si no existe
const createGameState = async () => {
  try {
    console.log('🔄 Creando documento de estado...');
    await addDoc(doc(db, 'game_state', GAME_STATE_DOC), {
      winningNumbers: [],
      nextDrawTime: new Date(Date.now() + 60000), // Próximo sorteo en 1 minuto
      lastUpdated: new Date(),
      ticketsCollection: DEFAULT_TICKETS_COLLECTION,
      source: 'diagnostic-script'
    });
    console.log('✅ Documento de estado creado correctamente');
  } catch (error) {
    console.error('❌ Error creando documento de estado:', error);
  }
};

// Función para verificar la existencia de colecciones
const verifyCollections = async () => {
  try {
    console.log('🔍 Verificando colecciones...');
    
    // Colección de tickets
    const ticketsCollection = await getTicketsCollectionName();
    console.log(`📋 Colección de tickets activa: ${ticketsCollection}`);
    
    const ticketsQuery = query(collection(db, ticketsCollection), limit(5));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    
    console.log(`📊 Tickets existentes: ${ticketsSnapshot.size}`);
    ticketsSnapshot.forEach(doc => {
      console.log(`   - Ticket ${doc.id}: ${JSON.stringify(doc.data().numbers)}`);
    });
    
    return ticketsCollection;
  } catch (error) {
    console.error('❌ Error verificando colecciones:', error);
    return DEFAULT_TICKETS_COLLECTION;
  }
};

// Función para crear un ticket de prueba
const createTestTicket = async (ticketsCollection) => {
  try {
    console.log('🎟️ Creando ticket de prueba...');
    
    // Emojis de prueba
    const testEmojis = ['🔥', '😎', '🚀', '🎮'];
    
    // Crear datos del ticket
    const ticketData = {
      numbers: testEmojis,
      timestamp: serverTimestamp(),
      userId: TEST_USER_ID,
      username: 'Diagnostic Test User',
      walletAddress: '0x' + TEST_USER_ID.substring(0, 40),
      fid: 0,
      isFarcasterUser: false,
      verifiedWallet: false,
      chainId: 10,
      ticketHash: `${TEST_USER_ID}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: 'diagnostic_script'
    };
    
    // Guardar el ticket en Firestore
    const ticketRef = await addDoc(collection(db, ticketsCollection), ticketData);
    
    console.log(`✅ Ticket de prueba creado con ID: ${ticketRef.id}`);
    
    // Verificar que el ticket se haya guardado correctamente
    const ticketDoc = await getDoc(ticketRef);
    if (ticketDoc.exists()) {
      console.log('✅ Ticket verificado correctamente');
      return true;
    } else {
      console.error('❌ No se pudo verificar el ticket');
      return false;
    }
  } catch (error) {
    console.error('❌ Error creando ticket de prueba:', error);
    return false;
  }
};

// Verificar permisos de Firestore
const verifyFirestorePermissions = async () => {
  try {
    console.log('🔒 Verificando permisos de Firestore...');
    
    // Intentar leer un documento
    const stateDoc = await getDoc(doc(db, 'game_state', GAME_STATE_DOC));
    console.log('✅ Lectura permitida');
    
    // Intentar escribir un documento temporal y luego borrarlo
    const tempCollectionName = 'temp_diagnostic_' + Date.now();
    const tempDocRef = await addDoc(collection(db, tempCollectionName), {
      test: true,
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Escritura permitida');
    
    return true;
  } catch (error) {
    console.error('❌ Error verificando permisos:', error);
    return false;
  }
};

// Ejecutar diagnóstico completo
const runDiagnostic = async () => {
  console.log('🚀 Iniciando diagnóstico de Firebase...');
  
  try {
    // Verificar permisos
    const permissionsOk = await verifyFirestorePermissions();
    if (!permissionsOk) {
      console.error('⛔ Error de permisos. No se puede continuar.');
      return;
    }
    
    // Verificar colecciones
    const ticketsCollection = await verifyCollections();
    
    // Crear ticket de prueba
    const ticketCreated = await createTestTicket(ticketsCollection);
    
    // Resultado final
    if (ticketCreated) {
      console.log('✅ DIAGNÓSTICO COMPLETO: Todo funciona correctamente');
    } else {
      console.error('❌ DIAGNÓSTICO COMPLETO: Se encontraron errores');
    }
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
};

// Ejecutar el diagnóstico
runDiagnostic().then(() => {
  console.log('🏁 Diagnóstico finalizado');
}); 