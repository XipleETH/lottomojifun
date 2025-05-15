import { auth } from './config';
import { 
  signInAnonymously, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { User } from '../types';
import { sdk } from '@farcaster/frame-sdk';

// Convertir usuario de Firebase a nuestro tipo de usuario
const mapFirebaseUser = (user: FirebaseUser | null): User | null => {
  if (!user) return null;
  
  return {
    id: user.uid,
    username: user.displayName || `User-${user.uid.substring(0, 5)}`,
    avatar: user.photoURL || undefined,
    isFarcasterUser: false
  };
};

// Función para obtener datos del usuario de Farcaster
export const getFarcasterUserData = async (): Promise<User | null> => {
  try {
    // Verificar si el SDK de Farcaster está disponible y el usuario está autenticado
    if (!sdk) {
      console.error('Farcaster SDK no disponible');
      return null;
    }
    
    const user = await sdk.getUser();
    if (!user) {
      console.log('No hay usuario de Farcaster autenticado');
      return null;
    }
    
    // Mapear los datos del usuario de Farcaster a nuestro tipo User
    return {
      id: `farcaster-${user.fid}`,
      username: user.username || `farcaster-${user.fid}`,
      avatar: user.pfp || undefined,
      walletAddress: user.custody_address || undefined,
      fid: user.fid,
      isFarcasterUser: true
    };
  } catch (error) {
    console.error('Error obteniendo datos de Farcaster:', error);
    return null;
  }
};

// Iniciar sesión con Farcaster
export const signInWithFarcaster = async (): Promise<User | null> => {
  try {
    // Intentar obtener usuario de Farcaster
    const farcasterUser = await getFarcasterUserData();
    if (farcasterUser) {
      return farcasterUser;
    }
    
    // Si no hay usuario de Farcaster, devolver null
    console.log('No se pudo autenticar con Farcaster');
    return null;
  } catch (error) {
    console.error('Error signing in with Farcaster:', error);
    return null;
  }
};

// Iniciar sesión anónima (como fallback si no hay Farcaster)
export const signInAnonymousUser = async (): Promise<User | null> => {
  try {
    const userCredential = await signInAnonymously(auth);
    return mapFirebaseUser(userCredential.user);
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    return null;
  }
};

// Observar cambios en el estado de autenticación
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  // Primero intentamos con Farcaster
  getFarcasterUserData().then(farcasterUser => {
    if (farcasterUser) {
      callback(farcasterUser);
    } else {
      // Si no hay usuario de Farcaster, usamos Firebase
      return onFirebaseAuthStateChanged(auth, (firebaseUser) => {
        callback(mapFirebaseUser(firebaseUser));
      });
    }
  });
  
  // Devolver una función para limpiar
  return () => {};
};

// Obtener usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  // Primero intentar obtener usuario de Farcaster
  const farcasterUser = await getFarcasterUserData();
  if (farcasterUser) {
    return farcasterUser;
  }
  
  // Si no hay usuario de Farcaster, devolver usuario de Firebase
  const firebaseUser = auth.currentUser;
  return mapFirebaseUser(firebaseUser);
}; 