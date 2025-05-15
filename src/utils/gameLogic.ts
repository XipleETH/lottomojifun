import { Ticket } from '../types';

export const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                      '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                      '🎁', '🎮', '🚀', '🌍', '🍀'];

export const generateRandomEmojis = (count: number): string[] => {
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  
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
  
  // Verificar coincidencias en desorden (emoji presente pero en otra posición)
  const unorderedMatches = ticket.filter(emoji => winning.includes(emoji)).length;
  
  return {
    // 4 aciertos en orden exacto (premio mayor)
    firstPrize: exactMatches === 4,
    
    // 3 aciertos en orden exacto (segundo premio)
    secondPrize: exactMatches === 3,
    
    // 4 aciertos en cualquier orden (tercer premio)
    thirdPrize: exactMatches < 4 && unorderedMatches === 4,
    
    // 3 aciertos en cualquier orden (cuarto premio - ticket gratis)
    freePrize: exactMatches < 3 && unorderedMatches === 3
  };
};