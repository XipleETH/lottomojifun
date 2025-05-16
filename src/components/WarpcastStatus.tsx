import React from 'react';
import { useAuth } from './AuthProvider';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { useWarpcast } from '../providers/WarpcastProvider';

/**
 * Componente que muestra el estado de conexión con Warpcast
 */
export const WarpcastStatus: React.FC = () => {
  const { user: authUser, isLoading: authLoading, isFarcasterAvailable } = useAuth();
  const { user: warpcastUser, isLoading: warpcastLoading, isWarpcastApp, error, retry } = useWarpcast();
  
  // Usar el usuario de Warpcast si está disponible, sino el de Auth
  const user = warpcastUser || authUser;
  const isLoading = warpcastLoading || authLoading;

  // Si no estamos en Warpcast, no mostramos nada
  if (!isWarpcastApp && !isFarcasterAvailable) {
    return null;
  }

  // Si hay un error, mostrarlo
  if (error) {
    return (
      <div className="text-center p-2 mb-4 bg-red-100 rounded-lg border border-red-200">
        <p className="text-sm text-red-700">
          Error: {error}
        </p>
        <button 
          className="text-xs mt-1 text-red-500 underline"
          onClick={() => retry()}
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  // Si estamos cargando, mostrar indicador
  if (isLoading) {
    return (
      <div className="text-center p-2 mb-4 bg-yellow-100 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          Conectando con Warpcast... Por favor espera.
        </p>
      </div>
    );
  }

  // Si hay un usuario conectado, mostrar información
  if (user && user.isFarcasterUser) {
    return (
      <div className="text-center p-2 mb-4 bg-green-100 rounded-lg border border-green-200">
        <p className="text-sm text-green-700">
          Conectado a Warpcast como {user.username} {user.walletAddress ? `(${user.walletAddress.substring(0, 6)}...)` : ''}
        </p>
      </div>
    );
  }

  // Si no hay usuario pero estamos en Warpcast
  if (isWarpcastApp) {
    return (
      <div className="text-center p-2 mb-4 bg-blue-100 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          Esperando autenticación de Warpcast...
        </p>
        <button 
          className="text-xs mt-1 text-blue-500 underline"
          onClick={() => retry()}
        >
          Conectar con Warpcast
        </button>
      </div>
    );
  }

  // Si Farcaster está disponible pero no estamos en Warpcast
  return (
    <div className="text-center p-2 mb-4 bg-gray-100 rounded-lg border border-gray-200">
      <p className="text-sm text-gray-700">
        Farcaster está disponible. Conéctate para jugar.
      </p>
    </div>
  );
}; 