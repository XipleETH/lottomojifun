import React, { createContext, useContext, useEffect, useState } from 'react';
import { MiniKitProvider as OnchainMiniKitProvider } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { User } from '../types';

interface MiniKitContextType {
  farcasterUser: User | null;
  isFarcasterReady: boolean;
  isWarpcastApp: boolean;
  connectFarcaster: () => Promise<void>;
  disconnectFarcaster: () => void;
  checkFarcasterConnection: () => Promise<boolean>;
}

const MiniKitContext = createContext<MiniKitContextType>({
  farcasterUser: null,
  isFarcasterReady: false,
  isWarpcastApp: false,
  connectFarcaster: async () => {},
  disconnectFarcaster: () => {},
  checkFarcasterConnection: async () => false
});

export const useMiniKitAuth = () => useContext(MiniKitContext);

interface MiniKitAuthProviderProps {
  children: React.ReactNode;
}

export const MiniKitAuthProvider: React.FC<MiniKitAuthProviderProps> = ({ children }) => {
  const [farcasterUser, setFarcasterUser] = useState<User | null>(null);
  const [isFarcasterReady, setIsFarcasterReady] = useState(false);
  const [isWarpcastApp, setIsWarpcastApp] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Verificar si estamos en la app de Warpcast
  useEffect(() => {
    const checkWarpcastEnvironment = async () => {
      try {
        // Marcar como inicializado incluso si hay errores
        setTimeout(() => {
          if (!isInitialized) {
            console.log('Forzando inicialización tras timeout');
            setIsInitialized(true);
          }
        }, 2000);

        if (!sdk) {
          console.error('ERROR: SDK de Farcaster no está disponible');
          setIsInitialized(true);
          return;
        }
        
        console.log('Inicializando SDK de Farcaster...');
        
        try {
          // Verificar si el SDK está listo
          await sdk.actions.ready();
          setIsFarcasterReady(true);
          console.log('SDK de Farcaster listo');
          
          // Verificar si estamos en Warpcast
          const isFrame = await sdk.isFrameAvailable();
          setIsWarpcastApp(isFrame);
          
          console.log('Entorno de Farcaster detectado:', { 
            isFrame,
            isSdkAvailable: !!sdk,
            signer: !!sdk.signer
          });
          
          // Si estamos en Warpcast, intentamos obtener el usuario automáticamente
          if (isFrame) {
            console.log('Detectado Warpcast, obteniendo usuario automáticamente...');
            await checkAndSetFarcasterUser();
          } else {
            console.log('No estamos en Warpcast. El usuario deberá conectarse manualmente.');
          }
        } catch (error) {
          console.error('Error durante la inicialización de Farcaster:', error);
        } finally {
          // Marcar como inicializado sin importar el resultado
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error crítico en checkWarpcastEnvironment:', error);
        setIsInitialized(true);
      }
    };
    
    checkWarpcastEnvironment();
  }, []);

  // Función para obtener y mapear el usuario de Farcaster
  const checkAndSetFarcasterUser = async () => {
    try {
      if (!sdk) {
        console.error('SDK no disponible');
        return false;
      }
      
      console.log('Solicitando información de usuario a Farcaster...');
      const user = await sdk.getUser();
      console.log('Respuesta de Farcaster getUser:', user);
      
      if (!user) {
        console.log('No hay usuario autenticado en Farcaster');
        setFarcasterUser(null);
        return false;
      }
      
      // Verificar que tenemos la información mínima necesaria
      if (!user.fid) {
        console.error('ERROR: Usuario de Farcaster sin FID:', user);
        return false;
      }
      
      // Mapear los datos del usuario de Farcaster
      const mappedUser: User = {
        id: `farcaster-${user.fid}`,
        username: user.username || `farcaster-${user.fid}`,
        avatar: user.pfp || undefined,
        walletAddress: user.custody_address || undefined,
        fid: user.fid,
        isFarcasterUser: true,
        verifiedWallet: !!user.custody_address,
        chainId: 10 // Optimism (cadena principal de Farcaster)
      };
      
      console.log('Usuario de Farcaster mapeado exitosamente:', mappedUser);
      setFarcasterUser(mappedUser);
      return true;
    } catch (error) {
      console.error('Error obteniendo usuario de Farcaster:', error);
      return false;
    }
  };

  // Conectar con Farcaster
  const connectFarcaster = async () => {
    try {
      if (!sdk) {
        console.error('SDK de Farcaster no disponible');
        return;
      }
      
      console.log('Intentando conectar con Farcaster...');
      
      // En Warpcast, usamos el método signIn para conectar
      if (isWarpcastApp) {
        console.log('Conectando en entorno Warpcast...');
        // Este método puede cambiar según la versión del SDK
        await sdk.actions.signIn();
        console.log('Sign-in de Farcaster completado, verificando usuario...');
        const success = await checkAndSetFarcasterUser();
        
        if (success) {
          console.log('Conexión con Farcaster exitosa');
        } else {
          console.error('ERROR: No se pudo obtener usuario después de signIn');
        }
      } else {
        // En un navegador normal, podemos redirigir a Warpcast o mostrar instrucciones
        console.log('Esta funcionalidad solo está disponible en Warpcast');
        // Alternativamente, podríamos redirigir a Warpcast usando window.location
      }
    } catch (error) {
      console.error('Error conectando con Farcaster:', error);
    }
  };

  // Desconectar de Farcaster
  const disconnectFarcaster = () => {
    setFarcasterUser(null);
    console.log('Usuario de Farcaster desconectado');
  };

  // Verificar conexión con Farcaster
  const checkFarcasterConnection = async () => {
    return await checkAndSetFarcasterUser();
  };

  // Si aún no estamos inicializados, mostrar un estado intermedio
  if (!isInitialized) {
    console.log('MiniKitProvider aún inicializando...');
    // No bloqueamos el renderizado, continuamos con valores predeterminados
  }

  return (
    <MiniKitContext.Provider
      value={{
        farcasterUser,
        isFarcasterReady,
        isWarpcastApp,
        connectFarcaster,
        disconnectFarcaster,
        checkFarcasterConnection
      }}
    >
      {children}
    </MiniKitContext.Provider>
  );
};

// Este es el proveedor combinado que usaremos en nuestra aplicación
export const MiniKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <OnchainMiniKitProvider>
      <MiniKitAuthProvider>
        {children}
      </MiniKitAuthProvider>
    </OnchainMiniKitProvider>
  );
}; 