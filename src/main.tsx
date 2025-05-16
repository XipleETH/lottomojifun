import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthProvider';
import { MiniKitProvider } from './providers/MiniKitProvider';
import { WarpcastProvider } from './providers/WarpcastProvider';
import { initializeGameState } from './firebase/gameServer';
import { Toaster } from 'react-hot-toast';

// Manejador global de errores no controlados
window.addEventListener('error', (error) => {
  console.error('Error no controlado capturado globalmente:', error);
});

// Manejador de promesas rechazadas no controladas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa rechazada no controlada:', event.reason);
});

// Inicializar Firebase con manejo de errores seguro
const initializeApp = async () => {
  try {
    console.log('Inicializando el estado del juego...');
    await initializeGameState();
    console.log('Estado del juego inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar Firebase (controlado):', error);
    // No bloqueamos el renderizado aunque haya un error
  }
};

// Verificar si estamos en Warpcast
const isWarpcast = typeof window !== 'undefined' && 
  (window.location.href.includes('warpcast.com') || 
   window.parent !== window);

console.log(`Entorno detectado: ${isWarpcast ? 'Warpcast' : 'Navegador normal'}`);
console.log('Inicializando aplicación con soporte para Base y Optimism');

// Inicialización segura del DOM
const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('No se encontró el elemento root');
    return;
  }
  
  try {
    ReactDOM.createRoot(rootElement).render(
      // <React.StrictMode> // Desactivamos StrictMode en producción para evitar dobles inicializaciones
        <WarpcastProvider>
          <MiniKitProvider>
            <AuthProvider>
              <Toaster position="top-center" />
              <App />
            </AuthProvider>
          </MiniKitProvider>
        </WarpcastProvider>
      // </React.StrictMode>,
    );
  } catch (error) {
    console.error('Error al renderizar la aplicación:', error);
    // Intentar mostrar al menos un mensaje de error en la pantalla
    rootElement.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 20px; text-align: center;">
        <div>
          <h1 style="font-size: 24px; margin-bottom: 20px;">Oops! Algo salió mal al cargar LottoMoji</h1>
          <p>Por favor intenta recargar la página o contacta al soporte si el problema persiste.</p>
          <button style="background: white; color: #8b5cf6; border: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; cursor: pointer;" onclick="window.location.reload()">
            Recargar página
          </button>
        </div>
      </div>
    `;
  }
};

// Inicializar en secuencia
initializeApp().finally(() => {
  mountApp();
});
