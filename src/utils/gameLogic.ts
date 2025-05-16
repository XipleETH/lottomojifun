import { Ticket } from '../types';

export const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                      '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                      '🎁', '🎮', '🚀', '🌍', '🍀'];

export const generateRandomEmojis = (count: number): string[] => {
  // Asegurarnos de que el conteo solicitado no sea mayor que la cantidad disponible de emojis
  const actualCount = Math.min(count, EMOJIS.length);
  
  // Crear una copia del array de emojis disponibles para poder alterarla
  const availableEmojis = [...EMOJIS];
  const result: string[] = [];
  
  // Seleccionar 'count' emojis aleatorios sin repetición
  for (let i = 0; i < actualCount; i++) {
    // Obtener un índice aleatorio del array disponible (cada vez más pequeño)
    const randomIndex = Math.floor(Math.random() * availableEmojis.length);
    
    // Agregar el emoji seleccionado al resultado
    result.push(availableEmojis[randomIndex]);
    
    // Eliminar el emoji seleccionado para que no se repita
    availableEmojis.splice(randomIndex, 1);
  }
  
  console.log('[gameLogic] Generados emojis aleatorios:', result);
  return result;
};

export const checkWin = (ticket: string[], winning: string[]): {
  firstPrize: boolean;
  secondPrize: boolean;
  thirdPrize: boolean;
  freePrize: boolean;
} => {
  // Verificar coincidencias exactas (mismo emoji en la misma posición)
  let exactMatches = 0;
  for (let i = 0; i < ticket.length; i++) {
    if (i < winning.length && ticket[i] === winning[i]) {
      exactMatches++;
    }
  }
  
  // Para el segundo premio (ahora) y ticket gratis, necesitamos contar correctamente
  // cuántos emojis del ticket coinciden con los del resultado ganador
  
  // Crear copias para no modificar los originales
  const ticketCopy = [...ticket];
  const winningCopy = [...winning];
  
  // Contar emojis que coinciden, teniendo en cuenta repeticiones
  let matchCount = 0;
  for (let i = 0; i < winningCopy.length; i++) {
    const index = ticketCopy.indexOf(winningCopy[i]);
    if (index !== -1) {
      matchCount++;
      // Eliminar el emoji ya contado para no contar repetidos
      ticketCopy.splice(index, 1);
    }
  }
  
  return {
    // 4 aciertos en orden exacto (premio mayor)
    firstPrize: exactMatches === 4,
    
    // 4 aciertos en cualquier orden (ahora segundo premio)
    secondPrize: matchCount === 4 && exactMatches !== 4,
    
    // 3 aciertos en orden exacto (ahora tercer premio)
    thirdPrize: exactMatches === 3,
    
    // 3 aciertos en cualquier orden (cuarto premio - ticket gratis)
    freePrize: matchCount === 3 && exactMatches !== 3
  };
};