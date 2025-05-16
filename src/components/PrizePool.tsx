import React, { useState, useEffect } from 'react';
import { Trophy, Tool } from 'lucide-react';
import { LottoMojiFun } from '../contracts/LottoMojiFun';
import { formatUnits } from 'viem';

export const PrizePool: React.FC = () => {
  const [currentDrawId, setCurrentDrawId] = useState<bigint | null>(null);
  const [prizePool, setPrizePool] = useState<string>('0');
  const [devFees, setDevFees] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Instancia del contrato
  const lottoContract = new LottoMojiFun();
  
  // Cargar datos del premio acumulado
  useEffect(() => {
    const fetchPrizePool = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Obtener ID del sorteo actual
        const drawId = await lottoContract.getCurrentDrawId();
        setCurrentDrawId(drawId);
        
        // No tenemos un método directo para obtener el premio acumulado,
        // así que obtenemos los detalles del sorteo
        try {
          const drawDetails = await lottoContract.getDrawDetails(drawId);
          const poolAmount = formatUnits(drawDetails.prizePool, 6); // USDC tiene 6 decimales
          setPrizePool(poolAmount);
        } catch (err) {
          // Si el sorteo aún no está activo, ponemos 0
          setPrizePool('0');
        }
        
        // Obtener las comisiones acumuladas para desarrollo
        const fees = await lottoContract.publicClient.readContract({
          address: lottoContract.contractAddress,
          abi: lottoContract.lottoMojiFunAbi,
          functionName: 'accumulatedDevFees'
        }) as bigint;
        
        setDevFees(formatUnits(fees, 6));
      } catch (err: any) {
        console.error('Error cargando datos del premio:', err);
        setError(err.message || 'Error cargando datos del premio');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrizePool();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchPrizePool, 30000);
    return () => clearInterval(interval);
  }, []);
  
  if (isLoading) {
    return (
      <div className="bg-white/10 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-white/20 rounded w-1/2"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-500/20 rounded-lg p-4 text-red-200">
        <p className="text-sm">Error cargando datos del premio: {error}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white/10 rounded-lg p-4 shadow-inner">
      <div className="flex flex-col gap-3">
        {/* Premio acumulado */}
        <div>
          <div className="flex items-center mb-1">
            <Trophy size={18} className="text-yellow-400 mr-2" />
            <h3 className="text-white font-medium">Premio acumulado</h3>
          </div>
          <div className="text-white text-2xl font-bold">
            {parseFloat(prizePool).toFixed(2)} USDC
          </div>
          {currentDrawId && (
            <div className="text-white/60 text-xs mt-1">
              Sorteo #{currentDrawId.toString()}
            </div>
          )}
        </div>
        
        {/* Divider */}
        <div className="border-t border-white/10 my-1"></div>
        
        {/* Fondos para desarrollo */}
        <div>
          <div className="flex items-center mb-1">
            <Tool size={16} className="text-blue-400 mr-2" />
            <h3 className="text-white/80 text-sm">Fondos para desarrollo (5%)</h3>
          </div>
          <div className="text-white/80 font-medium">
            {parseFloat(devFees).toFixed(2)} USDC
          </div>
        </div>
      </div>
    </div>
  );
}; 