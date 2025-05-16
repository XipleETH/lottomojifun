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
    const unsubscribe = onAuthStateChanged((authUser) => {
      // Solo actualizar si no tenemos un usuario de Farcaster
      if (!farcasterUser && !isFarcasterConnected) {
        if (authUser?.isFarcasterUser) {
          console.log("Estableciendo usuario desde onAuthStateChanged:", authUser);
          setUser(authUser);
        } else {
          console.log("No se detectó usuario de Farcaster");
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [farcasterUser, isFarcasterConnected]);

  const signIn = async () => {
    if (user) return;
    
    try {
      setIsLoading(true);
      
      // Intentar primero con Farcaster
      // Prioridad: 1. MiniKit Farcaster, 2. Billetera Farcaster
      if (farcasterUser) {
        console.log("Iniciando sesión con usuario de MiniKit:", farcasterUser);
        setUser(farcasterUser);
        return;
      }
      
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
      
      // Si llegamos aquí, no pudimos autenticar con Farcaster
      console.log("No se pudo autenticar con Farcaster");
      setUser(null);
    } catch (error) {
      console.error('Error signing in:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto sign-in if no user
  useEffect(() => {
    if (!user && !isLoading) {
      console.log("Intentando auto-login");
      signIn();
    }
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, isFarcasterAvailable }}>
      {children}
    </AuthContext.Provider>
  );
}; 