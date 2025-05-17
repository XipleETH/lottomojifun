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

  // URLs para la mini app
  const miniAppUrl = 'https://warpcast.com/miniapps/MD6NcmUnNhly/lottomoji';
  const warpcastUrl = 'https://warpcast.com/~/download';
  
  // Detectar navegador móvil
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
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
      <div className="max-w-xl mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 text-sm">
        <h2 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-400">
          Diagnóstico de Warpcast
        </h2>
        
        {!isWarpcastApp && (
          <div className="p-3 mb-3 border border-orange-300 bg-orange-100 dark:bg-orange-900 dark:border-orange-700 rounded-lg">
            <p className="font-medium text-orange-800 dark:text-orange-300 mb-2">
              ⚠️ Estás accediendo desde un navegador normal, no desde Warpcast
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-400 mb-2">
              La aplicación funciona mejor dentro de la app de Warpcast. Algunas funciones como la firma de transacciones pueden no estar disponibles.
            </p>
            <div className="mt-2">
              <a 
                href={miniAppUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg text-sm mr-2"
              >
                Abrir en Warpcast
              </a>
              {isMobile && !isWarpcastApp && (
                <a 
                  href={warpcastUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
                >
                  Descargar Warpcast
                </a>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-y-2">
          <div className="font-medium">isWarpcastApp:</div>
          <div>{isWarpcastApp ? '✅' : '❌'}</div>
          
          <div className="font-medium">isOnchainWarpcast:</div>
          <div>{isOnchainWarpcast ? '✅' : '❌'}</div>
          
          <div className="font-medium">isFarcasterAvailable:</div>
          <div>{isFarcasterAvailable ? '✅' : '❌'}</div>
          
          <div className="font-medium">isLoading:</div>
          <div>{isLoading ? '✅' : '❌'}</div>
          
          <div className="font-medium">Error:</div>
          <div>{error ? `❌ ${error}` : '❌ SDK de Farcaster no disponible'}</div>
        </div>
        
        <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-3">
          <h3 className="font-medium mb-2">Usuario activo:</h3>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <div className="font-medium">Fuente:</div>
            <div>{user ? (isWarpcastApp ? 'Warpcast' : 'OnchainKit') : 'Ninguna'}</div>
            
            <div className="font-medium">Username:</div>
            <div>{user?.username || 'N/A'}</div>
            
            <div className="font-medium">FID:</div>
            <div>{user?.fid ? user.fid.toString() : 'N/A'}</div>
            
            <div className="font-medium">Wallet:</div>
            <div>
              {user?.walletAddress 
                ? `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`
                : 'N/A'}
            </div>
            
            <div className="font-medium">Verified:</div>
            <div>{user?.verifiedWallet ? '✅' : '❌'}</div>
          </div>
        </div>
        
        {/* Mensaje tutorial */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700 pt-3">
          <p>
            <strong>Nota:</strong> Para probar todas las funciones, accede desde la app de Warpcast.
            {!user && !isLoading && (
              <button
                onClick={() => connect()}
                className="ml-2 text-purple-600 dark:text-purple-400 hover:underline"
              >
                Conectar manualmente
              </button>
            )}
          </p>
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