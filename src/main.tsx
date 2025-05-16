import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthProvider';
import { MiniKitProvider } from './providers/MiniKitProvider';
import { initializeGameState } from './firebase/gameServer';
import { CONTRACT_ADDRESSES } from './contracts/LottoMojiFun';

// Manejador de errores global para depuración
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Error global capturado:', { message, source, lineno, colno, error });
  // También podemos mostrar un mensaje en la página
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.bottom = '10px';
  errorDiv.style.left = '10px';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '10px';
  errorDiv.style.zIndex = '9999';
  errorDiv.textContent = `Error: ${message}`;
  document.body.appendChild(errorDiv);
  return false;
};

// Manejador de errores para promesas no capturadas
window.addEventListener('unhandledrejection', function(event) {
  console.error('Promesa no manejada:', event.reason);
  
  // Mostrar en la interfaz
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.bottom = '50px';
  errorDiv.style.left = '10px';
  errorDiv.style.backgroundColor = 'orange';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '10px';
  errorDiv.style.zIndex = '9999';
  errorDiv.textContent = `Error en promesa: ${event.reason?.message || 'Error desconocido'}`;
  document.body.appendChild(errorDiv);
});

// Verificar disponibilidad de APIs críticas
console.log('Verificando APIs críticas:');
console.log('- window.ethereum:', typeof window.ethereum !== 'undefined' ? 'Disponible' : 'No disponible');
console.log('- Farcaster SDK:', typeof window.farcasterSigner !== 'undefined' ? 'Disponible' : 'No disponible');

// Configuración de redes blockchain
// Base Mainnet - ID: 8453
// Optimism - ID: 10

// Inicializar Firebase al cargar la aplicación, pero sin bloquear el renderizado
setTimeout(() => {
  console.log('Inicializando estado del juego en segundo plano...');
  initializeGameState().catch(error => {
    console.error('Error al inicializar Firebase:', error);
  });
}, 2000); // Retraso de 2 segundos para permitir que la UI se cargue primero

// Verificar si estamos en Warpcast
const isWarpcast = typeof window !== 'undefined' && 
  (window.location.href.includes('warpcast.com') || 
   window.parent !== window);

console.log(`Entorno detectado: ${isWarpcast ? 'Warpcast' : 'Navegador normal'}`);
console.log('Inicializando aplicación con soporte para Base y Optimism');
console.log('Dirección del contrato LottoMojiFun:', CONTRACT_ADDRESSES.LOTTO_MOJI_FUN);

// Renderizar la aplicación
try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MiniKitProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MiniKitProvider>
    </React.StrictMode>,
  );
} catch (error) {
  console.error('Error crítico al renderizar la aplicación:', error);
  
  // Mostrar mensaje de error en la página
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px;">
        <h3>Error al cargar la aplicación</h3>
        <p>${error?.message || 'Error desconocido'}</p>
        <p>Por favor, intenta recargar la página o visita la <a href="/diagnostico.html" style="color: #721c24; font-weight: bold;">página de diagnóstico</a>.</p>
      </div>
    `;
  }
}
