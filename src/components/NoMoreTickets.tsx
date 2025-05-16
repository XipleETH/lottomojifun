import React from 'react';
import { Ticket } from 'lucide-react';

interface NoMoreTicketsProps {
  maxTickets: number;
}

export const NoMoreTickets: React.FC<NoMoreTicketsProps> = ({ maxTickets }) => {
  return (
    <div className="p-6 bg-white/90 rounded-xl backdrop-blur-sm shadow-xl text-center">
      <Ticket className="w-12 h-12 mx-auto mb-4 text-purple-500" />
      <h3 className="text-xl font-bold text-gray-800 mb-2">¡Máximo de Tickets Alcanzado!</h3>
      <p className="text-gray-600">
        Has usado todos tus {maxTickets} tickets disponibles. Espera al próximo sorteo para generar más.
      </p>
    </div>
  );
};