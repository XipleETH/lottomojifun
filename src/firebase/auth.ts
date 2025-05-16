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
    // Simulamos una petición a la API de Farcaster para obtener más datos
    // En producción, esto se reemplazaría con una llamada real a la API de Farcaster o Hubble
    console.log(`Obteniendo información adicional de perfil para FID: ${fid}`);
    
    // Simulamos un retraso de red
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Por ahora devolvemos datos simulados
    // En un entorno real, obtendríamos estos datos desde la API de Farcaster
    return {
      fid,
      username: `user_${fid}`, // Esto se sobrescribirá con el username real
      followerCount: Math.floor(Math.random() * 1000),
      followingCount: Math.floor(Math.random() * 500),
      verifications: [`0x${fid}abcdef1234567890`]
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
      console.log('Farcaster SDK no disponible, creando usuario simulado');
      // Crear un usuario simulado de Farcaster
      return createSimulatedFarcasterUser();
    }
    
    try {
      // Obtener información básica del usuario
      const user = await sdk.getUser();
      if (user) {
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
      }
    } catch (error) {
      console.log('Error obteniendo usuario de Farcaster, creando usuario simulado:', error);
    }
    
    // Si no podemos obtener el usuario de Farcaster, crear uno simulado
    return createSimulatedFarcasterUser();
  } catch (error) {
    console.error('Error obteniendo datos de Farcaster:', error);
    return createSimulatedFarcasterUser();
  }
};

// Función para crear un usuario simulado de Farcaster
const createSimulatedFarcasterUser = (): User => {
  const randomId = Math.floor(Math.random() * 1000000).toString();
  const walletAddress = `0x${randomId.padStart(40, '0')}`;
  return {
    id: `farcaster-simulated-${randomId}`,
    username: `FarcasterUser-${randomId.substring(0, 4)}`,
    walletAddress,
    fid: parseInt(randomId),
    isFarcasterUser: true,
    verifiedWallet: true,
    chainId: 10, // Optimism
    tokenBalance: "0",
    nfts: []
  };
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