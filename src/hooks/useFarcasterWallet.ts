import { useState, useEffect, useCallback } from 'react';
import { useMiniKit, useAuthenticate } from '@coinbase/onchainkit/minikit';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { sdk } from '@farcaster/frame-sdk';

interface FarcasterWalletHook {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  fid: number | null;
  username: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string | null>;
}

export const useFarcasterWallet = (): FarcasterWalletHook => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { context } = useMiniKit();
  const { signIn } = useAuthenticate();
  const { 
    farcasterUser,
    isFarcasterReady,
    isWarpcastApp,
    connectFarcaster
  } = useMiniKitAuth();

  // Determinar si está conectado
  const isConnected = !!farcasterUser && !!farcasterUser.walletAddress;
  
  // Obtener la dirección de la billetera
  const address = farcasterUser?.walletAddress || null;
  
  // Obtener el FID (Farcaster ID)
  const fid = farcasterUser?.fid || null;
  
  // Obtener el nombre de usuario
  const username = farcasterUser?.username || null;

  // Conectar con la billetera de Farcaster
  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Usar el método de signIn de OnchainKit si estamos en Warpcast
      if (isWarpcastApp) {
        // Si ya tenemos información del usuario de MiniKitAuthProvider
        if (farcasterUser) {
          return;
        }
        
        // Intentar conectar usando nuestro proveedor personalizado
        await connectFarcaster();
      } else {
        // En un navegador normal, usar el SDK de Frame
        if (sdk && isFarcasterReady) {
          try {
            await sdk.actions.signIn();
          } catch (e) {
            console.error('Error en SDK signIn:', e);
            
            // Intentar con el método de OnchainKit como respaldo
            try {
              await signIn({
                domain: window.location.host,
                siweUri: window.location.origin
              });
            } catch (siweError) {
              console.error('Error en SIWE signin:', siweError);
              throw siweError;
            }
          }
        } else {
          throw new Error('Farcaster SDK no está disponible o no está listo');
        }
      }
    } catch (err) {
      console.error('Error conectando con Farcaster:', err);
      setError('Error al conectar con la billetera de Farcaster');
    } finally {
      setIsConnecting(false);
    }
  };

  // Desconectar de la billetera
  const disconnect = () => {
    // No hay método explícito para desconectar en el SDK,
    // así que simplemente limpiamos nuestro estado
    console.log('Desconectando de Farcaster');
  };

  // Firmar un mensaje con la billetera de Farcaster
  const signMessage = async (message: string): Promise<string | null> => {
    try {
      if (!isConnected || !sdk) {
        throw new Error('No conectado a Farcaster o SDK no disponible');
      }
      
      // En un entorno real, aquí deberíamos usar el SDK para solicitar una firma
      // Actualmente el SDK de Farcaster no expone directamente esta funcionalidad
      // pero la podemos simular para propósitos de demostración
      
      console.log(`Simulando firma de mensaje: "${message}"`);
      
      // Devolver un hash simulado como si fuera una firma
      return `0x${Array.from(Array(128)).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    } catch (err) {
      console.error('Error firmando mensaje:', err);
      setError('Error al firmar mensaje con la billetera de Farcaster');
      return null;
    }
  };

  // Comprobar automáticamente el estado de la conexión cuando cambia el contexto
  useEffect(() => {
    const checkConnection = async () => {
      if (context && !isConnected && !isConnecting) {
        // Si estamos en un frame y no estamos conectados, intentar conectar automáticamente
        if (context.client.added) {
          connect();
        }
      }
    };
    
    checkConnection();
  }, [context, isConnected, isConnecting]);

  return {
    isConnected,
    isConnecting,
    address,
    fid,
    username,
    error,
    connect,
    disconnect,
    signMessage
  };
}; 