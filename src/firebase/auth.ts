import { auth } from './config';
import { 
  signInAnonymously, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { User } from '../types';

// Convertir usuario de Firebase a nuestro tipo de usuario
const mapFirebaseUser = (user: FirebaseUser | null): User | null => {
  if (!user) return null;
  
  return {
    id: user.uid,
    username: user.displayName || `User-${user.uid.substring(0, 5)}`,
    avatar: user.photoURL || undefined
  };
};

// Iniciar sesión anónima
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
  return onFirebaseAuthStateChanged(auth, (firebaseUser) => {
    callback(mapFirebaseUser(firebaseUser));
  });
};

// Obtener usuario actual
export const getCurrentUser = (): User | null => {
  const firebaseUser = auth.currentUser;
  return mapFirebaseUser(firebaseUser);
}; 