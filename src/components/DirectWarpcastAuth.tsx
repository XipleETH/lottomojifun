import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User } from '../types';
import { toast } from 'react-hot-toast';

// Intentar obtener el SDK de Farcaster de manera más agresiva
// Esto es crítico para evitar errores con versiones del SDK
let sdkAttempts = 0;
let sdk: any;

const getSdk = () => {
  if (sdk) return sdk;
  
  try {
    // Intentar múltiples formas de obtener el SDK
    const possibleSdks = [
      require('@farcaster/frame-sdk')?.sdk,
      window.Farcaster?.sdk,
      window.frameWarpcast?.sdk,
      (window as any).fc_sdk,
      (window as any).farcaster?.sdk,
      (window as any).frame?.sdk,
      (window as any)._farcaster?.sdk
    ];
    
    // Usar el primer SDK válido que encontremos
    for (const possibleSdk of possibleSdks) {
      if (possibleSdk && typeof possibleSdk === 'object') {
        console.log('SDK encontrado:', possibleSdk);
        sdk = possibleSdk;
        return sdk;
      }
    }
    
    console.warn(`SDK no encontrado en intento ${++sdkAttempts}`);
    return null;
  } catch (e) {
    console.error('Error buscando SDK de Farcaster:', e);
    return null;
  }
};

