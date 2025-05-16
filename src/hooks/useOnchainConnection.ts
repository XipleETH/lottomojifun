import { useState, useEffect, useCallback } from 'react';
import { useAuthenticate, useMiniKit } from '@coinbase/onchainkit/minikit';
import { User } from '../types';

/**
 * Hook optimizado para usar exclusivamente OnchainKit para conectar con la billetera de Farcaster
 */
export function useOnchainConnection() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWarpcastApp, setIsWarpcastApp] = useState(false);
  const [hasCheckedUserData, setHasCheckedUserData] = useState(false);

  // Utilizar los hooks de OnchainKit
  const { context } = useMiniKit();
  const { signIn, signOut } = useAuthenticate();

  // Detectar si estamos en Warpcast con métodos mejorados
  useEffect(() => {
    const detectWarpcast = () => {
      try {
        // Métodos directos de detección
        const inIframe = window !== window.parent;
        const isWarpcastDomain = 
          window.location.hostname.includes('warpcast') || 
          window.location.href.includes('warpcast.com') ||
          (document.referrer && document.referrer.includes('warpcast'));
        
        // Verificar información de OnchainKit
        const hasOnchainContext = !!context?.client;
        
        // Buscar señales de Frame en window
        const hasFrameGlobals = !!(
          window.Farcaster || 
          window.frameWarpcast || 
          window.warpcast || 
          (window as any).fc_frame ||
          document.querySelector('meta[property="fc:frame"]')
        );
        
        // Determinar si estamos en Warpcast
        const detected = inIframe || isWarpcastDomain || hasOnchainContext || hasFrameGlobals;
        
        console.log('Detección mejorada de entorno Warpcast (OnchainKit):', {
          inIframe,
          isWarpcastDomain,
          hasOnchainContext,
          hasFrameGlobals,
          detected,
          context: context || "No disponible"
        });
        
        setIsWarpcastApp(detected);
        
        // Si detectamos que estamos en Warpcast, intentamos inicializar la conexión
        if (detected && !hasCheckedUserData) {
          // Intento simplificado de autenticación automática
          setTimeout(() => {
            if (!user && !hasCheckedUserData) {
              console.log('Iniciando verificación automática de usuario en Warpcast...');
              connect(true);
            }
          }, 500);
        }
      } catch (e) {
        console.error('Error detectando Warpcast:', e);
        setError(`Error detectando entorno: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    
    detectWarpcast();
  }, [context, user, hasCheckedUserData]);

  // Mapear la información de MiniKit a nuestro formato de usuario
  useEffect(() => {
    const updateUserFromContext = async () => {
      try {
        if (context?.client) {
          console.log('Contexto OnchainKit disponible:', context.client);
          
          // Verificar si tenemos información de wallet
          if (context.client.wallet?.address) {
            const { address, chainId } = context.client.wallet;
            
            console.log('Información de wallet disponible en OnchainKit:', { address, chainId });
            
            // Intentar obtener FID
            let fid = 0;
            try {
              // Intentar obtener desde localStorage
              const storedData = localStorage.getItem('farcaster_user');
              if (storedData) {
                const userData = JSON.parse(storedData);
                fid = userData.fid || 0;
              }
            } catch (e) {
              console.warn('No se pudo recuperar FID del almacenamiento:', e);
            }
            
            // Crear el objeto de usuario con la información disponible
            const newUser: User = {
              id: `farcaster-wallet-${address}`,
              username: `user-${address.substring(0, 6)}`,
              walletAddress: address,
              fid: fid,
              isFarcasterUser: true,
              verifiedWallet: true,
              chainId: chainId || 10 // Asumimos Optimism por defecto
            };
            
            console.log('Usuario creado desde OnchainKit:', newUser);
            setUser(newUser);
          } else if (!hasCheckedUserData) {
            // Si no hay wallet pero estamos en Warpcast, crear un usuario genérico
            if (isWarpcastApp) {
              console.log('En Warpcast pero sin wallet detectada, creando usuario genérico');
              
              // Generar ID único para este usuario
              const tempId = `farcaster-temp-${Date.now()}`;
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
              
              console.log('Usuario genérico creado para Warpcast:', genericUser);
              setUser(genericUser);
            } else {
              console.log('No hay wallet y no estamos en Warpcast');
              setUser(null);
            }
          }
          
          setHasCheckedUserData(true);
          setIsLoading(false);
        } else {
          // Si no hay contexto pero estamos en Warpcast, crear usuario genérico
          if (isWarpcastApp && !hasCheckedUserData) {
            console.log('Sin contexto OnchainKit pero en Warpcast, creando usuario genérico');
            
            // Generar ID único para este usuario
            const tempId = `farcaster-temp-${Date.now()}`;
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
            
            console.log('Usuario genérico creado para Warpcast sin contexto:', genericUser);
            setUser(genericUser);
            setHasCheckedUserData(true);
          }
          
          if (!isLoading || hasCheckedUserData) {
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error('Error actualizando usuario desde contexto:', e);
        setError(`Error actualizando usuario: ${e instanceof Error ? e.message : String(e)}`);
        setIsLoading(false);
        setHasCheckedUserData(true);
      }
    };
    
    updateUserFromContext();
  }, [context, isWarpcastApp, hasCheckedUserData, isLoading]);

  // Función para iniciar sesión
  const connect = useCallback(async (isAutoConnect = false) => {
    try {
      if (!isAutoConnect) {
        setIsLoading(true);
      }
      setError(null);
      
      console.log('Iniciando conexión con OnchainKit...');
      
      // Intentar iniciar sesión con OnchainKit
      await signIn({
        domain: window.location.host,
        siweUri: window.location.origin,
        resources: [window.location.origin]
      });
      
      console.log('Conexión con OnchainKit exitosa, esperando información de contexto...');
      
      // La actualización del usuario ocurrirá a través del efecto que observa el contexto
      setHasCheckedUserData(true);
      
      // Pero añadimos un timeout para evitar esperas interminables
      setTimeout(() => {
        if (isLoading) {
          console.log('Timeout de espera de contexto después de signIn');
          
          // Si estamos en Warpcast pero sin wallet después del timeout, crear usuario genérico
          if (isWarpcastApp && !user) {
            console.log('Creando usuario genérico después del timeout');
            const tempId = `farcaster-timeout-${Date.now()}`;
            const tempAddr = `0x${tempId.substring(tempId.length - 40)}`;
            
            const timeoutUser: User = {
              id: tempId,
              username: 'Warpcast User',
              walletAddress: tempAddr,
              fid: 0,
              isFarcasterUser: true,
              verifiedWallet: false,
              chainId: 10
            };
            
            setUser(timeoutUser);
          }
          
          setIsLoading(false);
        }
      }, 2000);
      
      return true;
    } catch (e) {
      console.error('Error en conexión con OnchainKit:', e);
      setError(`Error en conexión: ${e instanceof Error ? e.message : String(e)}`);
      
      // Si hay error y estamos en Warpcast, crear usuario genérico para que la aplicación funcione
      if (isWarpcastApp) {
        console.log('Creando usuario genérico después de error en conexión');
        const tempId = `farcaster-error-${Date.now()}`;
        const tempAddr = `0x${tempId.substring(tempId.length - 40)}`;
        
        const errorUser: User = {
          id: tempId,
          username: 'Warpcast User',
          walletAddress: tempAddr,
          fid: 0,
          isFarcasterUser: true,
          verifiedWallet: false,
          chainId: 10
        };
        
        setUser(errorUser);
      }
      
      setIsLoading(false);
      setHasCheckedUserData(true);
      return false;
    }
  }, [signIn, isLoading, isWarpcastApp, user]);

  // Función para cerrar sesión
  const disconnect = useCallback(async () => {
    try {
      await signOut();
      setUser(null);
      setHasCheckedUserData(false);
      console.log('Sesión cerrada');
      return true;
    } catch (e) {
      console.error('Error en cierre de sesión:', e);
      setError(`Error en cierre de sesión: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }, [signOut]);

  return {
    user,
    isLoading,
    error,
    isWarpcastApp,
    isConnected: !!user,
    connect,
    disconnect
  };
} 