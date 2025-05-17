import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { createWalletClient, http, hexToString, parseEther, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useConnectWallet, useDisconnectWallet, useSwitchChain } from '@coinbase/onchainkit';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: Error | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToBase: () => Promise<void>;
  sendTransaction: (to: string, amount: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: null,
  balance: null,
  chainId: null,
  isConnecting: false,
  error: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchToBase: async () => {},
  sendTransaction: async () => null,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { connectWallet: connect, data: connectData } = useConnectWallet();
  const { disconnectWallet: disconnect } = useDisconnectWallet();
  const { switchChain } = useSwitchChain();

  const getBalance = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    
    try {
      const balance = await window.ethereum?.request({
        method: 'eth_getBalance',
        params: [walletAddress, 'latest'],
      });
      
      if (balance) {
        // Convertir de wei a ETH
        const balanceInEth = parseInt(balance) / 1e18;
        setBalance(balanceInEth.toFixed(4));
      }
    } catch (error) {
      console.error('Error al obtener balance:', error);
    }
  }, []);

  // Actualizar el estado cuando se conecta la wallet
  useEffect(() => {
    if (connectData?.address) {
      setAddress(connectData.address);
      setChainId(connectData.chainId);
      getBalance(connectData.address);
    }
  }, [connectData, getBalance]);

  // Escuchar cambios de cuenta y red
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          getBalance(accounts[0]);
        } else {
          // Desconectado
          setAddress(null);
          setBalance(null);
        }
      });

      window.ethereum.on('chainChanged', (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16));
      });

      // Cleanup
      return () => {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      };
    }
  }, [getBalance]);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error instanceof Error ? error : new Error('Failed to connect wallet'));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setAddress(null);
    setBalance(null);
    setChainId(null);
  };

  const switchToBase = async () => {
    try {
      await switchChain({
        chainId: baseSepolia.id
      });
    } catch (error) {
      console.error('Error switching to Base:', error);
      setError(error instanceof Error ? error : new Error('Failed to switch to Base network'));
    }
  };

  const sendTransaction = async (to: string, amount: string): Promise<string | null> => {
    if (!address || !isAddress(to)) return null;
    
    try {
      const transactionParameters = {
        from: address,
        to: to,
        value: parseEther(amount).toString(16),
      };
      
      const txHash = await window.ethereum?.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });
      
      return txHash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      setError(error instanceof Error ? error : new Error('Failed to send transaction'));
      return null;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!address,
        address,
        balance,
        chainId,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
        switchToBase,
        sendTransaction
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 