import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User } from '../types';
import { toast } from 'react-hot-toast';

// Intentar obtener el SDK de Farcaster de manera segura
// Esto es crítico para evitar errores con versiones del SDK
let sdk: any;
try {
  // Intentar importar directamente del módulo
  sdk = require('@farcaster/frame-sdk').sdk;
} catch (e) {
  console.warn('Error importando SDK de Farcaster directamente:', e);
  try {
    // Intentar obtener desde window
    sdk = window.Farcaster?.sdk || 
          window.frameWarpcast?.sdk || 
          (window as any).fc_sdk || 
          (window as any).farcaster?.sdk;
    
    if (!sdk) {
      console.warn('SDK no encontrado en window, buscando globales alternativos');
    }
  } catch (e) {
    console.error('No se pudo obtener SDK de Farcaster desde window:', e);
  }
}

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
  const autoSignInAttempted = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  
  // Detectar si estamos en Warpcast con métodos mejorados
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
        
        // Buscar señales de Frame en window
        const hasFrameGlobals = !!(
          window.Farcaster || 
          window.frameWarpcast || 
          window.warpcast || 
          (window as any).fc_frame ||
          document.querySelector('meta[property="fc:frame"]')
        );
        
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
        
        const isWarpcast = inIframe || isWarpcastDomain || isFrameApi || hasFrameGlobals;
        setIsInWarpcast(isWarpcast);
        
        console.log('Detección mejorada Warpcast:', { 
          inIframe, 
          isWarpcastDomain, 
          isFrameApi, 
          hasFrameGlobals,
          isWarpcast,
          sdk: !!sdk
        });
        
        // Inicializar SDK si está disponible
        if (sdk && isWarpcast) {
          try {
            await Promise.race([
              sdk.actions.ready(),
              new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
            ]);
            console.log('SDK Farcaster inicializado correctamente');
            setSdkReady(true);
            
            // Auto sign-in si está habilitado y no se ha intentado antes
            if (autoSignIn && !autoSignInAttempted.current) {
              autoSignInAttempted.current = true;
              signIn();
            }
          } catch (e) {
            console.error('Error inicializando SDK:', e);
            setSdkReady(false);
            
            // Si hay error pero estamos en Warpcast, crear usuario genérico
            if (isWarpcast) {
              console.log('Creando usuario genérico después de error SDK');
              createGenericUser();
            } else {
              setError('Error al inicializar SDK de Farcaster');
              onAuthFailure?.('Error al inicializar SDK de Farcaster');
            }
          }
        } else if (isWarpcast && !sdk) {
          // Si estamos en Warpcast pero no hay SDK, crear usuario genérico
          console.log('En Warpcast pero sin SDK disponible, creando usuario genérico');
          createGenericUser();
        }
      } catch (e) {
        console.error('Error en detección de Warpcast:', e);
        // Si hay error pero la detección indicó Warpcast, crear usuario genérico
        if (isInWarpcast) {
          createGenericUser();
        }
      }
    };
    
    detectWarpcast();
  }, [autoSignIn, onAuthFailure]);
  
  // Función para crear un usuario genérico cuando estamos en Warpcast pero sin datos completos
  const createGenericUser = useCallback(() => {
    try {
      console.log('Creando usuario genérico para Warpcast');
      
      // Generar ID y dirección únicos
      const tempId = `farcaster-warpcast-${Date.now()}`;
      const tempAddr = `0x${tempId.substring(tempId.length - 40)}`;
      
      const genericUser: User = {
        id: tempId,
        username: 'Warpcast User',
        walletAddress: tempAddr,
        fid: 0,
        isFarcasterUser: true,
        verifiedWallet: false,
        chainId: 10 // Optimism
      };
      
      console.log('Usuario genérico creado:', genericUser);
      onAuthSuccess?.(genericUser);
      setIsLoading(false);
      setError(null);
    } catch (e) {
      console.error('Error creando usuario genérico:', e);
      setError('Error creando usuario para Warpcast');
    }
  }, [onAuthSuccess]);
  
  // Función para iniciar sesión
  const signIn = useCallback(async () => {
    try {
      if (!sdk && !isInWarpcast) {
        const errorMsg = 'SDK de Farcaster no disponible';
        setError(errorMsg);
        onAuthFailure?.(errorMsg);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Si no hay SDK pero estamos en Warpcast, usar usuario genérico
      if (!sdk && isInWarpcast) {
        console.log('Sin SDK pero en Warpcast, creando usuario genérico');
        createGenericUser();
        return;
      }
      
      console.log('Intentando obtener usuario actual desde SDK...');
      
      // Intentar obtener usuario actual primero
      try {
        const currentUser = await Promise.race([
          sdk.getUser(),
          new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
        ]);
        
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
      } catch (err) {
        console.warn('Error o timeout obteniendo usuario actual:', err);
        // Si hay timeout pero estamos en Warpcast, crear usuario genérico
        if (isInWarpcast) {
          createGenericUser();
          return;
        }
      }
      
      // Si no hay usuario actual, intentar sign-in
      console.log('No se encontró usuario actual, intentando sign-in...');
      
      try {
        await Promise.race([
          sdk.actions.signIn(),
          new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
        ]);
        
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
          setIsLoading(false);
        } else if (isInWarpcast) {
          // Si no hay usuario después del sign-in pero estamos en Warpcast, crear genérico
          console.log('Sign-in exitoso pero sin datos de usuario, creando genérico');
          createGenericUser();
        } else {
          const errorMsg = 'No se pudo obtener información del usuario después de iniciar sesión';
          setError(errorMsg);
          onAuthFailure?.(errorMsg);
          toast.error('Error al iniciar sesión en Warpcast');
          setIsLoading(false);
        }
      } catch (signInError) {
        console.error('Error o timeout en sign-in:', signInError);
        
        // Si hay error pero estamos en Warpcast, crear usuario genérico
        if (isInWarpcast) {
          console.log('Error en sign-in pero en Warpcast, creando usuario genérico');
          createGenericUser();
        } else {
          const errorMsg = signInError instanceof Error ? signInError.message : 'Error desconocido';
          setError(errorMsg);
          onAuthFailure?.(errorMsg);
          toast.error('Error conectando con Warpcast');
          setIsLoading(false);
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
      console.error('Error global en sign-in:', e);
      
      // Si hay error global pero estamos en Warpcast, crear usuario genérico
      if (isInWarpcast) {
        console.log('Error global pero en Warpcast, creando usuario genérico');
        createGenericUser();
      } else {
        setError(errorMsg);
        onAuthFailure?.(errorMsg);
        toast.error('Error conectando con Warpcast');
        setIsLoading(false);
      }
    }
  }, [onAuthSuccess, onAuthFailure, isInWarpcast, createGenericUser]);
  
  // Si no estamos en Warpcast, no mostrar nada o un estado alternativo
  if (!isInWarpcast) {
    return (
      <div className="text-center p-2 bg-gray-100 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          Este botón es para usuarios de Warpcast.
        </p>
      </div>
    );
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