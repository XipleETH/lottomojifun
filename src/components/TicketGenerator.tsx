import React, { useState, useCallback, useEffect } from 'react';
import { Smile, RefreshCcw, HelpCircle } from 'lucide-react';
import { EmojiGrid } from './EmojiGrid';
import { NoMoreTickets } from './NoMoreTickets';
import { toast } from 'react-hot-toast';
import { useWarpcast } from '../providers/WarpcastProvider';
import { useOnchainConnection } from '../hooks/useOnchainConnection';

interface TicketGeneratorProps {
  onGenerateTicket: (emojis: string[]) => void;
  disabled?: boolean;
  ticketCount: number;
  maxTickets: number;
}

export const TicketGenerator: React.FC<TicketGeneratorProps> = ({
  onGenerateTicket,
  disabled = false,
  ticketCount,
  maxTickets
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { isWarpcastApp } = useWarpcast();
  const { isWarpcastApp: isOnchainWarpcast } = useOnchainConnection();
  
  // Determinar si estamos en entorno Warpcast
  const isInWarpcastEnv = isWarpcastApp || isOnchainWarpcast;

  // Reset selección cuando cambia el contador de tickets
  useEffect(() => {
    setSelectedEmojis([]);
  }, [ticketCount]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setSelectedEmojis(prev => {
      // Si ya está seleccionado, eliminarlo
      if (prev.includes(emoji)) {
        return prev.filter(e => e !== emoji);
      }
      
      // Si ya tenemos 4 emojis, reemplazar el último
      if (prev.length >= 4) {
        const newSelection = [...prev];
        newSelection[3] = emoji;
        return newSelection;
      }
      
      // Agregar nuevo emoji a la selección
      return [...prev, emoji];
    });
  }, []);
  
  const handleEmojiDeselect = useCallback((index: number) => {
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = useCallback(async () => {
    try {
      if (selectedEmojis.length !== 4) {
        toast.error('Debes seleccionar exactamente 4 emojis');
        return;
      }
      
      setIsGenerating(true);
      
      // Mostrar mensaje de procesamiento
      toast.loading('Generando ticket...', { id: 'generating-ticket' });
      
      // Generar ticket con un pequeño timeout para permitir UI feedback
      setTimeout(() => {
        try {
          onGenerateTicket(selectedEmojis);
          
          // Mostrar mensaje de éxito
          toast.success('¡Ticket generado correctamente!', { id: 'generating-ticket' });
          
          // Limpiar selección después de éxito
          setSelectedEmojis([]);
        } catch (error) {
          console.error('Error en callback de generación:', error);
          toast.error('Error al generar ticket', { id: 'generating-ticket' });
        } finally {
          setIsGenerating(false);
        }
      }, 800);
    } catch (error) {
      console.error('Error en handleGenerate:', error);
      toast.error('Error al procesar la solicitud');
      setIsGenerating(false);
    }
  }, [selectedEmojis, onGenerateTicket]);

  const resetSelection = useCallback(() => {
    setSelectedEmojis([]);
  }, []);

  // Si se ha alcanzado el máximo de tickets, mostrar mensaje
  if (disabled || ticketCount >= maxTickets) {
    return <NoMoreTickets maxTickets={maxTickets} />;
  }

  return (
    <div className="mb-8 bg-white/10 p-4 rounded-xl border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">
          <Smile className="inline mr-2" size={24} /> Elige 4 emojis
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={resetSelection}
            className="bg-gray-700/50 hover:bg-gray-700 text-white p-2 rounded-lg"
            title="Reiniciar selección"
          >
            <RefreshCcw size={18} />
          </button>
          
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="bg-gray-700/50 hover:bg-gray-700 text-white p-2 rounded-lg"
            title="Cómo jugar"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
      
      {showHelp && (
        <div className="mb-4 p-3 bg-white/20 rounded-lg text-white/90 text-sm">
          <p className="mb-2">
            <strong>Cómo jugar:</strong>
          </p>
          <ol className="list-decimal list-inside">
            <li>Selecciona exactamente 4 emojis para tu ticket</li>
            <li>Cada minuto se realiza un sorteo automático</li>
            <li>Ganas si tus emojis coinciden con los números ganadores</li>
            <li>Puedes tener hasta {maxTickets} tickets activos simultáneamente</li>
          </ol>
        </div>
      )}
      
      {isInWarpcastEnv && (
        <div className="mb-4 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-white text-sm">
          <p>
            <span className="font-semibold">Miniapp de Warpcast:</span> Estás jugando desde Warpcast. Tus tickets se generarán usando tu cuenta de Farcaster.
          </p>
        </div>
      )}
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="text-white mr-2">Emojis seleccionados:</span>
          <div className="flex gap-1 bg-white/10 rounded-lg p-1 min-h-10 items-center">
            {selectedEmojis.length === 0 ? (
              <span className="text-white/60 text-sm px-3">Selecciona emojis abajo</span>
            ) : (
              selectedEmojis.map((emoji, index) => (
                <span key={index} className="text-2xl">{emoji}</span>
              ))
            )}
            {selectedEmojis.length > 0 && selectedEmojis.length < 4 && (
              <span className="text-white/60 text-xs px-2">
                {4 - selectedEmojis.length} más
              </span>
            )}
          </div>
        </div>
        
        <p className="text-white/70 text-xs mb-2">
          Tickets: {ticketCount}/{maxTickets}
        </p>
      </div>
      
      <EmojiGrid 
        onEmojiSelect={handleEmojiSelect} 
        selectedEmojis={selectedEmojis}
        onEmojiDeselect={handleEmojiDeselect}
        maxSelections={4}
      />
      
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={selectedEmojis.length !== 4 || isGenerating}
          className={`py-3 px-6 rounded-lg text-white font-semibold transition-colors ${
            selectedEmojis.length !== 4 || isGenerating
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isGenerating ? 'Generando...' : 'Generar Ticket'}
        </button>
      </div>
    </div>
  );
};