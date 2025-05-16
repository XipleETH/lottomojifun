import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFarcasterWallet } from './useFarcasterWallet';
import { LottoMojiFun, CONTRACT_ADDRESSES } from '../contracts/LottoMojiFun';
import { createWalletClient, custom, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { toast } from 'react-hot-toast';

export interface TicketPurchaseOptions {
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
  onPending?: () => void;
}

// Instancia compartida del contrato
let lottoContractInstance: LottoMojiFun | null = null;

export function useTicketPurchase(options?: TicketPurchaseOptions) {
  const { user } = useAuth();
  const { address, fid, isConnected, currentChainId, switchToBase } = useFarcasterWallet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isContractReady, setIsContractReady] = useState(false);
  
  // Inicializar la instancia del contrato solo una vez
  useEffect(() => {
    if (!lottoContractInstance) {
      try {
        console.log('Inicializando contrato LottoMojiFun en useTicketPurchase...');
        lottoContractInstance = new LottoMojiFun(CONTRACT_ADDRESSES.LOTTO_MOJI_FUN);
        setIsContractReady(true);
      } catch (err) {
        console.error('Error inicializando contrato:', err);
        setError('Error inicializando contrato. Por favor, recarga la página.');
      }
    } else {
      setIsContractReady(true);
    }
  }, []);
  
  // Obtener la instancia del contrato
  const getLottoContract = useCallback(() => {
    if (!lottoContractInstance) {
      try {
        lottoContractInstance = new LottoMojiFun(CONTRACT_ADDRESSES.LOTTO_MOJI_FUN);
        return lottoContractInstance;
      } catch (err) {
        console.error('Error creando nueva instancia del contrato:', err);
        throw new Error('No se pudo inicializar el contrato');
      }
    }
    return lottoContractInstance;
  }, []);
  
  /**
   * Compra un ticket con los emojis seleccionados
   */
  const purchaseTicket = useCallback(async (emojis: string[]) => {
    if (!isContractReady) {
      setError('El contrato aún no está listo. Por favor, espera un momento.');
      options?.onError?.(new Error('Contrato no inicializado'));
      return null;
    }
    
    if (!isConnected || !address || !fid) {
      setError('No hay billetera conectada. Conéctate primero con Farcaster.');
      options?.onError?.(new Error('No hay billetera conectada'));
      return null;
    }
    
    try {
      setIsPurchasing(true);
      setError(null);
      
      // Verificar que estemos en la red Base
      if (currentChainId !== 8453) {
        toast.loading('Cambiando a la red Base...');
        const switched = await switchToBase();
        if (!switched) {
          throw new Error('No se pudo cambiar a la red Base. Por favor cambia manualmente.');
        }
      }
      
      // Obtener instancia del contrato
      const lottoContract = getLottoContract();
      
      // Comprobar si window.ethereum está disponible
      if (!window.ethereum) {
        throw new Error('No se encontró proveedor de Ethereum. ¿Tienes instalada una billetera?');
      }
      
      // Crear cliente de billetera
      try {
        const walletClient = createWalletClient({
          chain: base,
          transport: custom(window.ethereum)
        });
        
        lottoContract.setWalletClient(walletClient);
        
        // Notificar que la transacción está pendiente
        options?.onPending?.();
        toast.loading('Comprando ticket...');
        
        // Comprar ticket
        const txHash = await lottoContract.buyTicket(address, emojis, BigInt(fid));
        
        setLastTxHash(txHash);
        options?.onSuccess?.(txHash);
        toast.success('¡Ticket comprado con éxito!');
        
        return txHash;
      } catch (walletError: any) {
        console.error('Error con la billetera:', walletError);
        throw new Error(`Error de billetera: ${walletError.message || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error('Error comprando ticket:', err);
      setError(err.message || 'Error desconocido comprando ticket');
      options?.onError?.(err);
      toast.error(`Error: ${err.message || 'Error desconocido'}`);
      return null;
    } finally {
      setIsPurchasing(false);
    }
  }, [isConnected, address, fid, currentChainId, switchToBase, options, isContractReady, getLottoContract]);
  
  /**
   * Reclama un premio para un ticket ganador
   */
  const claimPrize = useCallback(async (ticketId: bigint) => {
    if (!isContractReady) {
      setError('El contrato aún no está listo. Por favor, espera un momento.');
      options?.onError?.(new Error('Contrato no inicializado'));
      return null;
    }
    
    if (!isConnected || !address) {
      setError('No hay billetera conectada. Conéctate primero con Farcaster.');
      options?.onError?.(new Error('No hay billetera conectada'));
      return null;
    }
    
    try {
      setIsPurchasing(true);
      setError(null);
      
      // Verificar que estemos en la red Base
      if (currentChainId !== 8453) {
        toast.loading('Cambiando a la red Base...');
        const switched = await switchToBase();
        if (!switched) {
          throw new Error('No se pudo cambiar a la red Base. Por favor cambia manualmente.');
        }
      }
      
      // Obtener instancia del contrato
      const lottoContract = getLottoContract();
      
      // Comprobar si window.ethereum está disponible
      if (!window.ethereum) {
        throw new Error('No se encontró proveedor de Ethereum. ¿Tienes instalada una billetera?');
      }
      
      // Crear cliente de billetera
      try {
        const walletClient = createWalletClient({
          chain: base,
          transport: custom(window.ethereum)
        });
        
        lottoContract.setWalletClient(walletClient);
        
        // Notificar que la transacción está pendiente
        options?.onPending?.();
        toast.loading('Reclamando premio...');
        
        // Reclamar premio
        const txHash = await lottoContract.claimPrize(address, ticketId);
        
        setLastTxHash(txHash);
        options?.onSuccess?.(txHash);
        toast.success('¡Premio reclamado con éxito!');
        
        return txHash;
      } catch (walletError: any) {
        console.error('Error con la billetera:', walletError);
        throw new Error(`Error de billetera: ${walletError.message || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error('Error reclamando premio:', err);
      setError(err.message || 'Error desconocido reclamando premio');
      options?.onError?.(err);
      toast.error(`Error: ${err.message || 'Error desconocido'}`);
      return null;
    } finally {
      setIsPurchasing(false);
    }
  }, [isConnected, address, currentChainId, switchToBase, options, isContractReady, getLottoContract]);
  
  /**
   * Obtiene el balance de USDC del usuario
   */
  const getUsdcBalance = useCallback(async () => {
    if (!address) return '0';
    
    try {
      const lottoContract = getLottoContract();
      return await lottoContract.getUsdcBalance(address);
    } catch (err) {
      console.error('Error obteniendo balance de USDC:', err);
      return '0';
    }
  }, [address, getLottoContract]);
  
  return {
    purchaseTicket,
    claimPrize,
    getUsdcBalance,
    isPurchasing,
    lastTxHash,
    error,
    isConnected,
    address,
    fid,
    isContractReady
  };
} 