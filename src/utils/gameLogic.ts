import { Ticket } from '../types';

export const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                      '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭'];

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
  const exactMatch = (a: string[], b: string[]) => 
    a.length === b.length && a.every((v, i) => v === b[i]);
  
  const containsAll = (a: string[], b: string[]) => 
    b.every(v => a.includes(v));

  return {
    firstPrize: exactMatch(ticket.slice(0, 4), winning.slice(0, 4)),
    secondPrize: exactMatch(ticket.slice(0, 3), winning.slice(0, 3)),
    thirdPrize: containsAll(ticket, winning.slice(0, 4)) && !exactMatch(ticket.slice(0, 4), winning.slice(0, 4))
  };
};