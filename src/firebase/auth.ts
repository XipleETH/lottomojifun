import { auth } from './config';
import { 
  signInAnonymously, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { User, FarcasterProfile } from '../types';
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

// Función para obtener datos adicionales del perfil de Farcaster
const fetchFarcasterProfileInfo = async (fid: number): Promise<FarcasterProfile | null> => {
  try {
    // Esta función debería hacer una llamada real a la API de Farcaster
    console.log(`Obteniendo información adicional de perfil para FID: ${fid}`);
    
    // Aquí deberíamos obtener los datos reales, no simularlos
    // Podemos usar la API pública de Neynar o el Hubble API de Farcaster
    
    // Por ahora, solo devolvemos información básica
    return {
      fid,
      username: `user_${fid}`,
      followerCount: 0,
      followingCount: 0,
      verifications: []
    };
  } catch (error) {
    console.error('Error obteniendo información adicional de Farcaster:', error);
    return null;
  }
};

// Función para obtener datos del usuario de Farcaster
export const getFarcasterUserData = async (): Promise<User | null> => {
  try {
    // Verificar si el SDK de Farcaster está disponible y el usuario está autenticado
    if (!sdk) {
      console.error('ERROR: SDK de Farcaster no disponible');
      return null;
    }
    
    try {
      // Obtener información básica del usuario
      const user = await sdk.getUser();
      if (!user) {
        console.log('No hay usuario autenticado en Farcaster');
        return null;
      }
      
      console.log('Usuario de Farcaster obtenido:', user);
      
      // Verificación de billetera
      let verifiedWallet = false;
      let walletAddress = user.custody_address;
      
      // Si tenemos una dirección de custodia, asumimos que está verificada
      if (walletAddress) {
        verifiedWallet = true;
      }
      
      // Intentar obtener información adicional del perfil
      let additionalInfo: FarcasterProfile | null = null;
      try {
        additionalInfo = await fetchFarcasterProfileInfo(user.fid);
      } catch (e) {
        console.log('No se pudo obtener información adicional del perfil');
      }
      
      // Mapear los datos del usuario de Farcaster a nuestro tipo User
      return {
        id: `farcaster-${user.fid}`,
        username: user.username || `farcaster-${user.fid}`,
        avatar: user.pfp || undefined,
        walletAddress: walletAddress || undefined,
        fid: user.fid,
        isFarcasterUser: true,
        verifiedWallet: verifiedWallet,
        chainId: 10, // Optimism es la cadena principal para Farcaster
        // Información adicional si está disponible
        tokenBalance: "0",
        nfts: [],
        lastTransactionHash: undefined
      };
    } catch (error) {
      console.error('Error obteniendo usuario de Farcaster:', error);
      return null;
    }
    
    // No usar fallback de usuario simulado
    return null;
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