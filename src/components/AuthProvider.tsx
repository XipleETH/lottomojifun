import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { onAuthStateChanged, signInWithFarcaster } from '../firebase/auth';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import { useMiniKitAuth } from '../providers/MiniKitProvider';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  isFarcasterAvailable: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  isFarcasterAvailable: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFarcasterAvailable, setIsFarcasterAvailable] = useState(false);
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);
  
  // Usar nuestro hook personalizado de Farcaster
  const { 
    isConnected: isFarcasterConnected,
    address: farcasterAddress,
    fid: farcasterFid,
    username: farcasterUsername,
    connect: connectFarcasterWallet
  } = useFarcasterWallet();
  
  // Obtener información del contexto MiniKit
  const { farcasterUser, isWarpcastApp } = useMiniKitAuth();

  // Forzar fin de carga después de un tiempo máximo (reducido a 3 segundos)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("Tiempo máximo de carga alcanzado");
        setIsLoading(false);
      }
    }, 3000); // 3 segundos máximo de carga
    
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Actualizar el estado cuando cambia el usuario de Farcaster
  useEffect(() => {
    if (farcasterUser) {
      console.log("Estableciendo usuario de Farcaster desde MiniKitAuth:", farcasterUser);
      setUser(farcasterUser);
      setIsLoading(false);
    }
  }, [farcasterUser]);

  // Actualizar disponibilidad de Farcaster
  useEffect(() => {
    setIsFarcasterAvailable(isWarpcastApp);
  }, [isWarpcastApp]);

  useEffect(() => {
    // Si tenemos información de la billetera de Farcaster pero no un usuario completo,
    // crear uno basado en esos datos
    if (isFarcasterConnected && farcasterAddress && farcasterFid && !user) {
      console.log("Creando usuario de Farcaster desde datos de billetera:", {
        fid: farcasterFid,
        address: farcasterAddress,
        username: farcasterUsername
      });
      
      const newUser: User = {
        id: `farcaster-${farcasterFid}`,
        username: farcasterUsername || `farcaster-${farcasterFid}`,
        walletAddress: farcasterAddress,
        fid: farcasterFid,
        isFarcasterUser: true,
        verifiedWallet: true,
        chainId: 10 // Optimism
      };
      
      setUser(newUser);
      setIsLoading(false);
    }
  }, [isFarcasterConnected, farcasterAddress, farcasterFid, farcasterUsername, user]);

  // Intentar obtener usuario de autenticación (solo una vez)
  useEffect(() => {
    let isMounted = true;
    
    const checkAuthUser = async () => {
      try {
        // Solo verificar si aún no tenemos un usuario válido
        if (!farcasterUser && !isFarcasterConnected && !user) {
          console.log("Verificando usuario de autenticación...");
          
          // Crear una promesa que se resuelva después de un tiempo
          const authUserPromise = new Promise<User | null>((resolve) => {
            onAuthStateChanged((authUser) => {
              if (authUser?.isFarcasterUser) {
                console.log("Usuario encontrado en onAuthStateChanged:", authUser);
                resolve(authUser);
              } else {
                console.log("No se detectó usuario en onAuthStateChanged");
                resolve(null);
              }
            });
          });
          
          // Crear un timeout para evitar esperas infinitas
          const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => {
              console.log("Tiempo de espera agotado en verificación de usuario");
              resolve(null);
            }, 2000);
          });
          
          // Usar la promesa que termine primero
          const authUser = await Promise.race([authUserPromise, timeoutPromise]);
          
          // Actualizar estado solo si el componente sigue montado
          if (isMounted) {
            if (authUser) {
              setUser(authUser);
            }
            // Marcar como cargado independientemente del resultado
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error al verificar usuario de autenticación:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkAuthUser();
    
    return () => {
      isMounted = false;
    };
  }, [farcasterUser, isFarcasterConnected, user]);

  // Auto sign-in solo si está en Warpcast y no ha intentado antes
  useEffect(() => {
    if (isWarpcastApp && !user && !isLoading && !hasAttemptedSignIn) {
      console.log("Iniciando auto-login en Warpcast");
      signIn();
    } else if (isWarpcastApp && !user && !isLoading) {
      console.log("Auto-login ya intentado, pero usuario aún no autenticado en Warpcast");
      // Intentar nuevamente después de un tiempo
      const retryTimeout = setTimeout(() => {
        if (!user) {
          console.log("Reintentando autenticación en Warpcast...");
          setHasAttemptedSignIn(false); // Resetear para permitir nuevo intento
          signIn();
        }
      }, 2000);
      
      return () => clearTimeout(retryTimeout);
    }
  }, [isWarpcastApp, user, isLoading, hasAttemptedSignIn]);

  const signIn = async () => {
    try {
      setIsLoading(true);
      setHasAttemptedSignIn(true);
      
      console.log("Iniciando proceso de inicio de sesión en Warpcast");
      
      // Establecer un tiempo máximo para el proceso de inicio de sesión
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log("Tiempo de espera de inicio de sesión agotado");
          resolve();
        }, 3000); // 3 segundos máximo
      });
      
      // Intentar primero con Farcaster
      // Prioridad: 1. MiniKit Farcaster, 2. Billetera Farcaster
      if (farcasterUser) {
        console.log("Iniciando sesión con usuario de MiniKit:", farcasterUser);
        setUser(farcasterUser);
        setIsLoading(false);
        return;
      }
      
      // En Warpcast, tenemos un enfoque especial
      if (isWarpcastApp) {
        console.log("Estamos en Warpcast, usando método específico para autenticación");
        try {
          if (sdk) {
            // Intentar directamente obtener el usuario primero
            const user = await sdk.getUser();
            if (user && user.fid) {
              console.log("Usuario de Warpcast obtenido directamente:", user);
              // Mapear el usuario a nuestro formato
              const warpcastUser: User = {
                id: `farcaster-${user.fid}`,
                username: user.username || `farcaster-${user.fid}`,
                avatar: user.pfp || undefined,
                walletAddress: user.custody_address || `0x${user.fid.toString().padStart(40, '0')}`,
                fid: user.fid,
                isFarcasterUser: true,
                verifiedWallet: !!user.custody_address,
                chainId: 10 // Optimism es la cadena principal para Farcaster
              };
              setUser(warpcastUser);
              setIsLoading(false);
              return;
            }
            
            // Si no hay usuario, intentar signIn
            await sdk.actions.signIn();
            console.log("Sign-in de Warpcast completado, verificando usuario...");
            
            // Verificar usuario nuevamente
            const newUser = await sdk.getUser();
            if (newUser && newUser.fid) {
              console.log("Usuario de Warpcast obtenido después de signIn:", newUser);
              // Mapear el usuario a nuestro formato
              const warpcastUser: User = {
                id: `farcaster-${newUser.fid}`,
                username: newUser.username || `farcaster-${newUser.fid}`,
                avatar: newUser.pfp || undefined,
                walletAddress: newUser.custody_address || `0x${newUser.fid.toString().padStart(40, '0')}`,
                fid: newUser.fid,
                isFarcasterUser: true,
                verifiedWallet: !!newUser.custody_address,
                chainId: 10 // Optimism
              };
              setUser(warpcastUser);
              setIsLoading(false);
              return;
            }
          }
        } catch (warpcastError) {
          console.error("Error en autenticación específica de Warpcast:", warpcastError);
        }
      }
      
      // Crear una promesa para el proceso de autenticación
      const authPromise = (async () => {
        if (!isFarcasterConnected) {
          console.log("Intentando conectar billetera Farcaster");
          try {
            await connectFarcasterWallet();
            console.log("Conexión con billetera Farcaster exitosa");
            // El efecto se encargará de actualizar el usuario
            return;
          } catch (error) {
            console.error('Error intentando conectar billetera Farcaster:', error);
          }
        }
        
        // Intentar con API directa de Farcaster (esto puede no funcionar fuera de Warpcast)
        try {
          console.log("Intentando autenticar con API de Farcaster");
          const farcasterAuthUser = await signInWithFarcaster();
          if (farcasterAuthUser) {
            console.log("Autenticación con Farcaster exitosa:", farcasterAuthUser);
            setUser(farcasterAuthUser);
            return;
          } else {
            console.log("No se pudo autenticar con Farcaster");
          }
        } catch (error) {
          console.error("Error en autenticación con Farcaster:", error);
        }
      })();
      
      // Usar la que termine primero: autenticación o timeout
      await Promise.race([authPromise, timeoutPromise]);
      
    } catch (error) {
      console.error('Error en inicio de sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, isFarcasterAvailable }}>
      {children}
    </AuthContext.Provider>
  );
}; 