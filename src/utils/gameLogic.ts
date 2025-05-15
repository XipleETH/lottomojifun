import { Ticket } from '../types';

// Lista de exactamente 25 emojis
export const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😃', 
  '😄', '😅', '😆', '😉', '😊', 
  '😋', '😎', '😍', '😘', '🥰', 
  '😗', '😙', '😚', '🙂', '🤗',
  '😇', '🥳', '🤯', '🤠', '🤖'
];

// Generar números aleatorios con posible repetición
export const generateRandomEmojis = (count: number): string[] => {
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  
  return result;
};

// Verificar si un ticket es ganador
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

  // Comparar arrays para verificar si son exactamente iguales (mismo orden)
  const exactMatch = (a: string[], b: string[]): boolean => 
    a.length === b.length && a.every((v, i) => v === b[i]);
  
  // Verificar si un array contiene todos los elementos del otro
  const containsAll = (a: string[], b: string[]): boolean => 
    b.every(v => a.includes(v));

  // Primer premio: 4 emojis en el mismo orden exacto
  const firstPrize = exactMatch(ticket.slice(0, 4), winning.slice(0, 4));
  
  // Segundo premio: los primeros 3 emojis en el mismo orden
  const secondPrize = !firstPrize && exactMatch(ticket.slice(0, 3), winning.slice(0, 3));
  
  // Tercer premio: tiene los mismos emojis pero en diferente orden
  const thirdPrize = !firstPrize && !secondPrize && containsAll(ticket, winning);

  return {
    firstPrize,
    secondPrize,
    thirdPrize
  };
};