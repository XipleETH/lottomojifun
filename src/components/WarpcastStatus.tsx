import React, { useState, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { useWarpcast } from '../providers/WarpcastProvider';
import { useOnchainConnection } from '../hooks/useOnchainConnection';
import { User } from '../types';
import { toast } from 'react-hot-toast';

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
  
  // Error específico del SDK
  const isSdkError = error?.includes('SDK') || error?.includes('sdk');

  // Crear usuario genérico de emergencia cuando todo lo demás falla
  const createEmergencyUser = useCallback(() => {
    try {
      // Mostrar toast de carga
      toast.loading('Creando sesión de emergencia...', { id: 'emergency-user' });
      
      console.log('Creando usuario genérico de emergencia desde WarpcastStatus');
      
      // Generar ID y dirección únicos
      const timestamp = Date.now();
      const tempId = `farcaster-emergency-${timestamp}`;
      const tempAddr = `0x${timestamp.toString(16).padStart(40, '0')}`;
      
      // Crear usuario genérico
      const genericUser: User = {
        id: tempId,
        username: 'Warpcast User',
        walletAddress: tempAddr,
        fid: 0,
        isFarcasterUser: true,
        verifiedWallet: false,
        chainId: 10 // Optimism por defecto
      };
      
      console.log('Usuario genérico de emergencia creado:', genericUser);
      
      // Guardar en localStorage para futuras referencias
      try {
        localStorage.setItem('warpcast_emergency_user', JSON.stringify(genericUser));
      } catch (e) {
        console.warn('Error guardando usuario de emergencia en localStorage:', e);
      }
      
      // Mostrar mensaje de éxito
      toast.success('Sesión de emergencia creada. Recarga la página.', { id: 'emergency-user' });
      
      // Forzar recarga después de un breve retraso
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error('Error creando usuario de emergencia:', e);
      toast.error('Error creando sesión de emergencia', { id: 'emergency-user' });
    }
  }, []);

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
        
        <div className="mt-2 flex justify-center gap-2">
          <button 
            onClick={() => retry()}
            className="bg-blue-600 text-white py-1 px-3 rounded text-xs"
          >
            Reintentar conexión
          </button>
          
          <button 
            onClick={createEmergencyUser}
            className="bg-red-600 text-white py-1 px-3 rounded text-xs"
            title="Usa esto solo si ninguna otra opción funciona"
          >
            Crear usuario de emergencia
          </button>
        </div>
      </div>
    );
  }

  // Si hay un error de SDK, mostrar mensaje especial con enlace a solución
  if (isSdkError) {
    return (
      <div className="text-center p-3 mb-4 bg-amber-100 rounded-lg border border-amber-300">
        <p className="text-sm text-amber-800 mb-2">
          <strong>Error del SDK de Farcaster:</strong> No se pudo conectar con Warpcast.
        </p>
        <div className="text-xs text-amber-700 mb-2">
          Esto puede ocurrir si estás usando una versión antigua de la aplicación o hay un problema de conexión.
        </div>
        <div className="flex justify-center items-center gap-3">
          <button 
            onClick={() => retry()}
            className="text-xs bg-amber-600 text-white py-1 px-3 rounded"
          >
            Reintentar
          </button>
          <button 
            onClick={createEmergencyUser}
            className="text-xs bg-amber-700 text-white py-1 px-3 rounded"
          >
            Usar modo de emergencia
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-amber-700 underline"
          >
            Diagnóstico
          </button>
        </div>
      </div>
    );
  }

  // Si hay un error normal, mostrarlo
  if (error) {
    return (
      <div className="text-center p-2 mb-4 bg-red-100 rounded-lg border border-red-200 flex items-center justify-between">
        <p className="text-sm text-red-700">
          Error: {error}
        </p>
        <div className="flex items-center gap-2">
          <button 
            className="text-xs text-red-500 underline"
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
        <div className="flex items-center gap-2">
          <button 
            onClick={createEmergencyUser}
            className="text-xs text-yellow-700 underline"
          >
            Modo emergencia
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
          <div className="flex gap-2 mt-1">
            <button 
              className="text-xs text-blue-500 underline"
              onClick={() => retry()}
            >
              Conectar
            </button>
            <button 
              className="text-xs text-blue-700 underline"
              onClick={createEmergencyUser}
            >
              Modo emergencia
            </button>
          </div>
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