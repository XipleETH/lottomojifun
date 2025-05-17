// Add these interfaces to your existing types.ts file

export interface ChatMessage {
  id: string;
  emojis: string[];
  timestamp: number;
  userId?: string;
  username?: string;
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
}

export interface Ticket {
  id: string;
  numbers: string[];
  timestamp: number;
  userId?: string;
}

export interface GameResult {
  id: string;
  timestamp: number;
  winningNumbers: string[];
  firstPrize: Ticket[];
  secondPrize: Ticket[];
  thirdPrize: Ticket[];
  freePrize: Ticket[];
}

export interface GameState {
  winningNumbers: string[];
  tickets: Ticket[];
  lastResults: null | {
    firstPrize: Ticket[];
    secondPrize: Ticket[];
    thirdPrize: Ticket[];
    freePrize: Ticket[];
  };
  gameStarted: boolean;
  timeRemaining?: number;
}