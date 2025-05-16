import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';
import { useTicketPurchase } from '../hooks/useTicketPurchase';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import { toast, Toaster } from 'react-hot-toast';
import { Loader2, CreditCard, Wallet, TicketIcon, RefreshCw } from 'lucide-react';

interface TicketGeneratorProps {
  onGenerateTicket: (numbers: string[]) => void;
  disabled: boolean;
  ticketCount: number;
  maxTickets: number;
}

export const TicketGenerator: React.FC<TicketGeneratorProps> = ({
  onGenerateTicket,
  disabled,
  ticketCount,
  maxTickets
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // Billetera de Farcaster
  const { isConnected, address, fid } = useFarcasterWallet();
  
  // Hook para comprar tickets con contrato
  const { 
    purchaseTicket, 
    getUsdcBalance, 
    isPurchasing, 
    error: purchaseError 
  } = useTicketPurchase({
    onSuccess: (txHash) => {
      console.log('Ticket comprado con éxito:', txHash);
      // La notificación de éxito ya la maneja el hook
      
      // Notificar al componente padre para actualizar la UI
      if (selectedEmojis.length === 4) {
        onGenerateTicket(selectedEmojis);
        setSelectedEmojis([]); // Reset selection after generating ticket
      }
      
      // Actualizar el balance
      refreshUsdcBalance();
    },
    onError: (error) => {
      console.error('Error comprando ticket:', error);
      // El toast de error ya lo maneja el hook
    },
    onPending: () => {
      toast.loading('Transacción en proceso...', { id: 'purchase-pending' });
    }
  });

  // Reset selected emojis when ticket count changes to 0
  useEffect(() => {
    if (ticketCount === 0) {
      setSelectedEmojis([]);
    }
  }, [ticketCount]);
  
  // Cargar el balance de USDC al iniciar
  useEffect(() => {
    if (isConnected && address) {
      refreshUsdcBalance();
    }
  }, [isConnected, address]);
  
  // Refrescar el balance de USDC
  const refreshUsdcBalance = async () => {
    if (!isConnected || !address) return;
    
    try {
      setIsLoadingBalance(true);
      const balance = await getUsdcBalance();
      setUsdcBalance(balance);
    } catch (err) {
      console.error('Error obteniendo balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (disabled || isPurchasing) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
    
    if (newSelection.length === 4) {
      if (isConnected && address && fid) {
        // Aquí no ejecutamos onGenerateTicket directamente, esperamos a que se complete la transacción
      } else {
        toast.error('Conecta tu billetera de Farcaster para comprar tickets', {
          id: 'wallet-connect-error'
        });
      }
    }
  };

  const handleEmojiDeselect = (index: number) => {
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const handleRandomGenerate = () => {
    if (disabled || isPurchasing) return;
    
    const randomEmojis = generateRandomEmojis(4);
    setSelectedEmojis(randomEmojis);
  };
  
  const handlePurchaseTicket = async () => {
    if (!isConnected || !address || !fid) {
      toast.error('Conecta tu billetera de Farcaster para comprar tickets', {
        id: 'wallet-connect-error'
      });
      return;
    }
    
    if (selectedEmojis.length !== 4) {
      toast.error('Selecciona 4 emojis para tu ticket', {
        id: 'emojis-error'
      });
      return;
    }
    
    await purchaseTicket(selectedEmojis);
  };

  return (
    <div className="mb-8 space-y-4">
      <Toaster position="top-center" />
      
      <div className="flex flex-col gap-4">
        {/* Información de balance */}
        <div className="bg-white/10 p-3 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-green-300" />
            <span className="text-white">Tu USDC:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">
              {isLoadingBalance ? '...' : usdcBalance} USDC
            </span>
            <button 
              onClick={refreshUsdcBalance}
              disabled={isLoadingBalance || !isConnected}
              className="p-1 rounded-full hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoadingBalance ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        {/* Selector de emojis */}
        <div className="bg-white/10 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-medium">Selecciona 4 emojis para tu ticket</h3>
            <span className="text-white/70 text-sm">{selectedEmojis.length}/4</span>
          </div>
          
        <EmojiGrid
          selectedEmojis={selectedEmojis}
          onEmojiSelect={handleEmojiSelect}
          onEmojiDeselect={handleEmojiDeselect}
          maxSelections={4}
        />
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-2 flex-col sm:flex-row">
        <button
          onClick={handleRandomGenerate}
            disabled={disabled || isPurchasing}
            className={`flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 
                     rounded-xl transition-colors flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <TicketIcon size={18} />
            <span>Emojis Aleatorios</span>
          </button>
          
          <button
            onClick={handlePurchaseTicket}
            disabled={disabled || isPurchasing || selectedEmojis.length !== 4 || !isConnected}
            className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 
                     rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            {isPurchasing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Comprando...</span>
              </>
            ) : (
              <>
                <Wallet size={18} />
                <span>Comprar Ticket (1 USDC)</span>
              </>
            )}
        </button>
        </div>
        
        {/* Información de límite */}
        <div className="text-center text-white/70 text-sm">
          Tickets comprados hoy: {ticketCount}/{maxTickets}
        </div>
        
        {/* Mensaje de error */}
        {purchaseError && (
          <div className="bg-red-500/20 p-3 rounded-lg text-red-200 text-sm">
            {purchaseError}
          </div>
        )}
      </div>
    </div>
  );
};