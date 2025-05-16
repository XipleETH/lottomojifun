import React, { useEffect, useState, useMemo } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { initializeGameState } from './firebase/gameServer';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { WalletInfo } from './components/WalletInfo';
import { Toaster } from 'react-hot-toast';

function App() {
  const { gameState, generateTicket, forceGameDraw } = useGameState();
  const { context } = useMiniKit();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();
  const { user, isLoading, isFarcasterAvailable, signIn } = useAuth();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [renderStable, setRenderStable] = useState(false);

  // Estabilizar el renderizado para evitar parpadeos
  useEffect(() => {
    // Esperar 200ms antes de permitir cambios de UI
    const timer = setTimeout(() => {
      setRenderStable(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // Solo inicializar una vez
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        console.log("Inicializando SDK de Farcaster...");
        await sdk.actions.ready();
        console.log("SDK de Farcaster inicializado correctamente");
      } catch (error) {
        console.error("Error al inicializar SDK de Farcaster:", error);
      }
    };
    
    initializeSDK();
  }, []);

  // Mostrar notificación cuando hay ganadores
  useEffect(() => {
    handleWin();
  }, [gameState.lastResults]);

  const handleWin = async () => {
    // Usar verificación de seguridad para evitar errores undefined
    const firstPrizeLength = gameState.lastResults?.firstPrize?.length || 0;
    if (firstPrizeLength > 0) {
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

  // Memorizar la página de carga para evitar recrearla
  const loadingPage = useMemo(() => (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      <div className="text-white text-2xl">Cargando...</div>
    </div>
  ), []);

  // Memorizar la página de inicio de sesión para evitar recrearla
  const loginPage = useMemo(() => (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
      <div className="bg-white/20 p-8 rounded-xl max-w-md text-center">
        <h1 className="text-4xl font-bold text-white mb-4">🎰 LottoMoji 🎲</h1>
        <p className="text-white text-xl mb-6">Solo para usuarios de Farcaster</p>
        <p className="text-white/80 mb-6">
          Para jugar a LottoMoji necesitas iniciar sesión con tu cuenta de Farcaster. 
          Esta aplicación solo está disponible para usuarios de Farcaster Warpcast.
        </p>
        <button
          onClick={() => signIn()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Iniciar sesión con Farcaster
        </button>
      </div>
    </div>
  ), [signIn]);

  // Si no hemos estabilizado el renderizado, mostrar la página de carga
  if (!renderStable) {
    return loadingPage;
  }

  // Si está cargando, mostrar la página de carga
  if (isLoading) {
    return loadingPage;
  }

  // Si el usuario no está autenticado con Farcaster, mostrar mensaje de error
  if (!user?.isFarcasterUser && isFarcasterAvailable) {
    return loginPage;
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
                {user.walletAddress && (
                  <div className="ml-2 flex items-center text-sm text-white/70">
                    <WalletIcon size={12} className="mr-1" />
                    <span>{user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}</span>
                  </div>
                )}
              </div>
            )}
            {context?.client.added && (
              <button
                onClick={() => viewProfile()}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ver Perfil
              </button>
            )}
          </div>
        </div>
        
        {/* Componente de información de billetera */}
        {user?.isFarcasterUser && (
          <div className="mb-6">
            <WalletInfo />
          </div>
        )}
        
          <p className="text-white/90 text-xl mb-4">
            Match 4 emojis to win! 🏆
          </p>
          <p className="text-white/80">Next draw in:</p>
          <div className="flex justify-center mt-4">
            <Timer seconds={gameState.timeRemaining} />
        </div>

        <WinnerAnnouncement 
          winningNumbers={gameState.winningNumbers || []}
          firstPrize={gameState.lastResults?.firstPrize || []}
          secondPrize={gameState.lastResults?.secondPrize || []}
          thirdPrize={gameState.lastResults?.thirdPrize || []}
          freePrize={gameState.lastResults?.freePrize || []}
          currentUserId={user?.id}
        />

        {import.meta.env.DEV && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={forceGameDraw}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Zap size={16} /> Forzar Sorteo
            </button>
          </div>
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
                gameState.lastResults?.firstPrize?.includes(ticket) ? 'first' :
                gameState.lastResults?.secondPrize?.includes(ticket) ? 'second' :
                gameState.lastResults?.thirdPrize?.includes(ticket) ? 'third' : 
                gameState.lastResults?.freePrize?.includes(ticket) ? 'free' : null
              }
            />
          ))}
        </div>
      </div>
      <GameHistoryButton />
      <EmojiChat />
      <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
    </div>
  );
}

export default App;