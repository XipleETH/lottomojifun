import { useState, useEffect, useRef } from 'react';
import { subscribeToGameState } from '../firebase/gameServer';

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(60);
  const timerRef = useRef<NodeJS.Timeout>();
  const lastMinuteRef = useRef<number>(-1);

  useEffect(() => {
    // Suscribirse a los cambios de estado del juego desde Firebase
    const unsubscribe = subscribeToGameState((nextDrawTime, winningNumbers) => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      
      setTimeRemaining(remaining);
      
      // Detectar cambio de minuto para notificar al componente padre
      const currentMinute = new Date().getMinutes();
      if (remaining === 0 && currentMinute !== lastMinuteRef.current) {
        lastMinuteRef.current = currentMinute;
        onTimeEnd();
      }
    });
    
    // Actualizar el tiempo restante cada segundo para mantener la UI actualizada
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev > 0) {
          return prev - 1;
        }
        return 0;
      });
    }, 1000);

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTimeEnd]);

  return timeRemaining;
}