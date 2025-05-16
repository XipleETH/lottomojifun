import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';

// Importar la versión más reciente del SDK para evitar conflictos
let sdk: any;
try {
  // Intentar importar directamente
  sdk = require('@farcaster/frame-sdk').sdk;
} catch (e) {
  console.warn('Error importando SDK de Farcaster directamente:', e);
  try {
    // Intentar obtener desde window
    sdk = window.Farcaster?.sdk || window.frameWarpcast?.sdk;
  } catch (e) {
    console.error('No se pudo obtener SDK de Farcaster:', e);
  }
}

/**
 * Hook personalizado para manejar la integración con Warpcast
 */
export function useFarcasterSigner() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWarpcastApp, setIsWarpcastApp] = useState(false);
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar si el SDK está disponible
  useEffect(() => {
    if (!sdk) {
      console.error('SDK de Farcaster no está disponible');
      setError('SDK de Farcaster no disponible');
      setIsLoading(false);
    } else {
      console.log('SDK de Farcaster disponible:', sdk);
    }
  }, []);

  // Detectar entorno Warpcast al cargar
  useEffect(() => {
    const detectWarpcastEnvironment = async () => {
      try {
        // Método 1: Verificar si estamos en un iframe (común para las mini apps)
        const inIframe = window !== window.parent;
        
        // Método 2: Verificar la URL o referrer para palabras clave de Warpcast
        const isWarpcastDomain = 
          window.location.hostname.includes('warpcast') || 
          window.location.href.includes('warpcast.com') ||
          (document.referrer && document.referrer.includes('warpcast'));
        
        // Método 3: Verificar disponibilidad del SDK frame
        let isFrameApi = false;
        if (sdk) {
          try {
            isFrameApi = await Promise.race([
              sdk.isFrameAvailable(),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
            ]);
          } catch (e) {
            console.error('Error detectando Frame API:', e);
          }
        }
        
        // Determinar si estamos en Warpcast
        const detected = inIframe || isWarpcastDomain || isFrameApi;
        setIsWarpcastApp(detected);
        
        console.log('Detección de entorno Warpcast:', { 
          inIframe, 
          isWarpcastDomain, 
          isFrameApi, 
          detected 
        });
        
        // Inicializar SDK si está disponible
        if (sdk) {
          try {
            await Promise.race([
              sdk.actions.ready(),
              new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
            ]);
            console.log('SDK de Farcaster inicializado');
          } catch (e) {
            console.warn('Timeout o error inicializando SDK:', e);
          }
        }
        
        setIsLoading(false);
      } catch (e) {
        console.error('Error detectando entorno Warpcast:', e);
        setIsLoading(false);
      }
    };
    
    detectWarpcastEnvironment();
  }, []);

  // Intentar iniciar sesión automáticamente
  useEffect(() => {
    if (isWarpcastApp && !user && !hasAttemptedSignIn) {
      signIn();
    }
  }, [isWarpcastApp, user, hasAttemptedSignIn]);

  // Función para iniciar sesión
  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasAttemptedSignIn(true);
      setError(null);
      
      console.log('Intentando iniciar sesión con Warpcast...');
      
      if (!sdk) {
        throw new Error('SDK de Farcaster no disponible');
      }
      
      // Primero intentar obtener el usuario actual (por si ya está autenticado)
      const currentUser = await sdk.getUser();
      if (currentUser && currentUser.fid) {
        console.log('Usuario ya autenticado:', currentUser);
        
        // Mapear a nuestro formato de usuario
        const mappedUser: User = {
          id: `farcaster-${currentUser.fid}`,
          username: currentUser.username || `farcaster-${currentUser.fid}`,
          avatar: currentUser.pfp || undefined,
          walletAddress: currentUser.custody_address || `0x${currentUser.fid.toString().padStart(40, '0')}`,
          fid: currentUser.fid,
          isFarcasterUser: true,
          verifiedWallet: !!currentUser.custody_address,
          chainId: 10 // Optimism es la cadena principal para Farcaster
        };
        
        setUser(mappedUser);
        setIsLoading(false);
        return mappedUser;
      }
      
      // Si no hay usuario, intentar sign-in
      console.log('No hay usuario, intentando sign-in...');
      await sdk.actions.signIn();
      
      // Añadir un breve delay para permitir que Warpcast procese la autenticación
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Obtener usuario después del sign-in
      const newUser = await sdk.getUser();
      if (newUser && newUser.fid) {
        console.log('Usuario obtenido después de sign-in:', newUser);
        
        // Mapear a nuestro formato de usuario
        const mappedUser: User = {
          id: `farcaster-${newUser.fid}`,
          username: newUser.username || `farcaster-${newUser.fid}`,
          avatar: newUser.pfp || undefined,
          walletAddress: newUser.custody_address || `0x${newUser.fid.toString().padStart(40, '0')}`,
          fid: newUser.fid,
          isFarcasterUser: true,
          verifiedWallet: !!newUser.custody_address,
          chainId: 10 // Optimism
        };
        
        setUser(mappedUser);
        setIsLoading(false);
        return mappedUser;
      }
      
      console.log('No se pudo obtener usuario después de sign-in');
      setIsLoading(false);
      return null;
    } catch (e) {
      console.error('Error en sign-in:', e);
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setIsLoading(false);
      return null;
    }
  }, [hasAttemptedSignIn]);

  // Función para cerrar sesión
  const signOut = useCallback(() => {
    setUser(null);
    console.log('Sesión cerrada');
  }, []);

  // Función para reintentar la autenticación
  const retry = useCallback(() => {
    setHasAttemptedSignIn(false);
    return signIn();
  }, [signIn]);

  return {
    user,
    isLoading,
    isWarpcastApp,
    hasAttemptedSignIn,
    error,
    signIn,
    signOut,
    retry
  };
} 