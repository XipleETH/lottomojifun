import { Ticket } from '../types';

export const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                      '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                      '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', 
                      '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗'];

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
} => {
  if (!ticket || !winning || ticket.length < 4 || winning.length < 4) {
    console.warn('Invalid ticket or winning numbers', { ticket, winning });
    return {
      firstPrize: false,
      secondPrize: false,
      thirdPrize: false
    };
  }

  const exactMatch = (a: string[], b: string[]) => 
    a.length === b.length && a.every((v, i) => v === b[i]);
  
  const containsAll = (a: string[], b: string[]) => 
    b.every(v => a.includes(v));

  // Verificar primer premio: todos los emojis en el mismo orden
  const firstPrize = exactMatch(ticket.slice(0, 4), winning.slice(0, 4));
  
  // Verificar segundo premio: primeros 3 emojis en el mismo orden
  const secondPrize = !firstPrize && exactMatch(ticket.slice(0, 3), winning.slice(0, 3));
  
  // Verificar tercer premio: contiene todos los emojis ganadores pero en diferente orden
  const thirdPrize = !firstPrize && !secondPrize && containsAll(ticket, winning);

  return {
    firstPrize,
    secondPrize,
    thirdPrize
  };
};