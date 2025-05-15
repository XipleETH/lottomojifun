import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthProvider';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { initializeGameState } from './firebase/gameServer';

// Inicializar Firebase al cargar la aplicación - solo una vez
const initializeApp = async () => {
  try {
    console.log('Inicializando la aplicación...');
    await initializeGameState();
    
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <MiniKitProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MiniKitProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    
    // Renderizar la aplicación de todos modos
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <MiniKitProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MiniKitProvider>
      </React.StrictMode>
    );
  }
};

initializeApp();
