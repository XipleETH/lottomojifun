import React, { createContext, useContext, ReactNode } from 'react';
import { useFarcasterSigner } from '../hooks/useFarcasterSigner';
import { User } from '../types';

// Definir el tipo de contexto
interface WarpcastContextType {
  user: User | null;
  isLoading: boolean;
  isWarpcastApp: boolean;
  hasAttemptedSignIn: boolean;
  error: string | null;
  signIn: () => Promise<User | null>;
  signOut: () => void;
  retry: () => Promise<User | null>;
}

// Crear el contexto
const WarpcastContext = createContext<WarpcastContextType>({
  user: null,
  isLoading: true,
  isWarpcastApp: false,
  hasAttemptedSignIn: false,
  error: null,
  signIn: async () => null,
  signOut: () => {},
  retry: async () => null
});

// Hook para usar el contexto
export const useWarpcast = () => useContext(WarpcastContext);

// Proveedor
export const WarpcastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Utilizar nuestro hook personalizado
  const signer = useFarcasterSigner();
  
  return (
    <WarpcastContext.Provider value={signer}>
      {children}
    </WarpcastContext.Provider>
  );
}; 