// Utilidad para generar tickets usando la colección player_tickets
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getTicketsCollectionName } from '../firebase/initTickets';
import { Ticket } from '../types';
import { generateRandomEmojis } from './gameLogic';

/**
 * Crea un ticket con los emojis seleccionados por el usuario
 * @param userId - ID del usuario
 * @param username - Nombre del usuario
 * @param emojis - Array de emojis seleccionados (debe ser de longitud 4)
 * @param walletAddress - Dirección de wallet opcional
 * @returns Un objeto con información del ticket o un mensaje de error
 */
export const createPlayerTicket = async (
  userId: string,
  username: string,
  emojis: string[],
  walletAddress?: string
): Promise<{ success: boolean; ticketId?: string; error?: string }> => {
  try {
    // Verificar que se hayan seleccionado exactamente 4 emojis
    if (!emojis || emojis.length !== 4) {
      return {
        success: false,
        error: 'Debes seleccionar exactamente 4 emojis'
      };
    }
    
    // Obtener el nombre de la colección de tickets activa
    const ticketsCollection = await getTicketsCollectionName();
    console.log(`[ticketHelper] Usando colección de tickets: ${ticketsCollection}`);
    
    // Generar un hash único para el ticket (simulado)
    const uniqueHash = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Crear el objeto de datos del ticket
    const ticketData = {
      numbers: emojis,
      timestamp: serverTimestamp(),
      userId: userId,
      username: username,
      walletAddress: walletAddress || '0x' + userId.padStart(40, '0'), // Usar dirección proporcionada o simular una
      fid: 0, // Por defecto 0 si no viene de Farcaster
      isFarcasterUser: false,
      verifiedWallet: false,
      chainId: 10,
      ticketHash: uniqueHash,
      createdAt: new Date().toISOString()
    };
    
    // Guardar el ticket en Firestore
    const ticketRef = await addDoc(collection(db, ticketsCollection), ticketData);
    
    console.log(`[ticketHelper] Ticket creado con ID: ${ticketRef.id} para el usuario ${username}`);
    console.log(`[ticketHelper] Emojis seleccionados: ${emojis.join(' ')}`);
    
    return {
      success: true,
      ticketId: ticketRef.id
    };
  } catch (error) {
    console.error('[ticketHelper] Error creando ticket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Genera un ticket con 4 emojis aleatorios
 * @param userId - ID del usuario
 * @param username - Nombre del usuario 
 * @param walletAddress - Dirección de wallet opcional
 * @returns Un objeto con información del ticket o un mensaje de error
 */
export const createRandomTicket = async (
  userId: string,
  username: string,
  walletAddress?: string
): Promise<{ success: boolean; ticketId?: string; emojis?: string[]; error?: string }> => {
  try {
    // Generar 4 emojis aleatorios
    const randomEmojis = generateRandomEmojis(4);
    
    // Llamar a la función principal
    const result = await createPlayerTicket(userId, username, randomEmojis, walletAddress);
    
    return {
      ...result,
      emojis: randomEmojis
    };
  } catch (error) {
    console.error('[ticketHelper] Error creando ticket aleatorio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}; 