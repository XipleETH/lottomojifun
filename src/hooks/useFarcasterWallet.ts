import { useState, useEffect, useCallback } from 'react';
import { useMiniKit, useAuthenticate } from '@coinbase/onchainkit/minikit';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { sdk } from '@farcaster/frame-sdk';

// Constantes de cadenas
const BASE_CHAIN_ID = 8453;

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
  currentChainId: number | null;
  switchToBase: () => Promise<boolean>;
  isBaseNetwork: boolean;
}

export const useFarcasterWallet = (): FarcasterWalletHook => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { context } = useMiniKit();
  const { signIn, signOut } = useAuthenticate();
  const { 
    farcasterUser,
    isFarcasterReady,
    isWarpcastApp,
    connectFarcaster,
    getCurrentChainId,
    switchToBase
  } = useMiniKitAuth();

  // Obtener la cadena actual del proveedor de OnchainKit
  const currentChainId = getCurrentChainId();
  
  // Verificar si estamos en la red Base
  const isBaseNetwork = currentChainId === BASE_CHAIN_ID;

  // Determinar si está conectado (usuario de Farcaster con wallet)
  const isConnected = !!farcasterUser?.walletAddress;
  
  // Obtener la dirección de la billetera
  const address = farcasterUser?.walletAddress || null;
  
  // Obtener el FID
  const fid = farcasterUser?.fid || null;
  
  // Obtener el nombre de usuario
  const username = farcasterUser?.username || null;

  // Diagnosticar el estado actual
  useEffect(() => {
    console.log("Estado actual de Farcaster:", {
      isConnected,
      address,
      fid,
      username,
      chainId: currentChainId,
      isBaseNetwork,
      user: farcasterUser
    });
  }, [isConnected, address, fid, username, farcasterUser, currentChainId, isBaseNetwork]);

  // Conectar con la billetera de Farcaster
  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log("Iniciando proceso de conexión de billetera Farcaster...");
      
      // Crear una promesa que se resuelva después de un tiempo límite
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log("Tiempo de espera de conexión agotado");
          resolve();
        }, 5000); // 5 segundos máximo
      });
      
      // Crear la promesa de conexión real
      const connectionPromise = (async () => {
        if (isWarpcastApp) {
          console.log("Conectando en entorno Warpcast...");
          
          // Si ya tenemos información del usuario de MiniKitAuthProvider
          if (farcasterUser && farcasterUser.walletAddress) {
            console.log("Ya existe una conexión con billetera:", farcasterUser.walletAddress);
            
            // Si tenemos wallet pero no estamos en Base, preguntar si quiere cambiar a Base
            if (!isBaseNetwork) {
              console.log("No estamos en la red Base. Intentando cambiar...");
              await switchToBase();
            }
            
            return;
          }
          
          // Intentar conectar usando nuestro proveedor personalizado
          console.log("Llamando a connectFarcaster desde MiniKitAuthProvider");
          await connectFarcaster();
          
          // Si ahora tenemos una conexión pero no estamos en Base, intentar cambiar
          if (farcasterUser?.walletAddress && !isBaseNetwork) {
            console.log("Conectado, pero no en la red Base. Intentando cambiar...");
            await switchToBase();
          }
        } else {
          console.log("Conectando en entorno navegador...");
          
          try {
            // Intentar primero con OnchainKit
            console.log("Intentando signIn con OnchainKit");
            await signIn({
              domain: window.location.host,
              siweUri: window.location.origin,
              resources: [window.location.origin]
            });
            console.log("Conexión con OnchainKit exitosa");
            
            // Verificar si OnchainKit nos dio acceso a la billetera
            if (context?.client?.wallet) {
              console.log("Billetera de OnchainKit disponible:", context.client.wallet);
            }
            
            // Esperar a que MiniKitAuthProvider actualice el estado
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Intentar conectar usando nuestro proveedor personalizado después
            console.log("Llamando a connectFarcaster desde MiniKitAuthProvider");
            await connectFarcaster();
            
            // Intentar cambiar a Base si es necesario
            if (!isBaseNetwork) {
              console.log("Cambiando a red Base...");
              await switchToBase();
            }
          } catch (onchainError) {
            console.error('Error en OnchainKit signIn:', onchainError);
            
            // Intentar con Frame SDK como respaldo
            if (sdk && isFarcasterReady) {
              try {
                console.log("Intentando signIn con Frame SDK");
                await sdk.actions.signIn();
                
                // Esperar a que MiniKitAuthProvider actualice el estado
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Llamar a connectFarcaster después para asegurar que el estado se actualice
                await connectFarcaster();
                
                // Intentar cambiar a Base si es necesario
                if (!isBaseNetwork) {
                  console.log("Cambiando a red Base...");
                  await switchToBase();
                }
              } catch (sdkError) {
                console.error('Error en SDK signIn:', sdkError);
                throw sdkError;
              }
            } else {
              throw new Error('Farcaster SDK no está disponible o no está listo');
            }
          }
        }
      })();
      
      // Usar la promesa que termine primero
      await Promise.race([connectionPromise, timeoutPromise]);
      
    } catch (err) {
      console.error('Error conectando con Farcaster:', err);
      setError('Error al conectar con la billetera de Farcaster');
    } finally {
      setIsConnecting(false);
      
      // Verificar si la conexión fue exitosa
      if (farcasterUser?.walletAddress) {
        console.log("Conexión exitosa con billetera:", farcasterUser.walletAddress);
        
        // Verificar la red
        console.log(`Red actual: ${currentChainId} (${isBaseNetwork ? 'Base' : 'No es Base'})`);
      } else {
        console.warn("No se pudo establecer conexión con una billetera");
      }
    }
  };

  // Desconectar de la billetera
  const disconnect = () => {
    // Intentar desconectar con OnchainKit
    try {
      signOut().catch(err => console.error('Error en OnchainKit signOut:', err));
    } catch (err) {
      console.error('Error al desconectar OnchainKit:', err);
    }
    
    console.log('Desconectando de Farcaster');
  };

  // Firmar un mensaje con la billetera de Farcaster
  const signMessage = async (message: string): Promise<string | null> => {
    try {
      // Verificar si tenemos una billetera
      if (!isConnected) {
        console.error('No hay billetera conectada para firmar');
        return null;
      }
      
      // Verificar si estamos en Base - si no lo estamos, intentar cambiar
      if (!isBaseNetwork) {
        console.log("No estamos en la red Base. Intentando cambiar antes de firmar...");
        const switched = await switchToBase();
        if (!switched) {
          console.warn("No se pudo cambiar a la red Base, continuando en la red actual");
        }
      }
      
      console.log(`Intentando firmar mensaje con billetera Farcaster: "${message}"`);
      
      // Intentar usar OnchainKit para firmar si está disponible
      if (context?.client?.wallet) {
        try {
          console.log("Intentando firmar con billetera de OnchainKit");
          
          if (typeof window.ethereum !== 'undefined') {
            // Solicitar firma del usuario usando window.ethereum
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (accounts && accounts.length > 0) {
              console.log(`Cuenta activa detectada: ${accounts[0]}`);
              try {
                const signature = await window.ethereum.request({
                  method: 'personal_sign',
                  params: [message, accounts[0]],
                });
                console.log("Firma obtenida:", signature);
                return signature;
              } catch (ethError) {
                console.error("Error firmando con ethereum:", ethError);
              }
            }
          }
        } catch (onchainError) {
          console.error("Error firmando con OnchainKit:", onchainError);
        }
      }
      
      // Intentar con el SDK de Farcaster como respaldo
      if (sdk?.signer?.signMessage) {
        try {
          console.log("Intentando usar signer nativo de Farcaster");
          const signature = await sdk.signer.signMessage(message);
          console.log("Firma obtenida de Farcaster:", signature);
          return signature;
        } catch (e) {
          console.error("Error usando signer nativo:", e);
        }
      }
      
      console.warn("No se pudo firmar el mensaje con la billetera");
      return null;
    } catch (err) {
      console.error('Error firmando mensaje:', err);
      setError('Error al firmar mensaje con la billetera de Farcaster');
      return null;
    }
  };

  // Comprobar automáticamente el estado de la conexión cuando cambia el contexto
  useEffect(() => {
    const checkConnection = async () => {
      if (context && !farcasterUser?.walletAddress && !isConnecting) {
        // Si estamos en un frame y no estamos conectados, intentar conectar automáticamente
        if (context.client?.added) {
          console.log("Detectado frame, intentando conectar automáticamente");
          connect();
        }
      }
    };
    
    checkConnection();
  }, [context, farcasterUser, isConnecting]);

  return {
    isConnected,
    isConnecting,
    address,
    fid,
    username,
    error,
    connect,
    disconnect,
    signMessage,
    currentChainId,
    switchToBase,
    isBaseNetwork
  };
}; 