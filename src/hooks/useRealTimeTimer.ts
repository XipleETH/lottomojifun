import { useState, useEffect, useRef } from 'react';
import { subscribeToGameState, requestGameDraw } from '../firebase/gameServer';

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const processingRef = useRef<boolean>(false);
  const lastDrawTimeRef = useRef<number>(0);

  useEffect(() => {
    // Suscribirse a los cambios de estado del juego desde Firebase
    const unsubscribe = subscribeToGameState((nextDrawTime) => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      
      setTimeRemaining(remaining);
      
      // Si el tiempo ha llegado a 0 y no estamos procesando
      if (remaining <= 0 && !processingRef.current && (now - lastDrawTimeRef.current) > 5000) {
        processingRef.current = true;
        lastDrawTimeRef.current = now;
        
        // Solicitar un nuevo sorteo a Firebase Functions
        requestGameDraw()
          .then(() => {
            console.log('Solicitud de sorteo enviada correctamente');
            // Llamar al callback local para actualizar la UI
            onTimeEnd();
          })
          .catch(error => {
            console.error('Error al solicitar sorteo:', error);
          })
          .finally(() => {
            // Desbloquear después de un tiempo para evitar solicitudes duplicadas
            setTimeout(() => {
              processingRef.current = false;
            }, 5000);
          });
      }
    });
    
    // Actualizar el tiempo restante cada segundo para mantener la UI actualizada
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (lastDrawTimeRef.current > 0) {
        const elapsed = now - lastDrawTimeRef.current;
        if (elapsed > 5000 && processingRef.current) {
          processingRef.current = false;
        }
      }
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