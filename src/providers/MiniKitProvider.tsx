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

  // Verificar si estamos en la app de Warpcast
  useEffect(() => {
    const checkWarpcastEnvironment = async () => {
      try {
        if (!sdk) return;
        
        // Verificar si el SDK está listo
        await sdk.actions.ready();
        setIsFarcasterReady(true);
        
        // Verificar si estamos en Warpcast
        const isFrame = await sdk.isFrameAvailable();
        setIsWarpcastApp(isFrame);
        
        console.log('Farcaster environment:', { isFrame });
        
        // Si estamos en Warpcast, intentamos obtener el usuario automáticamente
        if (isFrame) {
          await checkAndSetFarcasterUser();
        }
      } catch (error) {
        console.error('Error checking Farcaster environment:', error);
      }
    };
    
    checkWarpcastEnvironment();
  }, []);

  // Función para obtener y mapear el usuario de Farcaster
  const checkAndSetFarcasterUser = async () => {
    try {
      if (!sdk) {
        console.log('SDK no disponible');
        return false;
      }
      
      const user = await sdk.getUser();
      if (!user) {
        console.log('No hay usuario autenticado en Farcaster');
        setFarcasterUser(null);
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
      
      console.log('Usuario de Farcaster mapeado:', mappedUser);
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
      
      // En Warpcast, usamos el método signIn para conectar
      if (isWarpcastApp) {
        // Este método puede cambiar según la versión del SDK
        await sdk.actions.signIn();
        await checkAndSetFarcasterUser();
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
  };

  // Verificar conexión con Farcaster
  const checkFarcasterConnection = async () => {
    return await checkAndSetFarcasterUser();
  };

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