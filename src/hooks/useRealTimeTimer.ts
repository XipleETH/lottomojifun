import { useState, useEffect, useRef } from 'react';

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const lastDrawRef = useRef<number>(0);

  useEffect(() => {
    const calculateNextDraw = () => {
      const now = new Date();
      const nextMinute = new Date(now);
      nextMinute.setMinutes(now.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      return Math.floor((nextMinute.getTime() - now.getTime()) / 1000);
    };

    const updateTimer = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const remaining = calculateNextDraw();
      
      setTimeRemaining(remaining);
      
      // Solo ejecutar onTimeEnd si estamos en un nuevo minuto y no hemos procesado este minuto
      if (remaining === 0 && currentMinute !== lastDrawRef.current) {
        lastDrawRef.current = currentMinute;
        onTimeEnd();
      }
    };

    // Cálculo inicial
    updateTimer();
    
    // Actualizar cada segundo
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTimeEnd]);

  return timeRemaining;
}