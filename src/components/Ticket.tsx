import React from 'react';
import { Ticket as TicketType } from '../types';

interface TicketProps {
  ticket: TicketType;
  isWinner?: 'first' | 'second' | 'third' | null;
}

export const Ticket: React.FC<TicketProps> = ({ ticket, isWinner }) => {
  const winnerClasses = {
    first: 'bg-gradient-to-r from-yellow-400/90 to-yellow-600/90 shadow-yellow-500/50',
    second: 'bg-gradient-to-r from-slate-400/90 to-slate-600/90 shadow-slate-500/50',
    third: 'bg-gradient-to-r from-amber-700/90 to-amber-900/90 shadow-amber-800/50',
    null: 'bg-white/80'
  };

  const winnerClass = isWinner ? winnerClasses[isWinner] : winnerClasses.null;

  return (
    <div className={`
      ${winnerClass}
      p-4 rounded-xl shadow-lg backdrop-blur-sm
      transform transition-all duration-300 hover:scale-105
      flex flex-wrap gap-2 justify-center items-center
      border border-white/20
    `}>
      {ticket.numbers?.map((emoji, idx) => (
        <span key={idx} className="text-2xl">{emoji}</span>
      ))}
      <div className="w-full text-center mt-2 text-xs opacity-60">
        Ticket #{ticket.id?.slice(-4) || 'N/A'}
      </div>
    </div>
  );
}