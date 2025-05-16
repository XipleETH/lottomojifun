import React, { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { User } from '../types';
import { toast } from 'react-hot-toast';

interface DirectWarpcastAuthProps {
  onAuthSuccess?: (user: User) => void;
  onAuthFailure?: (error: string) => void;
  autoSignIn?: boolean;
}

export const DirectWarpcastAuth: React.FC<DirectWarpcastAuthProps> = ({
  onAuthSuccess,
  onAuthFailure,
  autoSignIn = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInWarpcast, setIsInWarpcast] = useState(false);
  
  // Detectar si estamos en Warpcast
  useEffect(() => {
    const detectWarpcast = async () => {
      try {
        // Verificar si estamos en un iframe
        const inIframe = window !== window.parent;
        
        // Verificar URL o referrer
        const isWarpcastDomain = 
          window.location.hostname.includes('warpcast') || 
          window.location.href.includes('warpcast.com') ||
          (document.referrer && document.referrer.includes('warpcast'));
        
        // Verificar SDK de Frame
        let isFrameApi = false;
        if (sdk) {
          try {
            isFrameApi = await Promise.race([
              sdk.isFrameAvailable(),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
            ]);
          } catch (e) {
            console.error('Error verificando Frame API:', e);
          }
        }
        
        const isWarpcast = inIframe || isWarpcastDomain || isFrameApi;
        setIsInWarpcast(isWarpcast);
        
        console.log('Detección Warpcast:', { inIframe, isWarpcastDomain, isFrameApi, isWarpcast });
        
        // Inicializar SDK
        if (sdk && isWarpcast) {
          try {
            await sdk.actions.ready();
            console.log('SDK Farcaster inicializado correctamente');
            
            // Auto sign-in si está habilitado
            if (autoSignIn) {
              signIn();
            }
          } catch (e) {
            console.error('Error inicializando SDK:', e);
            setError('Error al inicializar SDK de Farcaster');
            onAuthFailure?.('Error al inicializar SDK de Farcaster');
          }
        }
      } catch (e) {
        console.error('Error en detección de Warpcast:', e);
      }
    };
    
    detectWarpcast();
  }, [autoSignIn, onAuthFailure]);
  
  // Función para iniciar sesión
  const signIn = useCallback(async () => {
    try {
      if (!sdk) {
        const errorMsg = 'SDK de Farcaster no disponible';
        setError(errorMsg);
        onAuthFailure?.(errorMsg);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      console.log('Intentando obtener usuario actual...');
      // Intentar obtener usuario actual primero
      const currentUser = await sdk.getUser();
      
      if (currentUser && currentUser.fid) {
        console.log('Usuario actual encontrado:', currentUser);
        
        // Mapear al formato de usuario de la aplicación
        const user: User = {
          id: `farcaster-${currentUser.fid}`,
          username: currentUser.username || `farcaster-${currentUser.fid}`,
          avatar: currentUser.pfp || undefined,
          walletAddress: currentUser.custody_address || `0x${currentUser.fid.toString().padStart(40, '0')}`,
          fid: currentUser.fid,
          isFarcasterUser: true,
          verifiedWallet: !!currentUser.custody_address,
          chainId: 10 // Optimism
        };
        
        onAuthSuccess?.(user);
        setIsLoading(false);
        return;
      }
      
      // Si no hay usuario actual, intentar sign-in
      console.log('No se encontró usuario actual, intentando sign-in...');
      await sdk.actions.signIn();
      
      // Verificar usuario después de sign-in
      const newUser = await sdk.getUser();
      
      if (newUser && newUser.fid) {
        console.log('Usuario obtenido después de sign-in:', newUser);
        
        // Mapear al formato de usuario de la aplicación
        const user: User = {
          id: `farcaster-${newUser.fid}`,
          username: newUser.username || `farcaster-${newUser.fid}`,
          avatar: newUser.pfp || undefined,
          walletAddress: newUser.custody_address || `0x${newUser.fid.toString().padStart(40, '0')}`,
          fid: newUser.fid,
          isFarcasterUser: true,
          verifiedWallet: !!newUser.custody_address,
          chainId: 10 // Optimism
        };
        
        onAuthSuccess?.(user);
        toast.success(`¡Bienvenido ${user.username}!`);
      } else {
        const errorMsg = 'No se pudo obtener información del usuario después de iniciar sesión';
        setError(errorMsg);
        onAuthFailure?.(errorMsg);
        toast.error('Error al iniciar sesión en Warpcast');
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
      console.error('Error en sign-in:', e);
      setError(errorMsg);
      onAuthFailure?.(errorMsg);
      toast.error('Error conectando con Warpcast');
    } finally {
      setIsLoading(false);
    }
  }, [onAuthSuccess, onAuthFailure]);
  
  // Si no estamos en Warpcast, no mostrar nada
  if (!isInWarpcast) {
    return null;
  }
  
  return (
    <div className="mb-4">
      {error && (
        <div className="text-center p-2 bg-red-100 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
          <button 
            onClick={signIn}
            disabled={isLoading}
            className="text-xs mt-1 text-red-500 underline"
          >
            Reintentar
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="text-center p-2 bg-blue-100 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            Conectando con Warpcast...
          </p>
        </div>
      )}
      
      {!isLoading && !error && (
        <button
          onClick={signIn}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
        >
          Conectar con Warpcast
        </button>
      )}
    </div>
  );
}; 