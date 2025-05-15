import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { onAuthStateChanged, signInAnonymousUser } from '../firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      const newUser = await signInAnonymousUser();
      setUser(newUser);
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
    <AuthContext.Provider value={{ user, isLoading, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}; 