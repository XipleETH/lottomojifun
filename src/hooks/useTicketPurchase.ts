import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useFarcasterWallet } from './useFarcasterWallet';
import { useWallet } from './useWallet';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { generateTicket } from '../firebase/game';

// Importamos la ABI del contrato
import LottoMojiFunABI from '../contracts/LottoMojiFunABI.json';

// Constantes
const BASE_CHAIN_ID = 8453;
const USDC_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC en Base
const LOTTO_CONTRACT_ADDRESS = '0x...'; // Dirección del contrato desplegado

// Interfaces
interface TicketPurchaseHook {
  isPurchasing: boolean;
  transactionHash: string | null;
  error: string | null;
  buyTicket: (emojis: string[]) => Promise<boolean>;
  resetState: () => void;
  networkReady: boolean;
  isCorrectNetwork: boolean;
  switchToBase: () => Promise<boolean>;
}

export const useTicketPurchase = (): TicketPurchaseHook => {
  // Estados
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [networkReady, setNetworkReady] = useState(false);
  
  // Hooks relacionados con la wallet
  const { 
    isConnected,
    address,
    fid: farcasterFid,
    currentChainId,
    switchToBase
  } = useFarcasterWallet();
  
  const { getCurrentChainId } = useMiniKitAuth();
  
  // Verificar la red activa
  useEffect(() => {
    const chainId = currentChainId || getCurrentChainId();
    const correctNetwork = chainId === BASE_CHAIN_ID;
    
    setIsCorrectNetwork(correctNetwork);
    setNetworkReady(true);
    
    if (!correctNetwork && isConnected) {
      console.log(`Red incorrecta detectada: ${chainId}. Se requiere la red Base (${BASE_CHAIN_ID})`);
    }
  }, [currentChainId, getCurrentChainId, isConnected]);
  
  // Función para reiniciar el estado
  const resetState = useCallback(() => {
    setIsPurchasing(false);
    setTransactionHash(null);
    setError(null);
  }, []);
  
  // Función para comprar un ticket
  const buyTicket = useCallback(async (emojis: string[]): Promise<boolean> => {
    setIsPurchasing(true);
    setTransactionHash(null);
    setError(null);
    
    try {
      // Verificar si estamos conectados
      if (!isConnected || !address) {
        throw new Error('No hay una billetera conectada');
      }
      
      // Verificar FID para Farcaster
      if (!farcasterFid) {
        throw new Error('No se ha podido obtener tu Farcaster ID');
      }
      
      // Verificar la red correcta
      const chainId = currentChainId || getCurrentChainId();
      if (chainId !== BASE_CHAIN_ID) {
        console.log(`Intentando cambiar a la red Base desde la red ${chainId}...`);
        const switched = await switchToBase();
        
        if (!switched) {
          throw new Error('No se pudo cambiar a la red Base. Por favor, cámbiala manualmente.');
        }
      }
      
      // Validar emojis
      if (!emojis || emojis.length === 0) {
        throw new Error('Debes seleccionar al menos un emoji');
      }
      
      console.log(`Comprando ticket con emojis: ${emojis.join(', ')} para FID: ${farcasterFid}`);
      
      // Guardar el ticket en Firebase
      const firebaseTicket = await generateTicket(emojis);
      if (!firebaseTicket) {
        throw new Error('Error al guardar el ticket en la base de datos');
      }
      console.log('Ticket guardado en Firebase:', firebaseTicket.id);
      
      // Obtener provider y signer
      if (!window.ethereum) {
        throw new Error('No se ha detectado un proveedor de Ethereum');
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      // Conectar con los contratos
      const usdcContract = new ethers.Contract(
        USDC_TOKEN_ADDRESS,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
          'function allowance(address owner, address spender) external view returns (uint256)'
        ],
        signer
      );
      
      const lottoContract = new ethers.Contract(
        LOTTO_CONTRACT_ADDRESS,
        LottoMojiFunABI,
        signer
      );
      
      // Verificar allowance de USDC
      const ticketPrice = await lottoContract.TICKET_PRICE();
      const userAddress = await signer.getAddress();
      const currentAllowance = await usdcContract.allowance(userAddress, LOTTO_CONTRACT_ADDRESS);
      
      // Si el allowance es insuficiente, aprobar el gasto
      if (currentAllowance.lt(ticketPrice)) {
        console.log('Aprobando USDC para gastar...');
        const approveTx = await usdcContract.approve(LOTTO_CONTRACT_ADDRESS, ticketPrice);
        await approveTx.wait();
        console.log('Aprobación completada:', approveTx.hash);
      }
      
      // Comprar el ticket
      console.log('Ejecutando compra de ticket...');
      const tx = await lottoContract.buyTicket(emojis, farcasterFid);
      
      console.log('Transacción enviada, esperando confirmación...');
      const receipt = await tx.wait();
      
      console.log('Ticket comprado exitosamente:', receipt.transactionHash);
      setTransactionHash(receipt.transactionHash);
      
      return true;
    } catch (err: any) {
      console.error('Error comprando ticket:', err);
      
      // Manejar errores específicos
      if (err.code === 4001) {
        setError('Transacción rechazada por el usuario');
      } else if (err.message && err.message.includes('insufficient funds')) {
        setError('Fondos insuficientes para completar la transacción');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error desconocido al comprar el ticket');
      }
      
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [isConnected, address, farcasterFid, currentChainId, getCurrentChainId, switchToBase]);
  
  return {
    isPurchasing,
    transactionHash,
    error,
    buyTicket,
    resetState,
    networkReady,
    isCorrectNetwork,
    switchToBase
  };
}; 