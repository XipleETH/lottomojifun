import React, { useEffect, useState } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { Trophy, UserCircle, RefreshCw } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { initializeGameState, processGameDraw, checkAndProcessGameDraw } from './firebase/gameServer';

function App() {
  const { gameState, generateTicket, generateRandomTicket } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user, isLoading } = useAuth();
  const [isProcessingDraw, setIsProcessingDraw] = useState(false);

  // Inicializar Firebase y SDK
  useEffect(() => {
    sdk.actions.ready();
    
    // Inicializar el estado del juego
    initializeGameState().then(() => {
      console.log("Estado del juego inicializado");
    });
  }, []);

  const handleWin = async () => {
    if (gameState.lastResults?.firstPrize?.length > 0) {
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

  // Función para ejecutar el sorteo manualmente (solo para pruebas)
  const handleManualDraw = async () => {
    if (isProcessingDraw) return;
    
    setIsProcessingDraw(true);
    try {
      console.log("Ejecutando sorteo manual...");
      await processGameDraw();
      console.log("Sorteo manual completado");
    } catch (error) {
      console.error("Error en sorteo manual:", error);
    } finally {
      setIsProcessingDraw(false);
    }
  };

  const handleCheckDraw = async () => {
    try {
      console.log("Verificando sorteo...");
      const processed = await checkAndProcessGameDraw();
      console.log("Verificación de sorteo:", processed ? "Procesado" : "No necesario");
    } catch (error) {
      console.error("Error verificando sorteo:", error);
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
          <div className="flex justify-between items-center">
            <p className="text-white/80">Next draw in:</p>
            <div className="flex space-x-2">
              <button 
                onClick={handleCheckDraw}
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded"
              >
                Verificar Sorteo
              </button>
              <button 
                onClick={handleManualDraw}
                disabled={isProcessingDraw}
                className={`bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded flex items-center ${isProcessingDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessingDraw && <RefreshCw className="w-4 h-4 mr-1 animate-spin" />}
                Sorteo Manual
              </button>
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <Timer seconds={gameState.timeRemaining} />
        </div>

        {gameState.lastResults && (
          <div className="mb-8 p-6 bg-white/90 rounded-xl backdrop-blur-sm shadow-xl">
            <h2 className="text-2xl font-bold mb-4 flex items-center justify-center">
              <Trophy className="mr-2" /> Latest Results
            </h2>
            <div className="text-center mb-4">
              <p className="text-xl">{gameState.winningNumbers.join(' ')}</p>
            </div>
            {gameState.lastResults.firstPrize.length > 0 && (
              <div className="text-center text-green-600">
                🎉 First Prize Winner(s)! Check your tickets!
              </div>
            )}
          </div>
        )}

        <TicketGenerator
          onGenerateTicket={generateTicket}
          onGenerateRandomTicket={generateRandomTicket}
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
                gameState.lastResults?.firstPrize?.some(t => t.id === ticket.id) ? 'first' :
                gameState.lastResults?.secondPrize?.some(t => t.id === ticket.id) ? 'second' :
                gameState.lastResults?.thirdPrize?.some(t => t.id === ticket.id) ? 'third' : null
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