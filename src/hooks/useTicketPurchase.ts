import { useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFarcasterWallet } from './useFarcasterWallet';
import { LottoMojiFun } from '../contracts/LottoMojiFun';
import { createWalletClient, custom, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { toast } from 'react-hot-toast';

export interface TicketPurchaseOptions {
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
  onPending?: () => void;
}

export function useTicketPurchase(options?: TicketPurchaseOptions) {
  const { user } = useAuth();
  const { address, fid, isConnected, currentChainId, switchToBase } = useFarcasterWallet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Instancia del contrato
  const lottoContract = new LottoMojiFun();
  
  /**
   * Compra un ticket con los emojis seleccionados
   */
  const purchaseTicket = useCallback(async (emojis: string[]) => {
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
      
      // Crear cliente de billetera
      if (window.ethereum) {
        const walletClient = createWalletClient({
          chain: base,
          transport: custom(window.ethereum)
        });
        
        lottoContract.setWalletClient(walletClient);
        
        // Notificar que la transacción está pendiente
        options?.onPending?.();
        toast.loading('Aprobando gasto de USDC...');
        
        // Aprobar gasto de USDC
        const ticketPrice = await lottoContract.getTicketPrice();
        const approveTxHash = await lottoContract.approveUsdcSpending(address, ticketPrice);
        
        // Esperar confirmación de aprobación
        toast.loading('Esperando confirmación de aprobación...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
        
        // Comprar ticket
        toast.loading('Comprando ticket...');
        const txHash = await lottoContract.buyTicket(address, emojis, BigInt(fid));
        
        setLastTxHash(txHash);
        options?.onSuccess?.(txHash);
        toast.success('¡Ticket comprado con éxito!');
        
        return txHash;
      } else {
        throw new Error('No se encontró proveedor de Ethereum');
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
  }, [isConnected, address, fid, currentChainId, switchToBase, options]);
  
  /**
   * Reclama un premio para un ticket ganador
   */
  const claimPrize = useCallback(async (ticketId: bigint) => {
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
      
      // Crear cliente de billetera
      if (window.ethereum) {
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
      } else {
        throw new Error('No se encontró proveedor de Ethereum');
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
  }, [isConnected, address, currentChainId, switchToBase, options]);
  
  /**
   * Obtiene el balance de USDC del usuario
   */
  const getUsdcBalance = useCallback(async () => {
    if (!address) return '0';
    
    try {
      return await lottoContract.getUsdcBalance(address);
    } catch (err) {
      console.error('Error obteniendo balance de USDC:', err);
      return '0';
    }
  }, [address]);
  
  return {
    purchaseTicket,
    claimPrize,
    getUsdcBalance,
    isPurchasing,
    lastTxHash,
    error,
    isConnected,
    address,
    fid
  };
} 