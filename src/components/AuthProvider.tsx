import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { onAuthStateChanged, signInWithFarcaster, signInAnonymousUser } from '../firebase/auth';
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
        setUser(authUser);
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
      // Prioridad: 1. MiniKit Farcaster, 2. Billetera Farcaster, 3. Anónimo
      if (farcasterUser) {
        setUser(farcasterUser);
        return;
      }
      
      if (!isFarcasterConnected) {
        try {
          await connectFarcasterWallet();
          // El efecto se encargará de actualizar el usuario
          return;
        } catch (error) {
          console.error('Error intentando conectar billetera Farcaster:', error);
        }
      }
      
      // Si no podemos autenticar con Farcaster, crear un usuario anónimo con atributos de Farcaster
      const anonymousUser = await signInAnonymousUser();
      
      // Añadir marca de usuario de Farcaster para permitir el juego
      if (anonymousUser) {
        const enhancedUser: User = {
          ...anonymousUser,
          isFarcasterUser: true, // Marcamos como usuario de Farcaster aunque sea anónimo
          walletAddress: anonymousUser.walletAddress || '0x0000000000000000000000000000000000000000',
          fid: anonymousUser.fid || 0
        };
        setUser(enhancedUser);
      } else {
        setUser(anonymousUser);
      }
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto sign-in if no user
  useEffect(() => {
    if (!user && !isLoading) {
      signIn();
    }
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, isFarcasterAvailable }}>
      {children}
    </AuthContext.Provider>
  );
}; 