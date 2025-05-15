/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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
                  '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                  '🎁', '🎮', '🚀', '🌍', '🍀'];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  return result;
};

// Función para verificar si un ticket es ganador con los nuevos criterios
const checkWin = (ticketNumbers, winningNumbers) => {
  if (!ticketNumbers || !winningNumbers) return { 
    firstPrize: false, 
    secondPrize: false, 
    thirdPrize: false,
    freePrize: false 
  };
  
  // Verificar coincidencias exactas (mismo emoji en la misma posición)
  let exactMatches = 0;
  for (let i = 0; i < ticketNumbers.length; i++) {
    if (i < winningNumbers.length && ticketNumbers[i] === winningNumbers[i]) {
      exactMatches++;
    }
  }
  
  // Verificar coincidencias en desorden (emoji presente pero en otra posición)
  const unorderedMatches = ticketNumbers.filter(emoji => winningNumbers.includes(emoji)).length;
  
  return {
    // 4 aciertos en el mismo orden (premio mayor)
    firstPrize: exactMatches === 4,
    
    // 3 aciertos en orden exacto (segundo premio)
    secondPrize: exactMatches === 3,
    
    // 4 aciertos en cualquier orden (tercer premio)
    thirdPrize: exactMatches < 4 && unorderedMatches === 4,
    
    // 3 aciertos en cualquier orden (cuarto premio - ticket gratis)
    freePrize: exactMatches < 3 && unorderedMatches === 3
  };
};

// Función compartida para procesar el sorteo
const processGameDraw = async () => {
  try {
    logger.info("Procesando sorteo del juego...");
    
    // 1. Verificar si ya se procesó un sorteo para este minuto
    const now = new Date();
    const currentMinute = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    
    // Verificar en una colección especial para control de sorteos
    const drawControlRef = db.collection('draw_control').doc(currentMinute);
    
    // Usar transacción para evitar condiciones de carrera
    const result = await db.runTransaction(async (transaction) => {
      const drawControlDoc = await transaction.get(drawControlRef);
      
      // Si ya existe un documento para este minuto, otro proceso ya está manejando este sorteo
      if (drawControlDoc.exists) {
        const data = drawControlDoc.data();
        
        // Si ya está completado, retornar el ID del resultado
        if (data.completed) {
          logger.info(`Ya se procesó un sorteo para el minuto ${currentMinute} con ID: ${data.resultId}`);
          return { success: true, alreadyProcessed: true, resultId: data.resultId };
        }
        
        // Si está en proceso pero no completado, esperar un poco y reintentar
        if (data.inProgress) {
          logger.info(`Sorteo para el minuto ${currentMinute} en proceso, esperando...`);
          return { success: false, inProgress: true };
        }
      }
      
      // Marcar este minuto como en proceso
      transaction.set(drawControlRef, {
        timestamp: FieldValue.serverTimestamp(),
        inProgress: true,
        startedAt: now.toISOString()
      });
      
      return { success: true, alreadyProcessed: false };
    });
    
    // Si ya está procesado o en progreso, retornar
    if (result.alreadyProcessed) {
      return result;
    }
    
    if (!result.success) {
      logger.info("Sorteo ya está siendo procesado por otra instancia, abortando...");
      return { success: false };
    }
    
    // 2. Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    logger.info("Números ganadores generados:", winningNumbers);
    
    // 3. Calcular próximo sorteo
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    // 4. Actualizar estado del juego
    await db.collection('game_state').doc(GAME_STATE_DOC).set({
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextMinute),
      lastUpdated: FieldValue.serverTimestamp()
    });
    
    // 5. Obtener tickets activos
    const ticketsSnapshot = await db.collection(TICKETS_COLLECTION).get();
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`Procesando ${tickets.length} tickets`);
    
    // 6. Comprobar ganadores con los nuevos criterios
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: []
    };
    
    tickets.forEach(ticket => {
      if (!ticket?.numbers) return;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) results.firstPrize.push(ticket);
      else if (winStatus.secondPrize) results.secondPrize.push(ticket);
      else if (winStatus.thirdPrize) results.thirdPrize.push(ticket);
      else if (winStatus.freePrize) results.freePrize.push(ticket);
    });
    
    logger.info("Resultados:", {
      firstPrize: results.firstPrize.length,
      secondPrize: results.secondPrize.length,
      thirdPrize: results.thirdPrize.length,
      freePrize: results.freePrize.length
    });
    
    // 7. Guardar resultado
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
      })),
      freePrize: results.freePrize.map(ticket => ({
        id: ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous'
      }))
    };
    
    // Guardar el resultado en Firestore
    await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(serializableResult);
    
    // 8. Generar tickets gratis para los ganadores del premio "freePrize"
    for (const ticket of results.freePrize) {
      if (ticket.userId && ticket.userId !== 'anonymous' && ticket.userId !== 'temp') {
        // Generar un nuevo ticket gratis con números aleatorios
        const freeTicketNumbers = generateRandomEmojis(4);
        
        await db.collection(TICKETS_COLLECTION).add({
          numbers: freeTicketNumbers,
          timestamp: FieldValue.serverTimestamp(),
          userId: ticket.userId,
          isFreeTicket: true,
          wonFrom: ticket.id
        });
        
        logger.info(`Ticket gratis generado para usuario ${ticket.userId}`);
      }
    }
    
    // 9. Actualizar el control de sorteos para este minuto como completado
    await drawControlRef.set({
      timestamp: FieldValue.serverTimestamp(),
      inProgress: false,
      completed: true,
      resultId: gameResultId,
      completedAt: new Date().toISOString()
    });
    
    logger.info("Sorteo procesado con éxito con ID:", gameResultId);
    
    return { success: true, resultId: gameResultId };
  } catch (error) {
    logger.error("Error procesando el sorteo:", error);
    return { success: false, error: error.message };
  }
};

// Función programada que se ejecuta cada minuto para realizar el sorteo automáticamente
exports.scheduledGameDraw = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "America/Mexico_City", // Ajusta a tu zona horaria
  retryConfig: {
    maxRetryAttempts: 3,
    minBackoffSeconds: 10
  }
}, async (event) => {
  logger.info("Ejecutando sorteo programado:", event.jobName);
  await processGameDraw();
});

// Función Cloud que puede ser invocada manualmente (para pruebas o sorteos forzados)
exports.triggerGameDraw = onCall({ maxInstances: 1 }, async (request) => {
  logger.info("Solicitud manual de sorteo recibida");
  return await processGameDraw();
});
