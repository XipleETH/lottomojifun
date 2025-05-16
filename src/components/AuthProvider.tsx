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
  const [isFarcasterAvailable, setIsFarcasterAvailable] = useState(true); // Por defecto asumimos que está disponible

  // Verificar disponibilidad de Farcaster al cargar
  useEffect(() => {
    const checkFarcasterAvailability = async () => {
      try {
        // Siempre asumir que estamos en Farcaster incluso si no podemos confirmarlo
        setIsFarcasterAvailable(true);
        
        // Intentar con el SDK pero no fallar si no está disponible
        if (sdk) {
          try {
            const isAvailable = await sdk.isFrameAvailable();
            console.log('Farcaster disponible (según SDK):', isAvailable);
          } catch (e) {
            console.log('Error al verificar disponibilidad con SDK, pero continuamos:', e);
          }
        }
      } catch (error) {
        console.error('Error verificando disponibilidad de Farcaster:', error);
        // Aún así, asumimos que estamos en Farcaster
        setIsFarcasterAvailable(true);
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
      const farcasterUser = await signInWithFarcaster();
      if (farcasterUser) {
        setUser(farcasterUser);
        return;
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