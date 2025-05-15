import { useState, useEffect, useRef } from 'react';
import { subscribeToGameState, requestGameDraw } from '../firebase/gameServer';

// Clave para almacenar la última vez que este cliente solicitó un sorteo
const LAST_REQUEST_KEY = 'lottomoji_last_request';

export function useRealTimeTimer(onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const processingRef = useRef<boolean>(false);
  const lastDrawTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Función para verificar si este cliente debe solicitar un sorteo
  // Usamos un algoritmo de "leader election" simple basado en probabilidad
  const shouldRequestDraw = () => {
    // Verificar cuándo fue la última solicitud de este cliente
    const lastRequestStr = localStorage.getItem(LAST_REQUEST_KEY);
    const lastRequest = lastRequestStr ? parseInt(lastRequestStr) : 0;
    const now = Date.now();
    
    // Si ha pasado más de 30 segundos desde la última solicitud de este cliente,
    // permitimos que participe en la "elección"
    if (now - lastRequest > 30000) {
      // Generamos un número aleatorio entre 0 y 1
      // Solo el 20% de los clientes intentarán solicitar un sorteo
      // Esto reduce la probabilidad de solicitudes simultáneas
      return Math.random() < 0.2;
    }
    
    return false;
  };

  useEffect(() => {
    // Suscribirse a los cambios de estado del juego desde Firebase
    const unsubscribe = subscribeToGameState((nextDrawTime) => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
      
      setTimeRemaining(remaining);
      
      // Actualizar la referencia de último tiempo para detectar si el temporizador se detiene
      lastTimeRef.current = now;
      
      // Si el tiempo ha llegado a 0 y no estamos procesando y este cliente es elegido
      if (remaining <= 0 && !processingRef.current && shouldRequestDraw()) {
        processingRef.current = true;
        lastDrawTimeRef.current = now;
        
        // Registrar que este cliente está solicitando un sorteo
        localStorage.setItem(LAST_REQUEST_KEY, now.toString());
        
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
    // y verificar si el temporizador se ha detenido
    timerRef.current = setInterval(() => {
      const now = Date.now();
      
      // Si el último tiempo de actualización fue hace más de 3 segundos,
      // significa que la suscripción no está funcionando correctamente
      if (now - lastTimeRef.current > 3000) {
        console.log('Temporizador detenido, reconectando...');
        // Forzar una actualización del tiempo restante
        subscribeToGameState((nextDrawTime) => {
          const remaining = Math.max(0, Math.floor((nextDrawTime - now) / 1000));
          setTimeRemaining(remaining);
          lastTimeRef.current = now;
        });
      }
      
      // Desbloquear el procesamiento si ha pasado suficiente tiempo
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