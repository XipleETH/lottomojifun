import React, { useState, useEffect } from 'react';
import { useTicketPurchase } from '../hooks/useTicketPurchase';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import FarcasterConnectButton from './FarcasterConnectButton';
import { Loader2, CheckCircle, AlertCircle, Ticket, DollarSign } from 'lucide-react';

// Lista de emojis disponibles para seleccionar (igualados con index.js)
const AVAILABLE_EMOJIS = [
  '🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
  '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
  '🎁', '🎮', '🚀', '🌍', '🍀'
];

const MAX_EMOJIS = 4;

interface TicketPurchaseProps {
  onPurchaseComplete?: () => void;
}

const TicketPurchase: React.FC<TicketPurchaseProps> = ({ onPurchaseComplete }) => {
  // Estados locales
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  
  // Hooks para la billetera y la compra de tickets
  const {
    isConnected,
    isBaseNetwork
  } = useFarcasterWallet();
  
  const {
    isPurchasing,
    transactionHash,
    error,
    buyTicket,
    resetState,
    networkReady
  } = useTicketPurchase();
  
  // Reiniciar el estado del componente cuando se completa una compra
  useEffect(() => {
    if (transactionHash && !isPurchasing) {
      setPurchaseComplete(true);
      
      // Resetear después de 5 segundos
      const timer = setTimeout(() => {
        resetState();
        setSelectedEmojis([]);
        setPurchaseComplete(false);
        if (onPurchaseComplete) onPurchaseComplete();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [transactionHash, isPurchasing, resetState, onPurchaseComplete]);
  
  // Manejar selección de emoji
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmojis(prev => {
      // Si ya está seleccionado, quitarlo
      if (prev.includes(emoji)) {
        return prev.filter(e => e !== emoji);
      }
      
      // Si ya hay MAX_EMOJIS emojis seleccionados, no hacer nada
      if (prev.length >= MAX_EMOJIS) {
        return prev;
      }
      
      // Añadir el emoji
      return [...prev, emoji];
    });
  };
  
  // Manejar compra de ticket
  const handlePurchase = async () => {
    if (selectedEmojis.length !== MAX_EMOJIS) {
      return;
    }
    
    const success = await buyTicket(selectedEmojis);
    if (success && onPurchaseComplete) {
      onPurchaseComplete();
    }
  };
  
  // Verificar si el botón de compra debe estar habilitado
  const isPurchaseButtonEnabled = selectedEmojis.length === MAX_EMOJIS && !isPurchasing;
  
  // Mostrar contenido basado en el estado actual
  const renderContent = () => {
    // Si se completó la compra
    if (purchaseComplete && transactionHash) {
      return (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">¡Ticket comprado!</h3>
          <p className="text-green-300 mb-4">Tu ticket ha sido registrado correctamente en la red Base.</p>
          <div className="bg-black/20 p-3 rounded-lg mb-4 flex items-center">
            <div className="flex-1 truncate font-mono text-xs text-white/80">
              <a 
                href={`https://basescan.org/tx/${transactionHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {transactionHash}
              </a>
            </div>
          </div>
          <p className="text-white/70 text-sm">¡Buena suerte! El próximo sorteo será pronto.</p>
        </div>
      );
    }
    
    // Si hay un error
    if (error) {
      return (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="text-red-500" size={48} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">Error al comprar ticket</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={resetState}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }
    
    // Si no está conectado, mostrar el botón de conexión
    if (!isConnected) {
      return (
        <div className="text-center p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">Conecta tu billetera</h3>
          <p className="text-white/70 mb-6">Necesitas conectar tu billetera de Farcaster para comprar tickets.</p>
          <FarcasterConnectButton fullWidth size="lg" />
        </div>
      );
    }
    
    // Si la red no está lista o no es Base
    if (!networkReady || !isBaseNetwork) {
      return (
        <div className="text-center p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">Cambiar de red</h3>
          <p className="text-white/70 mb-6">Necesitas estar en la red Base para comprar tickets.</p>
          <FarcasterConnectButton fullWidth size="lg" />
        </div>
      );
    }
    
    // Estado normal: selección de emojis y compra
    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-white">Selecciona exactamente {MAX_EMOJIS} emojis</h3>
          <div className="grid grid-cols-5 gap-2">
            {AVAILABLE_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiSelect(emoji)}
                className={`
                  h-10 w-10 flex items-center justify-center rounded-lg text-xl
                  ${selectedEmojis.includes(emoji) 
                    ? 'bg-indigo-600 shadow-lg ring-2 ring-indigo-300' 
                    : 'bg-white/10 hover:bg-white/20'}
                  transition-all ${selectedEmojis.length >= MAX_EMOJIS && !selectedEmojis.includes(emoji) ? 'opacity-40 cursor-not-allowed' : ''}
                `}
                disabled={selectedEmojis.length >= MAX_EMOJIS && !selectedEmojis.includes(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-white">Tu ticket</h3>
          <div className="bg-gradient-to-r from-purple-900/80 to-indigo-900/80 p-4 rounded-lg border border-white/10">
            <div className="flex items-center mb-3">
              <Ticket className="mr-2 text-white/70" size={18} />
              <span className="text-white/70">LottoMoji Ticket</span>
              <div className="ml-auto bg-white/20 px-3 py-1 rounded-full flex items-center">
                <DollarSign className="mr-1 text-green-300" size={14} />
                <span className="text-white text-sm">1 USDC</span>
              </div>
            </div>
            <div className="flex items-center justify-center h-16 bg-black/30 rounded-lg mb-3">
              {selectedEmojis.length > 0 ? (
                <div className="flex space-x-3 text-2xl">
                  {selectedEmojis.map((emoji, index) => (
                    <span key={index}>{emoji}</span>
                  ))}
                </div>
              ) : (
                <p className="text-white/50">Selecciona {MAX_EMOJIS} emojis para tu ticket</p>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handlePurchase}
          disabled={!isPurchaseButtonEnabled}
          className={`
            w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center
            ${isPurchaseButtonEnabled 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white' 
              : 'bg-gray-600/50 text-white/50 cursor-not-allowed'}
          `}
        >
          {isPurchasing ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Comprando...
            </>
          ) : (
            <>
              {selectedEmojis.length === MAX_EMOJIS 
                ? 'Comprar ticket por 1 USDC' 
                : `Selecciona ${MAX_EMOJIS - selectedEmojis.length} emoji${MAX_EMOJIS - selectedEmojis.length !== 1 ? 's' : ''} más`}
            </>
          )}
        </button>
        
        {selectedEmojis.length > 0 && selectedEmojis.length < MAX_EMOJIS && (
          <p className="text-amber-300 text-sm mt-2 text-center">
            Selecciona {MAX_EMOJIS - selectedEmojis.length} emoji{MAX_EMOJIS - selectedEmojis.length !== 1 ? 's' : ''} más
          </p>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 shadow-xl border border-white/5">
      {renderContent()}
    </div>
  );
};

export default TicketPurchase; 