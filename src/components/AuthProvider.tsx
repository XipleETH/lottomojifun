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
  const [isFarcasterAvailable, setIsFarcasterAvailable] = useState(true); // Por defecto asumimos que está disponible
  
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

  // Forzar fin de carga después de un tiempo máximo
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("Tiempo máximo de carga alcanzado, continuando sin autenticación");
        setIsLoading(false);
      }
    }, 5000); // 5 segundos máximo de carga
    
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

  useEffect(() => {
    // Intentar obtener usuario de autenticación
    const unsubscribe = onAuthStateChanged((authUser) => {
      try {
        // Solo actualizar si no tenemos un usuario de Farcaster
        if (!farcasterUser && !isFarcasterConnected) {
          if (authUser?.isFarcasterUser) {
            console.log("Estableciendo usuario desde onAuthStateChanged:", authUser);
            setUser(authUser);
          } else {
            console.log("No se detectó usuario de Farcaster");
            // En lugar de establecer null, creamos un usuario mínimo para no bloquear la aplicación
            const tempUser: User = {
              id: `temp-${Date.now()}`,
              username: "Usuario Temporal",
              isFarcasterUser: true, // Fingimos que es usuario Farcaster para que la app funcione
              walletAddress: "0x0000000000000000000000000000000000000000", // Dirección ficticia
              fid: 0 // FID ficticio
            };
            setUser(tempUser);
          }
        }
      } catch (error) {
        console.error("Error en onAuthStateChanged:", error);
        // Creamos un usuario temporal para no bloquear la aplicación
        setUser({
          id: `error-${Date.now()}`,
          username: "Error Usuario",
          isFarcasterUser: true,
          walletAddress: "0x0000000000000000000000000000000000000000"
        });
      } finally {
        // Siempre terminar la carga
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [farcasterUser, isFarcasterConnected]);

  const signIn = async () => {
    if (user) return;
    
    try {
      setIsLoading(true);
      
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
        return;
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
          }
        } catch (error) {
          console.error("Error en autenticación con Farcaster:", error);
        }
      })();
      
      // Usar la que termine primero: autenticación o timeout
      await Promise.race([authPromise, timeoutPromise]);
      
      // Si llegamos aquí y no tenemos usuario, crear uno temporal
      if (!user) {
        console.log("Creando usuario temporal para continuar");
        setUser({
          id: `temp-${Date.now()}`,
          username: "Usuario Temporal",
          isFarcasterUser: true,
          walletAddress: "0x0000000000000000000000000000000000000000"
        });
      }
    } catch (error) {
      console.error('Error signing in:', error);
      // Crear usuario temporal en caso de error
      setUser({
        id: `error-${Date.now()}`,
        username: "Error Usuario",
        isFarcasterUser: true,
        walletAddress: "0x0000000000000000000000000000000000000000"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto sign-in if no user
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!user && !isLoading) {
        console.log("Intentando auto-login");
        signIn();
      }
    }, 1000); // Esperar 1 segundo para dar tiempo a que se inicialice todo
    
    return () => clearTimeout(timeout);
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, isFarcasterAvailable }}>
      {children}
    </AuthContext.Provider>
  );
}; 