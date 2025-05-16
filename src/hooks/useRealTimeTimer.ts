import { useState, useEffect, useRef } from 'react';
import { subscribeToGameState } from '../firebase/gameServer';
import { ethers } from 'ethers';
import LottoMojiFunABI from '../contracts/LottoMojiFunABI.json';

// Dirección del contrato desplegado en Base
const LOTTO_CONTRACT_ADDRESS = '0x...'; // Reemplazar con la dirección real del contrato

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutos por defecto
  const timerRef = useRef<NodeJS.Timeout>();
  const lastDrawRef = useRef<number>(-1);
  const processingRef = useRef<boolean>(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  
  // Función para obtener el tiempo restante del contrato
  const getContractTimeRemaining = async () => {
    try {
      // Solo intentar conectar con el contrato si hay un proveedor disponible
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const contract = new ethers.Contract(LOTTO_CONTRACT_ADDRESS, LottoMojiFunABI, provider);
        
        // Llamar a la función getNextDrawInfo del contrato
        const nextDrawInfo = await contract.getNextDrawInfo();
        
        // nextDrawInfo[2] contiene el tiempo restante en segundos
        const remaining = nextDrawInfo[2].toNumber();
        return remaining;
      }
      return null;
    } catch (error) {
      console.error('[useRealTimeTimer] Error obteniendo tiempo del contrato:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[useRealTimeTimer] Inicializando temporizador en tiempo real para sorteos cada 10 minutos');
    
    // Intentar obtener el tiempo del contrato inicialmente
    getContractTimeRemaining().then(remaining => {
      if (remaining !== null) {
        setTimeRemaining(remaining);
      }
    });
    
    // Suscribirse a los cambios de estado del juego desde Firebase
    const unsubscribe = subscribeToGameState((nextDrawTime, winningNumbers) => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      
      // Actualizar el tiempo restante solo si es diferente
      if (timeRemaining !== remaining) {
        setTimeRemaining(remaining);
      }
      
      // Solo procesar eventos de fin de temporizador si el nextDrawTime ha cambiado
      // Esto evita múltiples procesamiento del mismo evento
      if (nextDrawTime !== lastDrawTimeRef.current) {
        lastDrawTimeRef.current = nextDrawTime;
        
        // Calcular el número de sorteo actual (basado en intervalos de 10 minutos)
        const currentDrawNumber = Math.floor(now / (10 * 60 * 1000));
        const currentTime = now;
        
        // Solo procesar si:
        // 1. El tiempo restante es 0 o muy cercano a 0
        // 2. El número de sorteo actual es diferente al último procesado
        // 3. No estamos ya procesando un evento
        // 4. Han pasado al menos 30 segundos desde el último procesamiento
        if (
          remaining <= 5 && 
          currentDrawNumber !== lastDrawRef.current && 
          !processingRef.current &&
          (currentTime - lastProcessedTimeRef.current) > 30000
        ) {
          lastDrawRef.current = currentDrawNumber;
          processingRef.current = true;
          lastProcessedTimeRef.current = currentTime;
          
          console.log(`[useRealTimeTimer] [${new Date().toLocaleTimeString()}] Detectado nuevo sorteo, notificando fin de temporizador`);
          
          // Añadir un pequeño retraso para evitar múltiples llamadas
          setTimeout(() => {
            console.log(`[useRealTimeTimer] [${new Date().toLocaleTimeString()}] Ejecutando onTimeEnd()`);
            onTimeEnd();
            processingRef.current = false;
          }, 500);
        }
      }
    });
    
    // Actualizar el tiempo restante cada segundo para mantener la UI actualizada
    // y consultar el contrato cada 30 segundos
    timerRef.current = setInterval(() => {
      // Decrementar el contador local
      setTimeRemaining(prev => {
        if (prev > 0) {
          return prev - 1;
        }
        return 0;
      });
      
      // Cada 30 segundos, sincronizar con el contrato
      const now = Date.now();
      if (now % 30000 < 1000) {
        getContractTimeRemaining().then(remaining => {
          if (remaining !== null) {
            setTimeRemaining(remaining);
          }
        });
      }
    }, 1000);

    return () => {
      console.log('[useRealTimeTimer] Limpiando suscripción y temporizador');
      unsubscribe();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTimeEnd]);

  return timeRemaining;
}