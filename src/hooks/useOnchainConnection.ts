import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [sdkDetectionAttempts, setSdkDetectionAttempts] = useState(0);

  // Utilizar los hooks de OnchainKit
  const { context } = useMiniKit();
  const { signIn, signOut } = useAuthenticate();
  
  // Referencias para evitar dependencias circulares
  const userRef = useRef<User | null>(null);
  const isLoadingRef = useRef(true);
  const isWarpcastAppRef = useRef(false);
  
  // Actualizar referencias cuando cambian los estados
  useEffect(() => {
    userRef.current = user;
    isLoadingRef.current = isLoading;
    isWarpcastAppRef.current = isWarpcastApp;
  }, [user, isLoading, isWarpcastApp]);

  // Intentar detectar SDK de forma más agresiva
  const detectSdk = useCallback(() => {
    const sdkGlobals = [
      window.Farcaster?.sdk,
      window.frameWarpcast?.sdk,
      (window as any).fc_sdk,
      (window as any).farcaster?.sdk,
      (window as any).frame?.sdk,
      (window as any)._farcaster?.sdk
    ];
    
    // Intentar encontrar cualquier objeto SDK disponible
    const availableSdk = sdkGlobals.find(sdk => sdk && typeof sdk === 'object');
    
    console.log('Intentando detectar SDK más agresivamente:', { 
      availableSdk: !!availableSdk,
      attempt: sdkDetectionAttempts + 1
    });
    
    return availableSdk;
  }, [sdkDetectionAttempts]);

  // Crear usuario genérico con información mejorada - sin dependencia circular
  const createGenericUser = useCallback(() => {
    try {
      console.log('Creando usuario genérico de Warpcast');
      
      // Intentar extraer alguna información útil
      let existingData = {};
      try {
        // Revisar localStorage por cualquier información útil
        const storedData = localStorage.getItem('farcaster_user') || 
                         localStorage.getItem('warpcast_user') || 
                         localStorage.getItem('fc_user');
        
        if (storedData) {
          existingData = JSON.parse(storedData);
          console.log('Datos encontrados en localStorage:', existingData);
        }
      } catch (e) {
        console.warn('Error leyendo localStorage:', e);
      }
      
      // Generar ID único para este usuario
      const timestamp = Date.now();
      const tempId = `farcaster-warpcast-${timestamp}`;
      const tempAddr = `0x${timestamp.toString(16).padStart(40, '0')}`;
      
      // Usar información existente o valores por defecto
      const genericUser: User = {
        id: (existingData as any)?.id || tempId,
        username: (existingData as any)?.username || 'Warpcast User',
        walletAddress: (existingData as any)?.walletAddress || tempAddr,
        fid: (existingData as any)?.fid || 0,
        isFarcasterUser: true,
        verifiedWallet: false,
        chainId: 10 // Optimism por defecto
      };
      
      console.log('Usuario genérico creado para Warpcast (emergencia):', genericUser);
      
      // Guardar en localStorage para uso futuro
      try {
        localStorage.setItem('warpcast_generic_user', JSON.stringify(genericUser));
      } catch (e) {
        console.warn('Error guardando usuario genérico en localStorage:', e);
      }
      
      setUser(genericUser);
      setIsLoading(false);
      setHasCheckedUserData(true);
      return genericUser;
    } catch (e) {
      console.error('Error creando usuario genérico:', e);
      return null;
    }
  }, []);

  // Función para iniciar sesión - definida antes de ser usada en useEffect
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
        if (isLoadingRef.current) {
          console.log('Timeout de espera de contexto después de signIn');
          
          // Si estamos en Warpcast pero sin wallet después del timeout, crear usuario genérico
          if (isWarpcastAppRef.current && !userRef.current) {
            console.log('Creando usuario genérico después del timeout');
            createGenericUser();
          } else {
            setIsLoading(false);
          }
        }
      }, 2000);
      
      return true;
    } catch (e) {
      console.error('Error en conexión con OnchainKit:', e);
      setError(`Error en conexión: ${e instanceof Error ? e.message : String(e)}`);
      
      // Si hay error y estamos en Warpcast, crear usuario genérico para que la aplicación funcione
      if (isWarpcastAppRef.current) {
        console.log('Creando usuario genérico después de error en conexión');
        createGenericUser();
      } else {
        setIsLoading(false);
        setHasCheckedUserData(true);
      }
      
      return false;
    }
  }, [signIn, createGenericUser]);

  // Detectar si estamos en Warpcast con métodos mejorados
  useEffect(() => {
    const detectWarpcast = async () => {
      try {
        // Métodos directos de detección
        const inIframe = window !== window.parent;
        const isWarpcastDomain = 
          window.location.hostname.includes('warpcast') || 
          window.location.href.includes('warpcast.com') ||
          (document.referrer && document.referrer.includes('warpcast'));
        
        // Verificar información de OnchainKit
        const hasOnchainContext = !!context?.client;
        
        // Buscar señales de Frame en window - AMPLIADO
        const hasFrameGlobals = !!(
          window.Farcaster || 
          window.frameWarpcast || 
          window.warpcast || 
          (window as any).fc_frame ||
          (window as any).fcFrame ||
          (window as any).frame ||
          (window as any)._farcaster ||
          document.querySelector('meta[property="fc:frame"]') ||
          document.querySelector('meta[property="fc:frame:image"]') ||
          document.querySelector('meta[name="fc:frame"]')
        );
        
        // Verificar si hay un tema oscuro - común en aplicaciones móviles
        const hasDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Verificar el UserAgent para detectar características de dispositivos móviles
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // URL o hash params específicos
        const hasWarpcastParams = 
          window.location.search.includes('warpcast') || 
          window.location.hash.includes('warpcast') ||
          window.location.search.includes('fid=');
        
        // Determinar si estamos en Warpcast
        const detected = inIframe || isWarpcastDomain || hasOnchainContext || hasFrameGlobals || 
                       (isMobileDevice && (hasDarkMode || hasWarpcastParams));
        
        console.log('Detección mejorada de entorno Warpcast (OnchainKit):', {
          inIframe,
          isWarpcastDomain,
          hasOnchainContext,
          hasFrameGlobals,
          isMobileDevice,
          hasDarkMode,
          hasWarpcastParams,
          detected,
          contextExists: !!context
        });
        
        setIsWarpcastApp(detected);
        
        // Si estamos en Warpcast, buscar SDK más agresivamente
        if (detected) {
          const sdk = detectSdk();
          
          // Si no hay SDK y estamos en Warpcast, intentar otra vez
          if (!sdk && sdkDetectionAttempts < 3) {
            setSdkDetectionAttempts(prev => prev + 1);
            setTimeout(() => detectWarpcast(), 500); // Reintento
            return;
          }
          
          // Si estamos en Warpcast y no tenemos un SDK después de varios intentos,
          // creamos un usuario genérico para permitir la experiencia
          if (!sdk && sdkDetectionAttempts >= 3 && !userRef.current && !hasCheckedUserData) {
            console.log('En Warpcast pero sin SDK después de múltiples intentos. Usando usuario genérico de emergencia.');
            createGenericUser();
            return;
          }
          
          // Si detectamos que estamos en Warpcast, intentamos inicializar la conexión
          if (detected && !hasCheckedUserData && !userRef.current) {
            // Intento de autenticación automática
            setTimeout(() => {
              if (!userRef.current && !hasCheckedUserData) {
                console.log('Iniciando verificación automática de usuario en Warpcast...');
                connect(true);
              }
            }, 500);
          }
        } else {
          // Si no estamos en Warpcast, terminar carga
          if (isLoadingRef.current && !userRef.current) {
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error('Error detectando Warpcast:', e);
        setError(`Error detectando entorno: ${e instanceof Error ? e.message : String(e)}`);
        
        // Si hay un error, pero tenemos razones para creer que estamos en Warpcast
        // crear un usuario genérico por seguridad
        if (window !== window.parent || window.location.href.includes('warpcast')) {
          console.log('Error en detección, pero posiblemente en Warpcast. Usando usuario genérico.');
          createGenericUser();
        } else {
          setIsLoading(false);
        }
      }
    };
    
    detectWarpcast();
  }, [context, hasCheckedUserData, sdkDetectionAttempts, detectSdk, createGenericUser, connect]);

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
            if (isWarpcastAppRef.current) {
              console.log('En Warpcast pero sin wallet detectada, creando usuario genérico');
              createGenericUser();
            } else {
              console.log('No hay wallet y no estamos en Warpcast');
              setUser(null);
            }
          }
          
          setHasCheckedUserData(true);
          setIsLoading(false);
        } else {
          // Si no hay contexto pero estamos en Warpcast, crear usuario genérico
          if (isWarpcastAppRef.current && !hasCheckedUserData) {
            console.log('Sin contexto OnchainKit pero en Warpcast, creando usuario genérico');
            createGenericUser();
          }
          
          if (!isLoadingRef.current || hasCheckedUserData) {
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error('Error actualizando usuario desde contexto:', e);
        setError(`Error actualizando usuario: ${e instanceof Error ? e.message : String(e)}`);
        
        // Si hay error pero estamos en Warpcast, crear usuario genérico
        if (isWarpcastAppRef.current && !userRef.current) {
          createGenericUser();
        } else {
          setIsLoading(false);
          setHasCheckedUserData(true);
        }
      }
    };
    
    updateUserFromContext();
  }, [context, hasCheckedUserData, createGenericUser]);

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

  // Si estamos en modo agresivo y ya intentamos 3 veces, pero seguimos cargando,
  // crear un usuario genérico como último recurso
  useEffect(() => {
    if (isWarpcastApp && isLoading && sdkDetectionAttempts >= 3 && !user) {
      console.log('Después de múltiples intentos y detección positiva de Warpcast, creando usuario de emergencia');
      createGenericUser();
    }
  }, [isWarpcastApp, isLoading, sdkDetectionAttempts, user, createGenericUser]);

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