import React, { useState, useEffect } from 'react';
import { Ticket } from '../types';
import { Trophy, Award, Medal } from 'lucide-react';

interface WinnerAnnouncementProps {
  winningNumbers: string[];
  firstPrize: Ticket[];
  secondPrize: Ticket[];
  thirdPrize: Ticket[];
  currentUserId?: string;
}

export const WinnerAnnouncement: React.FC<WinnerAnnouncementProps> = ({
  winningNumbers,
  firstPrize,
  secondPrize,
  thirdPrize,
  currentUserId
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Verificar si el usuario actual tiene un ticket ganador
  const userWonFirstPrize = currentUserId && firstPrize.some(ticket => ticket.userId === currentUserId);
  const userWonSecondPrize = currentUserId && secondPrize.some(ticket => ticket.userId === currentUserId);
  const userWonThirdPrize = currentUserId && thirdPrize.some(ticket => ticket.userId === currentUserId);
  
  // Mostrar confeti si el usuario ha ganado
  useEffect(() => {
    if (userWonFirstPrize || userWonSecondPrize || userWonThirdPrize) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [userWonFirstPrize, userWonSecondPrize, userWonThirdPrize]);

  return (
    <div className="mb-8 p-6 bg-white/90 rounded-xl backdrop-blur-sm shadow-xl">
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-center">
        <Trophy className="mr-2" /> Últimos Resultados
      </h2>
      
      <div className="text-center mb-6">
        <div className="text-xl font-bold mb-2">Emojis Ganadores:</div>
        <div className="flex justify-center items-center gap-2 text-3xl mb-4">
          {winningNumbers.map((emoji, index) => (
            <span key={index} className={`inline-block ${emoji === '❓' ? 'bg-gray-100' : 'bg-purple-100'} p-2 rounded-lg`}>{emoji}</span>
          ))}
        </div>
        {winningNumbers.includes('❓') && (
          <div className="text-gray-600 italic">Esperando próximo sorteo...</div>
        )}
      </div>
      
      {(firstPrize.length > 0 || secondPrize.length > 0 || thirdPrize.length > 0) && (
        <div className="mb-4">
          <h3 className="text-xl font-bold text-center mb-3">¡Ganadores!</h3>
          
          {firstPrize.length > 0 && (
            <div className={`p-3 rounded-lg mb-2 ${userWonFirstPrize ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-center font-bold text-xl text-yellow-600 mb-2">
                <Trophy className="mr-2" /> Primer Premio
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {firstPrize.map(ticket => (
                  <div 
                    key={ticket.id}
                    className={`p-2 rounded ${ticket.userId === currentUserId ? 'bg-yellow-200 font-bold' : 'bg-gray-50'}`}
                  >
                    {ticket.numbers.join(' ')}
                    {ticket.userId === currentUserId && ' (¡TÚ!)'}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {secondPrize.length > 0 && (
            <div className={`p-3 rounded-lg mb-2 ${userWonSecondPrize ? 'bg-gray-200 border-2 border-gray-400' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-center font-bold text-lg text-gray-600 mb-2">
                <Award className="mr-2" /> Segundo Premio
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {secondPrize.map(ticket => (
                  <div 
                    key={ticket.id}
                    className={`p-2 rounded ${ticket.userId === currentUserId ? 'bg-gray-300 font-bold' : 'bg-gray-50'}`}
                  >
                    {ticket.numbers.join(' ')}
                    {ticket.userId === currentUserId && ' (¡TÚ!)'}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {thirdPrize.length > 0 && (
            <div className={`p-3 rounded-lg ${userWonThirdPrize ? 'bg-orange-100 border-2 border-orange-300' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-center font-bold text-lg text-orange-600 mb-2">
                <Medal className="mr-2" /> Tercer Premio
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {thirdPrize.map(ticket => (
                  <div 
                    key={ticket.id}
                    className={`p-2 rounded ${ticket.userId === currentUserId ? 'bg-orange-200 font-bold' : 'bg-gray-50'}`}
                  >
                    {ticket.numbers.join(' ')}
                    {ticket.userId === currentUserId && ' (¡TÚ!)'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {!firstPrize.length && !secondPrize.length && !thirdPrize.length && !winningNumbers.includes('❓') && (
        <div className="text-center text-gray-700">
          No hubo ganadores en este sorteo. ¡Prueba suerte en el próximo!
        </div>
      )}
      
      {!firstPrize.length && !secondPrize.length && !thirdPrize.length && winningNumbers.includes('❓') && (
        <div className="text-center text-gray-700">
          El primer sorteo comenzará pronto. ¡Genera tus tickets para participar!
        </div>
      )}
      
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {/* Esta sería la implementación de un efecto de confeti con CSS */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl animate-bounce">🎉🎊🎉🎊🎉</div>
          </div>
        </div>
      )}
    </div>
  );
}; 