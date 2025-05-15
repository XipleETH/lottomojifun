import React, { useEffect } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { Trophy, UserCircle } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { initializeGameState } from './firebase/gameServer';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';

function App() {
  const { gameState, generateTicket } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user, isLoading } = useAuth();

  // Inicializar Firebase y SDK
  useEffect(() => {
    sdk.actions.ready();
    initializeGameState();
  }, []);

  // Mostrar notificación cuando hay ganadores
  useEffect(() => {
    handleWin();
  }, [gameState.lastResults]);

  const handleWin = async () => {
    if (gameState.lastResults?.firstPrize.length > 0) {
      try {
        await sendNotification({
          title: '🎉 You Won!',
          body: 'Congratulations! You matched all emojis and won the first prize!'
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            🎰 LottoMoji 🎲
          </h1>
          <div className="flex items-center gap-2">
            {user && (
              <div className="bg-white/20 px-4 py-2 rounded-lg text-white flex items-center">
                <UserCircle className="mr-2" size={18} />
                <span>{user.username}</span>
              </div>
            )}
            {context?.client.added && (
              <button
                onClick={() => viewProfile()}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                View Profile
              </button>
            )}
          </div>
        </div>
        
          <p className="text-white/90 text-xl mb-4">
            Match 4 emojis to win! 🏆
          </p>
          <p className="text-white/80">Next draw in:</p>
          <div className="flex justify-center mt-4">
            <Timer seconds={gameState.timeRemaining} />
        </div>

        {gameState.lastResults && (
          <WinnerAnnouncement 
            winningNumbers={gameState.winningNumbers}
            firstPrize={gameState.lastResults.firstPrize}
            secondPrize={gameState.lastResults.secondPrize}
            thirdPrize={gameState.lastResults.thirdPrize}
            currentUserId={user?.id}
          />
        )}

        <TicketGenerator
          onGenerateTicket={generateTicket}
          disabled={gameState.tickets.length >= 10}
          ticketCount={gameState.tickets.length}
          maxTickets={10}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameState.tickets.map(ticket => (
            <TicketComponent
              key={ticket.id}
              ticket={ticket}
              isWinner={
                gameState.lastResults?.firstPrize.includes(ticket) ? 'first' :
                gameState.lastResults?.secondPrize.includes(ticket) ? 'second' :
                gameState.lastResults?.thirdPrize.includes(ticket) ? 'third' : null
              }
            />
          ))}
        </div>
      </div>
      <GameHistoryButton />
      <EmojiChat />
    </div>
  );
}

export default App;