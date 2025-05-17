import React, { useEffect, useState } from 'react';
import { useWallet } from '../providers/WalletProvider';
import { ExternalLink } from 'lucide-react';

interface Transaction {
  hash: string;
  to: string;
  from: string;
  value: string;
  timestamp: number;
}

export const WalletTransactions: React.FC = () => {
  const { address, isConnected } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [address, isConnected]);

  const fetchTransactions = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // En un caso real, aquí se consultaría un API de Base para obtener transacciones
      // Por ahora, simulamos algunas transacciones de ejemplo
      
      const mockTransactions: Transaction[] = [
        {
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          to: address.toLowerCase(),
          from: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
          value: '0.12',
          timestamp: Date.now() - 3600000,
        },
        {
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          from: address.toLowerCase(),
          to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          value: '0.05',
          timestamp: Date.now() - 86400000,
        }
      ];
      
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error al obtener transacciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white mt-4">
      <h3 className="font-bold mb-3">Transacciones Recientes</h3>
      
      {isLoading ? (
        <div className="text-center py-4 text-white/70">Cargando...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-4 text-white/70">No hay transacciones recientes</div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.hash} className="bg-white/5 p-3 rounded-md">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${tx.from.toLowerCase() === address?.toLowerCase() ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {tx.from.toLowerCase() === address?.toLowerCase() ? 'Enviado' : 'Recibido'}
                  </span>
                </div>
                <a
                  href={`https://sepolia.basescan.org/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-white/70">De:</span>
                  <span className="font-mono">{formatAddress(tx.from)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/70">A:</span>
                  <span className="font-mono">{formatAddress(tx.to)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Valor:</span>
                  <span className="font-bold">{tx.value} ETH</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={fetchTransactions}
        className="w-full bg-blue-600/30 hover:bg-blue-600/50 text-white text-sm py-2 rounded-md mt-3 transition-colors"
      >
        Actualizar
      </button>
    </div>
  );
}; 