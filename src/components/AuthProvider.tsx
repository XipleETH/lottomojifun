import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { onAuthStateChanged, signInWithFarcaster, signInAnonymousUser } from '../firebase/auth';
import { sdk } from '@farcaster/frame-sdk';

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

  // Verificar disponibilidad de Farcaster al cargar
  useEffect(() => {
    const checkFarcasterAvailability = async () => {
      try {
        const isAvailable = !!sdk && await sdk.isFrameAvailable();
        setIsFarcasterAvailable(isAvailable);
        console.log('Farcaster disponible:', isAvailable);
      } catch (error) {
        console.error('Error verificando disponibilidad de Farcaster:', error);
        setIsFarcasterAvailable(false);
      }
    };
    
    checkFarcasterAvailability();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    if (user) return;
    
    try {
      setIsLoading(true);
      
      // Intentar primero con Farcaster
      if (isFarcasterAvailable) {
        const farcasterUser = await signInWithFarcaster();
        if (farcasterUser) {
          setUser(farcasterUser);
          return;
        }
      }
      
      // Si no está disponible Farcaster o falló, usar autenticación anónima
      if (!isFarcasterAvailable) {
        const anonymousUser = await signInAnonymousUser();
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