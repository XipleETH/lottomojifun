import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon, Coins } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMiniKit, useNotification, useViewProfile } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/frame-sdk';
import { useAuth } from './components/AuthProvider';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { PrizePool } from './components/PrizePool';
import { DiagnosticTool } from './components/DiagnosticTool';
import { Toaster } from 'react-hot-toast';
import { WalletInfo } from './components/WalletInfo';

// Estados de compatibilidad
const COMPATIBILITY_MODE_KEY = 'lottomoji_compatibility_mode';

function App() {
  const { gameState, generateTicket, forceGameDraw } = useGameState();
  const { user, signIn, isFarcasterAvailable } = useAuth();
  const { isReady, isFrame, isWarpcast, context } = useMiniKit();
  const { addNotification } = useNotification();
  const { viewProfile } = useViewProfile();
  
  // Modo de compatibilidad para navegadores con problemas
  const [compatibilityMode, setCompatibilityMode] = useState(() => {
    // Intentar obtener el estado de compatibilidad del localStorage
    try {
      const storedMode = localStorage.getItem(COMPATIBILITY_MODE_KEY);
      return storedMode === 'true';
    } catch (e) {
      return false;
    }
  });
  
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Referencia para detectar si estamos en iframe
  const isIframe = window !== window.parent;
  
  // Referencias para debugging
  const frameContext = useRef({
    isFrame,
    isWarpcast,
    isIframe,
    isReady,
    user
  });
  
  // Actualizar el contexto para debugging
  useEffect(() => {
    frameContext.current = {
      isFrame,
      isWarpcast,
      isIframe,
      isReady,
      user
    };
    console.log('Contexto actualizado:', frameContext.current);
  }, [isFrame, isWarpcast, isIframe, isReady, user]);
  
  // Inicializar SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        if (sdk?.ready) {
          console.log('SDK de Farcaster inicializado');
        }
      } catch (error) {
        console.error('Error inicializando SDK de Farcaster:', error);
      } finally {
        // Marcar la carga inicial como completa
        setInitialLoadComplete(true);
      }
    };
    
    initSDK();
  }, []);
  
  // Alertas y notificaciones
  useEffect(() => {
    if (gameState.error) {
      console.error('Error en el estado del juego:', gameState.error);
    }
  }, [gameState.error]);
  
  // Manejar cambio de modo de compatibilidad
  const toggleCompatibilityMode = useCallback(() => {
    setCompatibilityMode(prev => {
      const newMode = !prev;
      try {
        localStorage.setItem(COMPATIBILITY_MODE_KEY, newMode.toString());
      } catch (e) {
        console.error('Error guardando modo de compatibilidad:', e);
      }
      return newMode;
    });
  }, []);
  
  // Activar notificaciones cuando hay resultados de sorteo
  useEffect(() => {
    if (gameState.lastResults && addNotification && user) {
      const userTickets = gameState.tickets.filter(t => t.userId === user.id);
      const userFirstPrize = gameState.lastResults.firstPrize.filter(t => t.userId === user.id);
      const userSecondPrize = gameState.lastResults.secondPrize.filter(t => t.userId === user.id);
      const userThirdPrize = gameState.lastResults.thirdPrize.filter(t => t.userId === user.id);
      const userFreePrize = gameState.lastResults.freePrize.filter(t => t.userId === user.id);
      
      if (userFirstPrize.length > 0) {
        addNotification({
          message: `¡GANASTE EL PRIMER PREMIO! 🏆 ${userFirstPrize.length} ticket${userFirstPrize.length > 1 ? 's' : ''}`,
          type: 'success',
          duration: 10000
        });
      } else if (userSecondPrize.length > 0) {
        addNotification({
          message: `¡GANASTE EL SEGUNDO PREMIO! 🥈 ${userSecondPrize.length} ticket${userSecondPrize.length > 1 ? 's' : ''}`,
          type: 'success',
          duration: 10000
        });
      } else if (userThirdPrize.length > 0) {
        addNotification({
          message: `¡GANASTE EL TERCER PREMIO! 🥉 ${userThirdPrize.length} ticket${userThirdPrize.length > 1 ? 's' : ''}`,
          type: 'success',
          duration: 10000
        });
      } else if (userFreePrize.length > 0) {
        addNotification({
          message: `¡GANASTE UN TICKET GRATIS! 🎟️ ${userFreePrize.length} ticket${userFreePrize.length > 1 ? 's' : ''}`,
          type: 'info',
          duration: 7000
        });
      } else if (userTickets.length > 0) {
        addNotification({
          message: '¡El sorteo ha terminado! No ganaste esta vez.',
          type: 'info',
          duration: 5000
        });
      }
    }
  }, [gameState.lastResults, addNotification, user, gameState.tickets]);

  // Si el usuario no está autenticado con Farcaster, mostrar mensaje de error
  if (!user?.isFarcasterUser && isFarcasterAvailable && initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/20 p-8 rounded-xl max-w-md text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🎰 LottoMojiFun 🎲</h1>
          <p className="text-white text-xl mb-6">Solo para usuarios de Farcaster</p>
          <p className="text-white/80 mb-6">
            Para jugar a LottoMojiFun necesitas iniciar sesión con tu cuenta de Farcaster. 
            Esta aplicación solo está disponible para usuarios de Farcaster.
          </p>
          <button
            onClick={() => signIn()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Iniciar sesión con Farcaster
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-950 to-indigo-950 text-white">
      <Toaster position="top-center" />
      
      <header className="bg-black/30 py-4 px-6 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Trophy className="text-yellow-400 mr-2" />
            <h1 className="text-xl font-bold">LottoMojiFun</h1>
          </div>
          
          {/* Modo de compatibilidad */}
          {import.meta.env.DEV && (
            <button
              onClick={toggleCompatibilityMode}
              className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded-md text-xs font-medium"
            >
              {compatibilityMode ? '🛠️ Modo básico' : '✨ Modo completo'}
            </button>
          )}
          
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                <UserCircle size={18} className="mr-1" />
                <span className="text-sm">{user.username || 'Usuario'}</span>
              </div>
            ) : (
              <div className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                <UserCircle size={18} className="mr-1" />
                <span className="text-sm">Invitado</span>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Advertencia de diagnóstico */}
        {gameState.error && (
          <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg mb-6">
            <h3 className="text-red-200 font-medium text-lg mb-2">Error en la aplicación</h3>
            <p className="text-red-100 mb-2">{gameState.error}</p>
            <a 
              href="/diagnostico.html" 
              target="_blank"
              className="inline-block bg-red-500/50 hover:bg-red-500/70 text-white px-4 py-2 rounded-lg text-sm font-medium mt-2"
            >
              <Terminal className="inline mr-2" size={16} />
              Ejecutar diagnóstico
            </a>
          </div>
        )}
        
        {/* Componente de billetera */}
        <div className="mb-6">
          <WalletInfo />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2">
            <p className="text-white/90 text-xl mb-4">
              Elige 4 emojis y gana USDC! 🏆
            </p>
            <p className="text-white/80 mb-2">Próximo sorteo en:</p>
            <div className="flex justify-center mb-6">
              <Timer seconds={gameState.timeRemaining} />
            </div>
          </div>
          
          {/* Panel de premios */}
          <div>
            <PrizePool />
          </div>
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
                gameState.lastResults?.firstPrize?.some(t => t.id === ticket.id) ? 'first' :
                gameState.lastResults?.secondPrize?.some(t => t.id === ticket.id) ? 'second' :
                gameState.lastResults?.thirdPrize?.some(t => t.id === ticket.id) ? 'third' : 
                gameState.lastResults?.freePrize?.some(t => t.id === ticket.id) ? 'free' : null
              }
            />
          ))}
        </div>
        
        {/* Información sobre cómo funciona */}
        <div className="mt-8 bg-white/10 p-6 rounded-lg">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center">
            <Coins className="mr-2" size={20} />
            ¿Cómo funciona?
          </h2>
          <div className="space-y-4">
            <p>
              LottoMojiFun es una lotería divertida de emojis en la blockchain de Base. Elige 4 emojis, compra un ticket con USDC, y espera al sorteo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Premios 🏆</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>Primer Premio (70%):</strong> 4 emojis exactos en misma posición</li>
                  <li><strong>Segundo Premio (10%):</strong> 4 emojis en cualquier posición</li>
                  <li><strong>Tercer Premio (5%):</strong> 3 emojis exactos en misma posición</li>
                  <li><strong>Ticket Gratis:</strong> 3 emojis en cualquier posición</li>
                </ul>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Sorteos 🎯</h3>
                <ul className="space-y-2 text-sm">
                  <li>Cada sorteo ocurre automáticamente cada 24 horas</li>
                  <li>Los resultados se verifican en la blockchain</li>
                  <li>Los premios se distribuyen automáticamente</li>
                  <li>5% del pozo se reserva para sorteos futuros</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-8 mb-4">
          <GameHistoryButton />
        </div>
        
        {/* Comentarios con emojis (solo para Farcaster) */}
        {user?.isFarcasterUser && (
          <div className="mt-8">
            <EmojiChat />
          </div>
        )}
      </main>
      
      <footer className="bg-black/50 py-4 px-6 backdrop-blur-sm mt-8">
        <div className="container mx-auto text-center text-white/50 text-sm">
          &copy; 2024 LottoMojiFun - Hecho con ❤️ - Smart Contract: <a 
            href={`https://basescan.org/address/${import.meta.env.VITE_CONTRACT_ADDRESS || '0xA92937B6De354298C0aAb704C073203ABd83Ef7c'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/70"
          >
            Base
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;