import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { useWarpcast } from '../providers/WarpcastProvider';
import { useOnchainConnection } from '../hooks/useOnchainConnection';

/**
 * Componente mejorado que muestra el estado de conexión con Warpcast
 */
export const WarpcastStatus: React.FC = () => {
  const { user: authUser, isLoading: authLoading, isFarcasterAvailable } = useAuth();
  const { user: warpcastUser, isLoading: warpcastLoading, isWarpcastApp, error, retry } = useWarpcast();
  const { user: onchainUser, isLoading: onchainLoading, isWarpcastApp: isOnchainWarpcast } = useOnchainConnection();
  const [showDebug, setShowDebug] = useState(false);
  
  // Usar el primer usuario disponible en orden de prioridad
  const user = warpcastUser || onchainUser || authUser;
  const isLoading = warpcastLoading || authLoading || onchainLoading;
  
  // Combinar detecciones de Warpcast
  const isInWarpcast = isWarpcastApp || isOnchainWarpcast || isFarcasterAvailable;

  // Si no estamos en Warpcast y no hay debug, no mostramos nada
  if (!isInWarpcast && !showDebug) {
    return (
      <div className="text-center p-2 mb-4 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          No se detectó entorno Warpcast
        </p>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-blue-500 underline"
        >
          Mostrar diagnóstico
        </button>
      </div>
    );
  }

  // Información de diagnóstico detallada
  if (showDebug) {
    return (
      <div className="text-left p-3 mb-4 bg-gray-800 text-white rounded-lg border border-gray-700 font-mono text-xs overflow-auto">
        <div className="flex justify-between mb-2">
          <h3 className="font-bold">Diagnóstico de Warpcast</h3>
          <button 
            onClick={() => setShowDebug(false)}
            className="text-xs text-blue-400 underline"
          >
            Ocultar
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-700 p-2 rounded">
            <p className="font-bold mb-1">Estado:</p>
            <p>isWarpcastApp: {isWarpcastApp ? '✅' : '❌'}</p>
            <p>isOnchainWarpcast: {isOnchainWarpcast ? '✅' : '❌'}</p>
            <p>isFarcasterAvailable: {isFarcasterAvailable ? '✅' : '❌'}</p>
            <p>isLoading: {isLoading ? '⏳' : '✅'}</p>
            <p>Error: {error ? '❌ ' + error : '✅ None'}</p>
          </div>
          
          <div className="bg-gray-700 p-2 rounded">
            <p className="font-bold mb-1">Usuario activo:</p>
            <p>Fuente: {warpcastUser ? 'Warpcast' : (onchainUser ? 'OnchainKit' : (authUser ? 'Auth' : 'Ninguna'))}</p>
            <p>Username: {user?.username || 'N/A'}</p>
            <p>FID: {user?.fid || 'N/A'}</p>
            <p>Wallet: {user?.walletAddress ? `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}` : 'N/A'}</p>
            <p>Verified: {user?.verifiedWallet ? '✅' : '❌'}</p>
          </div>
        </div>
        
        <div className="mt-2 flex justify-center">
          <button 
            onClick={() => retry()}
            className="bg-blue-600 text-white py-1 px-3 rounded text-xs"
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  // Si hay un error, mostrarlo
  if (error) {
    return (
      <div className="text-center p-2 mb-4 bg-red-100 rounded-lg border border-red-200 flex items-center justify-between">
        <p className="text-sm text-red-700">
          Error: {error}
        </p>
        <div className="flex items-center">
          <button 
            className="text-xs mr-2 text-red-500 underline"
            onClick={() => retry()}
          >
            Reintentar
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-blue-500 underline"
          >
            Diagnóstico
          </button>
        </div>
      </div>
    );
  }

  // Si estamos cargando, mostrar indicador
  if (isLoading) {
    return (
      <div className="text-center p-2 mb-4 bg-yellow-100 rounded-lg border border-yellow-200 flex items-center justify-between">
        <p className="text-sm text-yellow-700">
          Conectando con Warpcast... Por favor espera.
        </p>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-blue-500 underline"
        >
          Diagnóstico
        </button>
      </div>
    );
  }

  // Si hay un usuario conectado, mostrar información
  if (user && user.isFarcasterUser) {
    const walletDisplay = user.walletAddress 
      ? `(${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)})` 
      : '';
    
    const sourceLabel = warpcastUser 
      ? 'vía Warpcast Frame' 
      : onchainUser 
        ? 'vía OnchainKit' 
        : 'vía Auth';
    
    return (
      <div className="text-center p-2 mb-4 bg-green-100 rounded-lg border border-green-200 flex items-center justify-between">
        <p className="text-sm text-green-700">
          Conectado como {user.username} {walletDisplay} <span className="text-xs opacity-75">{sourceLabel}</span>
        </p>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-blue-500 underline"
        >
          Diagnóstico
        </button>
      </div>
    );
  }

  // Si no hay usuario pero estamos en Warpcast
  if (isInWarpcast) {
    return (
      <div className="text-center p-2 mb-4 bg-blue-100 rounded-lg border border-blue-200 flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-700">
            Detectado entorno Warpcast - Esperando autenticación...
          </p>
          <button 
            className="text-xs mt-1 text-blue-500 underline"
            onClick={() => retry()}
          >
            Conectar
          </button>
        </div>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-blue-500 underline"
        >
          Diagnóstico
        </button>
      </div>
    );
  }

  // Si Farcaster está disponible pero no estamos en Warpcast
  return (
    <div className="text-center p-2 mb-4 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-between">
      <p className="text-sm text-gray-700">
        Farcaster está disponible. Conéctate para jugar.
      </p>
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="text-xs text-blue-500 underline"
      >
        Diagnóstico
      </button>
    </div>
  );
}; 