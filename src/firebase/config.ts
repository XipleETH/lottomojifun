import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Verificar que todas las variables de entorno necesarias estén disponibles
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID'
];

// Verificar variables de entorno
for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    console.error(`Variable de entorno faltante: ${envVar}`);
  }
}

// Configuración de Firebase usando variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_MEASURAMENT_ID
};

// Inicializar Firebase con manejo de errores
let app;
let db;
let auth;
let analytics;
let functions;

try {
  console.log('Inicializando Firebase...');
  app = initializeApp(firebaseConfig);
  
  try {
    console.log('Inicializando Firestore...');
    db = getFirestore(app);
  } catch (dbError) {
    console.error('Error inicializando Firestore:', dbError);
    // Crear un mock de Firestore para evitar errores
    db = {
      collection: () => ({ get: async () => ({ docs: [] }) }),
      doc: () => ({ get: async () => ({ exists: () => false, data: () => ({}) }) })
    };
  }
  
  try {
    console.log('Inicializando Authentication...');
    auth = getAuth(app);
  } catch (authError) {
    console.error('Error inicializando Authentication:', authError);
    // Crear un mock de Auth para evitar errores
    auth = { onAuthStateChanged: (callback) => callback(null) };
  }
  
  try {
    console.log('Inicializando Analytics...');
    // Solo inicializar Analytics si es compatible con el navegador
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
      } else {
        console.log('Analytics no es compatible con este navegador');
        analytics = null;
      }
    });
  } catch (analyticsError) {
    console.error('Error inicializando Analytics:', analyticsError);
    analytics = null;
  }
  
  try {
    console.log('Inicializando Cloud Functions...');
    functions = getFunctions(app);
  } catch (functionsError) {
    console.error('Error inicializando Cloud Functions:', functionsError);
    // Crear un mock de Functions para evitar errores
    functions = { httpsCallable: () => async () => ({ data: {} }) };
  }
  
  // Usar emuladores locales en desarrollo si es necesario
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    console.log('Usando emuladores locales para Firebase');
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFunctionsEmulator(functions, 'localhost', 5001);
    } catch (emulatorError) {
      console.error('Error conectando a emuladores:', emulatorError);
    }
  }
  
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error crítico inicializando Firebase:', error);
  
  // Crear objetos mock para evitar errores en la aplicación
  app = {};
  db = {
    collection: () => ({ get: async () => ({ docs: [] }) }),
    doc: () => ({ get: async () => ({ exists: () => false, data: () => ({}) }) })
  };
  auth = { onAuthStateChanged: (callback) => callback(null) };
  analytics = null;
  functions = { httpsCallable: () => async () => ({ data: {} }) };
}

export { app, db, auth, analytics, functions }; 