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
  const [isOnchainWarpcast, setIsOnchainWarpcast] = useState(false);

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
      console.log('Creando usuario genérico para permitir tickets (MODO DESARROLLO)');
      
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
      
      console.log('Usuario genérico creado para permitir tickets:', genericUser);
      
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
          
          // SIEMPRE creamos un usuario genérico si no hay usuario después del timeout
          if (!userRef.current) {
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
      
      // SIEMPRE creamos un usuario genérico si hay un error en la conexión
      console.log('Creando usuario genérico después de error en conexión');
      createGenericUser();
      
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
        setIsOnchainWarpcast(hasOnchainContext);
        
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
        }
        
        // MODIFICACIÓN IMPORTANTE: SIEMPRE crear un usuario genérico si no hay usuario después de los intentos
        // Esto permitirá la creación de tickets incluso en el navegador normal
        if (!userRef.current && !hasCheckedUserData) {
          console.log('Sin usuario detectado después de verificación de entorno. Usando usuario genérico.');
          setTimeout(() => {
            if (!userRef.current && !hasCheckedUserData) {
              console.log('Creando usuario genérico para permitir tickets...');
              createGenericUser();
            }
          }, 1000);
        }
      } catch (e) {
        console.error('Error detectando Warpcast:', e);
        
        // En caso de error, también crear usuario genérico
        if (!userRef.current && !hasCheckedUserData) {
          console.log('Error detectando entorno. Usando usuario genérico por defecto.');
          createGenericUser();
        }
      }
    };
    
    detectWarpcast();
  }, [context, detectSdk, sdkDetectionAttempts, createGenericUser, hasCheckedUserData]);

  // Efecto para manejar cambios en el contexto de OnchainKit
  useEffect(() => {
    const updateUserFromContext = async () => {
      try {
        if (!context) {
          console.log('Todavía no hay contexto de OnchainKit disponible');
          return;
        }
        
        console.log('Contexto de OnchainKit recibido:', {
          hasClient: !!context.client,
          hasChain: !!context.chain,
          hasAccount: !!context.walletClient?.account,
          hasProperties: Object.keys(context || {})
        });
        
        // Verificar si tenemos un cliente y una cuenta
        if (context.walletClient?.account) {
          const account = context.walletClient.account;
          const chain = context.chain;
          
          console.log('Cuenta de OnchainKit disponible:', {
            address: account.address,
            chainId: chain?.id
          });
          
          // Crear un usuario a partir del contexto
          const newUser: User = {
            id: `onchain-${account.address}`,
            username: `Onchain User`,
            walletAddress: account.address,
            isFarcasterUser: true, // Se considera usuario de Farcaster por OnchainKit
            verifiedWallet: true,
            chainId: chain?.id || 10
          };
          
          console.log('Usuario creado desde OnchainKit:', newUser);
          
          setUser(newUser);
          setIsLoading(false);
          setHasCheckedUserData(true);
        } else {
          console.log('Sin cuenta de wallet disponible en contexto OnchainKit');
          
          // Si no hay usuario después de detectar contexto, crear uno genérico
          if (!userRef.current && !hasCheckedUserData) {
            createGenericUser();
          }
        }
      } catch (e) {
        console.error('Error procesando contexto de OnchainKit:', e);
        
        // En caso de error, generar usuario genérico
        if (!userRef.current) {
          createGenericUser();
        }
      }
    };
    
    updateUserFromContext();
  }, [context, createGenericUser, hasCheckedUserData]);

  // Desconectar
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      await signOut();
      setUser(null);
      setError(null);
      setHasCheckedUserData(false);
      
      // Limpiar localStorage
      try {
        localStorage.removeItem('warpcast_generic_user');
        localStorage.removeItem('farcaster_user');
      } catch (e) {
        console.warn('Error limpiando localStorage:', e);
      }
      
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error('Error en desconexión:', e);
      setError(`Error en desconexión: ${e instanceof Error ? e.message : String(e)}`);
      setIsLoading(false);
      return false;
    }
  }, [signOut]);

  return {
    user,
    isLoading,
    error,
    connect,
    disconnect,
    isWarpcastApp,
    isOnchainWarpcast,
    isFarcasterAvailable: !!detectSdk()
  };
} 