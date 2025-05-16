import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthProvider';
import { MiniKitProvider } from './providers/MiniKitProvider';
import { initializeGameState } from './firebase/gameServer';

// Configuración de redes blockchain
// Base Mainnet - ID: 8453
// Optimism - ID: 10

// Inicializar Firebase al cargar la aplicación
initializeGameState().catch(error => {
  console.error('Error al inicializar Firebase:', error);
});

// Verificar si estamos en Warpcast
const isWarpcast = typeof window !== 'undefined' && 
  (window.location.href.includes('warpcast.com') || 
   window.parent !== window);

console.log(`Entorno detectado: ${isWarpcast ? 'Warpcast' : 'Navegador normal'}`);
console.log('Inicializando aplicación con soporte para Base y Optimism');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniKitProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MiniKitProvider>
  </React.StrictMode>,
);
