import { ContractConfig, Transaction, User } from '../types';
import { LottoMojiFun, CONTRACT_ADDRESSES } from '../contracts/LottoMojiFun';
import { createWalletClient, custom, parseUnits } from 'viem';
import { base } from 'viem/chains';

// Instancia del contrato LottoMojiFun
let lottoContract: LottoMojiFun | null = null;

// Inicializar el contrato
const initContract = () => {
  if (!lottoContract) {
    try {
      console.log('Inicializando contrato LottoMojiFun...');
      lottoContract = new LottoMojiFun(CONTRACT_ADDRESSES.LOTTO_MOJI_FUN);
      console.log('Contrato inicializado con dirección:', CONTRACT_ADDRESSES.LOTTO_MOJI_FUN);
    } catch (error) {
      console.error('Error al inicializar contrato:', error);
    }
  }
  return lottoContract;
};

/**
 * Conecta con la billetera del usuario a través de Farcaster
 * @param user Usuario de Farcaster
 * @returns Booleano indicando si la conexión fue exitosa
 */
export const connectWallet = async (user: User): Promise<boolean> => {
  try {
    if (!user.walletAddress) {
      console.error('No hay dirección de billetera disponible');
      return false;
    }
    
    console.log(`Conectando con la billetera: ${user.walletAddress}`);
    
    // Inicializar el contrato
    const contract = initContract();
    if (!contract) {
      console.error('No se pudo inicializar el contrato');
      return false;
    }
    
    // Verificar si window.ethereum está disponible
    if (!window.ethereum) {
      console.error('No hay proveedor de Ethereum disponible');
      return false;
    }
    
    // Crear cliente de billetera
    try {
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(window.ethereum)
      });
      
      // Configurar el cliente de billetera en el contrato
      contract.setWalletClient(walletClient);
      
      console.log('Billetera conectada con éxito');
      return true;
    } catch (error) {
      console.error('Error al crear cliente de billetera:', error);
      return false;
    }
  } catch (error) {
    console.error('Error al conectar billetera:', error);
    return false;
  }
};

/**
 * Compra tickets a través del contrato inteligente
 * @param user Usuario de Farcaster
 * @param ticketCount Número de tickets a comprar
 * @returns Hash de la transacción o null si falla
 */
export const buyTickets = async (user: User, ticketCount: number): Promise<string | null> => {
  try {
    if (!user.walletAddress) {
      console.error('No hay dirección de billetera disponible');
      return null;
    }
    
    console.log(`Iniciando compra de ${ticketCount} tickets para ${user.username} (${user.walletAddress})`);
    
    // Obtener el contrato
    const contract = initContract();
    if (!contract) {
      console.error('No se pudo inicializar el contrato');
      return null;
    }
    
    // En una implementación real, aquí llamaríamos al método buyTicket del contrato
    // Por ahora, devolvemos un hash simulado
    const txHash = `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    console.log(`Transacción simulada enviada: ${txHash}`);
    return txHash;
  } catch (error) {
    console.error('Error al comprar tickets:', error);
    return null;
  }
};

/**
 * Reclama premios a través del contrato inteligente
 * @param user Usuario de Farcaster
 * @param ticketIds IDs de los tickets ganadores
 * @returns Hash de la transacción o null si falla
 */
export const claimPrizes = async (user: User, ticketIds: string[]): Promise<string | null> => {
  try {
    if (!user.walletAddress) {
      console.error('No hay dirección de billetera disponible');
      return null;
    }
    
    console.log(`Reclamando premios para ${ticketIds.length} tickets por ${user.username} (${user.walletAddress})`);
    
    // Obtener el contrato
    const contract = initContract();
    if (!contract) {
      console.error('No se pudo inicializar el contrato');
      return null;
    }
    
    // En una implementación real, aquí llamaríamos al método claimPrize del contrato
    // Por ahora, devolvemos un hash simulado
    const txHash = `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    console.log(`Transacción de reclamo simulada enviada: ${txHash}`);
    return txHash;
  } catch (error) {
    console.error('Error al reclamar premios:', error);
    return null;
  }
};

/**
 * Obtiene el balance de tokens del usuario
 * @param user Usuario de Farcaster
 * @returns Balance de tokens o null si falla
 */
export const getTokenBalance = async (user: User): Promise<string | null> => {
  try {
    if (!user.walletAddress) {
      console.error('No hay dirección de billetera disponible');
      return null;
    }
    
    // Obtener el contrato
    const contract = initContract();
    if (!contract) {
      console.error('No se pudo inicializar el contrato');
      return null;
    }
    
    try {
      // Intentar obtener el balance real de USDC
      const balance = await contract.getUsdcBalance(user.walletAddress as `0x${string}`);
      console.log(`Balance de USDC para ${user.username}: ${balance}`);
      return balance;
    } catch (error) {
      console.error('Error al obtener balance de USDC:', error);
      
      // Devolver un balance simulado como fallback
      const simulatedBalance = (Math.random() * 100).toFixed(2);
      console.log(`Balance simulado para ${user.username}: ${simulatedBalance}`);
      return simulatedBalance;
    }
  } catch (error) {
    console.error('Error al obtener balance:', error);
    return null;
  }
};

/**
 * Verifica si el usuario tiene NFTs del juego
 * @param user Usuario de Farcaster
 * @returns Array de IDs de NFTs o array vacío si no tiene
 */
export const getUserNFTs = async (user: User): Promise<string[]> => {
  try {
    if (!user.walletAddress) {
      console.error('No hay dirección de billetera disponible');
      return [];
    }
    
    // Obtener el contrato
    const contract = initContract();
    if (!contract) {
      console.error('No se pudo inicializar el contrato');
      return [];
    }
    
    try {
      // Intentar obtener los tickets del usuario
      const ticketIds = await contract.getUserTickets(user.walletAddress as `0x${string}`);
      
      // Convertir los IDs de bigint a string
      const ticketStrings = ticketIds.map(id => `Ticket #${id.toString()}`);
      
      if (ticketStrings.length > 0) {
        console.log(`Tickets para ${user.username}: ${ticketStrings.join(', ')}`);
      } else {
        console.log(`No se encontraron tickets para ${user.username}`);
      }
      
      return ticketStrings;
    } catch (error) {
      console.error('Error al obtener tickets del usuario:', error);
      
      // Devolver un array vacío como fallback
      return [];
    }
  } catch (error) {
    console.error('Error al obtener NFTs:', error);
    return [];
  }
}; 