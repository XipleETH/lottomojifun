import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthProvider';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { initializeGameState } from './firebase/gameServer';

// Inicializar Firebase al cargar la aplicación
initializeGameState().catch(error => {
  console.error('Error al inicializar Firebase:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniKitProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MiniKitProvider>
  </React.StrictMode>,
);
