interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, callback: (...args: any[]) => void) => void;
  removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
  isConnected: () => boolean;
  chainId?: string;
  selectedAddress?: string;
}

// Añade ethereum al objeto window
interface Window {
  ethereum?: EthereumProvider;
} 