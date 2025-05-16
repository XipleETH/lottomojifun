import React, { useState } from 'react';
import { WalletIcon, Coins, CircleDollarSign, RefreshCw } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from './AuthProvider';

export const WalletInfo: React.FC = () => {
  const { user } = useAuth();
  const { 
    isConnected, 
    isConnecting, 
    tokenBalance, 
    nfts, 
    lastTransaction,
    isPendingTransaction,
    connectWallet,
    refreshWalletData
  } = useWallet();
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!user || !user.walletAddress) {
    return null;
  }
  
  // Formatear la dirección de la billetera para mostrarla abreviada
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <div className="bg-white/10 rounded-lg p-4 text-white">
      <div 
        className="flex items-center justify-between cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <WalletIcon className="mr-2" size={18} />
          <span className="font-medium">Billetera Farcaster</span>
        </div>
        <button className="text-white/70 hover:text-white">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 space-y-3">
          <div className="bg-white/5 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Dirección</span>
              <span className="font-mono text-sm">{formatAddress(user.walletAddress)}</span>
            </div>
            
            {user.fid && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Farcaster ID</span>
                <span>{user.fid}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between bg-white/5 p-3 rounded">
            <div className="flex items-center">
              <Coins size={16} className="mr-2 text-yellow-400" />
              <span>Balance de Tokens</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">{tokenBalance || '0'}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  refreshWalletData();
                }}
                className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10"
                disabled={isPendingTransaction}
              >
                <RefreshCw size={14} className={isPendingTransaction ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {!isConnected ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                connectWallet();
              }}
              disabled={isConnecting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {isConnecting ? 'Conectando...' : 'Conectar Billetera'}
            </button>
          ) : (
            <>
              {nfts.length > 0 && (
                <div className="bg-white/5 p-3 rounded">
                  <div className="flex items-center mb-2">
                    <CircleDollarSign size={16} className="mr-2 text-pink-400" />
                    <span>NFTs de LottoMoji</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nfts.map((nft, index) => (
                      <div key={index} className="bg-white/10 p-2 rounded text-sm truncate">
                        {nft}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {lastTransaction && (
                <div className="bg-white/5 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Última Tx</span>
                    <a 
                      href={`https://optimistic.etherscan.io/tx/${lastTransaction}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-indigo-300 hover:text-indigo-200 truncate max-w-[200px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lastTransaction.substring(0, 10)}...
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}; 