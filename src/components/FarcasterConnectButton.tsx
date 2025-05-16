import React from 'react';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import { useMiniKitAuth } from '../providers/MiniKitProvider';
import { Wallet, ArrowRight, CircleAlert } from 'lucide-react';

interface FarcasterConnectButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  onConnect?: () => void;
}

const FarcasterConnectButton: React.FC<FarcasterConnectButtonProps> = ({
  className = '',
  size = 'md',
  fullWidth = false,
  onConnect
}) => {
  // Hooks para la billetera de Farcaster
  const {
    isConnected,
    isConnecting,
    address,
    fid,
    username,
    connect,
    error,
    currentChainId,
    isBaseNetwork,
    switchToBase
  } = useFarcasterWallet();
  
  const { isWarpcastApp } = useMiniKitAuth();

  // Manejar la conexión
  const handleConnect = async () => {
    await connect();
    if (onConnect) onConnect();
  };
  
  // Manejar el cambio de red
  const handleSwitchNetwork = async () => {
    await switchToBase();
  };

  // Estilos según el tamaño
  const sizeStyles = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  // Si ya está conectado pero no está en la red Base
  if (isConnected && !isBaseNetwork) {
    return (
      <button
        onClick={handleSwitchNetwork}
        className={`bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-lg flex items-center justify-center transition-all hover:opacity-90 ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={isConnecting}
      >
        <CircleAlert size={size === 'sm' ? 14 : 18} className="mr-2" />
        <span>Cambiar a Base</span>
        <ArrowRight size={size === 'sm' ? 14 : 18} className="ml-2" />
      </button>
    );
  }
  
  // Si ya está conectado, mostrar un botón diferente
  if (isConnected) {
    return (
      <button
        onClick={handleConnect}
        className={`bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium rounded-lg flex items-center justify-center transition-all hover:opacity-90 ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <Wallet size={size === 'sm' ? 14 : 18} className="mr-2" />
        <span>{username || fid ? `@${username || fid}` : address?.substring(0, 6) + '...' + address?.substring(address.length - 4)}</span>
      </button>
    );
  }
  
  // Botón de conexión estándar
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-70 ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <Wallet size={size === 'sm' ? 14 : 18} className="mr-2" />
        <span>{isConnecting ? 'Conectando...' : isWarpcastApp ? 'Conectar con Farcaster' : 'Conectar Billetera'}</span>
      </button>
      
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export default FarcasterConnectButton; 