import React, { useState } from 'react';
import { useWallet } from '../providers/WalletProvider';
import { Wallet, Send, ExternalLink, RefreshCw } from 'lucide-react';

export const WalletConnect: React.FC = () => {
  const { 
    isConnected, 
    address, 
    balance, 
    chainId, 
    isConnecting, 
    connectWallet, 
    disconnectWallet,
    switchToBase,
    sendTransaction
  } = useWallet();

  const [showSend, setShowSend] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleSendTransaction = async () => {
    if (!recipient || !amount) return;
    
    const txHash = await sendTransaction(recipient, amount);
    if (txHash) {
      setTxHash(txHash);
      setRecipient('');
      setAmount('');
      setShowSend(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const isBaseNetwork = chainId === 84532; // Base Sepolia

  return (
    <div className="relative">
      {!isConnected ? (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
        >
          <Wallet size={18} />
          {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
        </button>
      ) : (
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Mi Billetera</h3>
            <button
              onClick={disconnectWallet}
              className="text-xs text-white/70 hover:text-white"
            >
              Desconectar
            </button>
          </div>
          
          <div className="mb-2">
            <p className="text-sm text-white/80">Dirección</p>
            <div className="flex items-center gap-2">
              <p className="font-mono">{address ? formatAddress(address) : '-'}</p>
              {address && (
                <a
                  href={`https://sepolia.basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-white/80">Balance</p>
            <p className="font-bold">{balance ? `${balance} ETH` : '-'}</p>
          </div>
          
          <div className="flex gap-2">
            {!isBaseNetwork && (
              <button
                onClick={switchToBase}
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-white text-sm flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Cambiar a Base
              </button>
            )}
            
            <button
              onClick={() => setShowSend(!showSend)}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-white text-sm flex items-center gap-1"
            >
              <Send size={14} />
              Enviar
            </button>
          </div>
          
          {showSend && (
            <div className="mt-4 p-3 bg-white/10 rounded-md">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Dirección de destino"
                className="w-full bg-black/30 text-white p-2 rounded-md mb-2 text-sm"
              />
              <div className="flex gap-2 mb-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Cantidad"
                  type="number"
                  step="0.001"
                  min="0"
                  className="flex-1 bg-black/30 text-white p-2 rounded-md text-sm"
                />
                <span className="bg-black/30 p-2 rounded-md text-white/70 text-sm">ETH</span>
              </div>
              <button
                onClick={handleSendTransaction}
                disabled={!recipient || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 px-3 py-2 rounded-md text-white text-sm"
              >
                Enviar Transacción
              </button>
            </div>
          )}
          
          {txHash && (
            <div className="mt-4 p-3 bg-green-800/20 rounded-md">
              <p className="text-sm text-green-300">¡Transacción enviada!</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-white/70 truncate">{txHash}</p>
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 