// Realizar un intento inicial
getSdk();

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
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  
  // Crear usuario genérico cuando no hay otra opción
  const createEmergencyUser = useCallback(() => {
    try {
      console.log('Creando usuario genérico de emergencia para Warpcast');
      
      // Intentar extraer alguna información útil
      let existingData = {};
      try {
        // Revisar localStorage por cualquier información útil
        const storedData = localStorage.getItem('farcaster_user') || 
                         localStorage.getItem('warpcast_user') || 
                         localStorage.getItem('warpcast_generic_user');
        
        if (storedData) {
          existingData = JSON.parse(storedData);
          console.log('Datos encontrados en localStorage:', existingData);
        }
      } catch (e) {
        console.warn('Error leyendo localStorage:', e);
      }
      
      // Generar ID único para este usuario
      const timestamp = Date.now();
      const tempId = `farcaster-emergency-${timestamp}`;
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
      
      console.log('Usuario de emergencia para Warpcast creado:', genericUser);
      
      // Guardar en localStorage para uso futuro
      try {
        localStorage.setItem('warpcast_generic_user', JSON.stringify(genericUser));
      } catch (e) {
        console.warn('Error guardando usuario genérico en localStorage:', e);
      }
      
      onAuthSuccess?.(genericUser);
      setIsLoading(false);
      setError(null);
    } catch (e) {
      console.error('Error creando usuario genérico de emergencia:', e);
      setError('Error creando usuario para Warpcast');
    }
  }, [onAuthSuccess]);
  
  // Detectar si estamos en Warpcast con métodos mejorados
  useEffect(() => {
    const detectWarpcast = async () => {
      try {
        // Intentar obtener SDK nuevamente
        const currentSdk = getSdk();
        
        // Métodos directos de detección
        const inIframe = window !== window.parent;
        const isWarpcastDomain = 
          window.location.hostname.includes('warpcast') || 
          window.location.href.includes('warpcast.com') ||
          (document.referrer && document.referrer.includes('warpcast'));
        
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
        const isWarpcast = inIframe || isWarpcastDomain || !!currentSdk || hasFrameGlobals || 
                         (isMobileDevice && (hasDarkMode || hasWarpcastParams));
                         
        // Actualizar intentos de detección
        setDetectionAttempts(prev => prev + 1);
        
        console.log('Detección mejorada Warpcast (intento ' + detectionAttempts + '):', { 
          inIframe, 
          isWarpcastDomain, 
          hasFrameGlobals,
          isMobileDevice,
          hasDarkMode,
          hasWarpcastParams,
          isWarpcast,
          sdk: !!currentSdk
        });
        
        setIsInWarpcast(isWarpcast);
        
        // Si no es Warpcast después de 3 intentos, detener
        if (!isWarpcast && detectionAttempts >= 3) {
          setIsLoading(false);
          return;
        }

        // Si ya intentamos 3 veces y estamos en Warpcast, pero sin SDK
        if (isWarpcast && detectionAttempts >= 3 && !currentSdk) {
          console.log('SDK no disponible después de múltiples intentos. Creando usuario genérico de emergencia.');
          createEmergencyUser();
          return;
        }
        
        // Si detectamos warpcast pero sin SDK, programar otro intento
        if (isWarpcast && !currentSdk && detectionAttempts < 3) {
          console.log(`SDK no disponible en intento ${detectionAttempts}. Intentando de nuevo en 500ms...`);
          setTimeout(() => detectWarpcast(), 500);
          return;
        }
        
        // Inicializar SDK si está disponible
        if (currentSdk && isWarpcast) {
          try {
            await Promise.race([
              currentSdk.actions.ready(),
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
              createEmergencyUser();
            } else {
              setError('Error al inicializar SDK de Farcaster');
              onAuthFailure?.('Error al inicializar SDK de Farcaster');
            }
          }
        } else if (isWarpcast && !currentSdk) {
          // Si estamos en Warpcast pero no hay SDK, crear usuario genérico
          console.log('En Warpcast pero sin SDK disponible, creando usuario genérico');
          createEmergencyUser();
        }
      } catch (e) {
        console.error('Error en detección de Warpcast:', e);
        // Si hay error pero la detección indicó Warpcast, crear usuario genérico
        if (isInWarpcast) {
          createEmergencyUser();
        }
      }
    };
    
    detectWarpcast();
  }, [detectionAttempts, autoSignIn, onAuthFailure, isInWarpcast, createEmergencyUser]);
  
  // Función para iniciar sesión
  const signIn = useCallback(async () => {
    try {
      const currentSdk = getSdk();
      
      if (!currentSdk && !isInWarpcast) {
        const errorMsg = 'SDK de Farcaster no disponible';
        setError(errorMsg);
        onAuthFailure?.(errorMsg);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Si no hay SDK pero estamos en Warpcast, usar usuario genérico
      if (!currentSdk && isInWarpcast) {
        console.log('Sin SDK pero en Warpcast, creando usuario genérico');
        createEmergencyUser();
        return;
      }
      
      console.log('Intentando obtener usuario actual desde SDK...');
      
      // Intentar obtener usuario actual primero
      try {
        const currentUser = await Promise.race([
          currentSdk.getUser(),
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
          createEmergencyUser();
          return;
        }
      }
      
      // Si no hay usuario actual, intentar sign-in
      console.log('No se encontró usuario actual, intentando sign-in...');
      
      try {
        await Promise.race([
          currentSdk.actions.signIn(),
          new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
        ]);
        
        // Verificar usuario después de sign-in
        const newUser = await currentSdk.getUser();
        
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
          createEmergencyUser();
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
          createEmergencyUser();
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
        createEmergencyUser();
      } else {
        setError(errorMsg);
        onAuthFailure?.(errorMsg);
        toast.error('Error conectando con Warpcast');
        setIsLoading(false);
      }
    }
  }, [onAuthSuccess, onAuthFailure, isInWarpcast, createEmergencyUser]);
  
  // Si no estamos en Warpcast después de múltiples intentos, mostrar mensaje
  if (!isInWarpcast && detectionAttempts >= 3) {
    return (
      <div className="text-center p-2 bg-gray-100 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          Este botón es para usuarios de Warpcast.
        </p>
      </div>
    );
  }
  
  // Mientras estamos detectando, mostrar estado de carga
  if (detectionAttempts < 3 && !isInWarpcast) {
    return (
      <div className="text-center p-2 bg-blue-100 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          Detectando entorno Warpcast...
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