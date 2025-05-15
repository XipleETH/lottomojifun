/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * Funciones de Firebase para LottoMojiFun
 * 
 * Estas funciones se ejecutan en el servidor de Firebase y centralizan
 * la lógica de generación de resultados del juego.
 */

// Inicializar la app de Firebase Admin
initializeApp();

// Obtener una referencia a Firestore
const db = getFirestore();

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DRAW_INTERVAL_MS = 60000; // 1 minuto

// Función para generar emojis aleatorios
const generateRandomEmojis = (count) => {
  const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                  '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭'];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  return result;
};

// Función para verificar si un ticket es ganador
const checkWin = (ticketNumbers, winningNumbers) => {
  if (!ticketNumbers || !winningNumbers) return { firstPrize: false, secondPrize: false, thirdPrize: false };
  
  // Contar cuántos números coinciden
  const matches = ticketNumbers.filter(num => winningNumbers.includes(num)).length;
  
  return {
    firstPrize: matches === 4,   // Todos los números coinciden
    secondPrize: matches === 3,  // 3 números coinciden
    thirdPrize: matches === 2    // 2 números coinciden
  };
};

// Función para procesar el sorteo del juego
exports.triggerGameDraw = onCall({ maxInstances: 1 }, async (request) => {
  try {
    logger.info("Procesando sorteo del juego...");
    
    // 1. Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    logger.info("Números ganadores generados:", winningNumbers);
    
    // 2. Calcular próximo sorteo
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    // 3. Actualizar estado del juego
    await db.collection('game_state').doc(GAME_STATE_DOC).set({
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextMinute),
      lastUpdated: FieldValue.serverTimestamp()
    });
    
    // 4. Obtener tickets activos
    const ticketsSnapshot = await db.collection(TICKETS_COLLECTION).get();
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`Procesando ${tickets.length} tickets`);
    
    // 5. Comprobar ganadores
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: []
    };
    
    tickets.forEach(ticket => {
      if (!ticket?.numbers) return;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
    });
    
    logger.info("Resultados:", {
      firstPrize: results.firstPrize.length,
      secondPrize: results.secondPrize.length,
      thirdPrize: results.thirdPrize.length
    });
    
    // 6. Guardar resultado
    const gameResultId = Date.now().toString();
    
    // Preparar datos serializables para Firestore
    const serializableResult = {
      id: gameResultId,
      timestamp: FieldValue.serverTimestamp(),
      dateTime: new Date().toISOString(), // Fecha legible como respaldo
      winningNumbers,
      firstPrize: results.firstPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      })),
      secondPrize: results.secondPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      })),
      thirdPrize: results.thirdPrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      }))
    };
    
    await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(serializableResult);
    
    logger.info("Sorteo procesado con éxito con ID:", gameResultId);
    
    return { success: true, resultId: gameResultId };
  } catch (error) {
    logger.error("Error procesando el sorteo:", error);
    return { success: false, error: error.message };
  }
});
