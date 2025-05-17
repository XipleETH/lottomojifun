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
const DRAW_CONTROL_COLLECTION = 'draw_control';
const SCHEDULER_LOCKS_COLLECTION = 'scheduler_locks';
const PROCESS_TIMEOUT_MS = 30000; // 30 segundos para timeout
const MAX_TICKETS_PER_DRAW = 5000; // Límite de tickets a procesar por sorteo

// Lista de emojis disponibles para el juego
const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                '🎁', '🎮', '🚀', '🌍', '🍀'];

/**
 * Genera una cadena que representa el minuto actual en formato YYYY-MM-DD-HH-MM
 * @param {Date} date - Fecha para la que generar la clave
 * @returns {string} - Clave del minuto
 */
const generateMinuteKey = (date = new Date()) => {
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
};

/**
 * Genera un array de emojis aleatorios
 * @param {number} count - Cantidad de emojis a generar
 * @returns {string[]} - Array de emojis aleatorios
 */
const generateRandomEmojis = (count) => {
  const result = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  return result;
};

/**
 * Verifica si un ticket es ganador según los criterios establecidos
 * @param {string[]} ticketNumbers - Emojis del ticket
 * @param {string[]} winningNumbers - Emojis ganadores
 * @returns {Object} - Estado de premios del ticket
 */
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
  
  // Crear copias para no modificar los originales
  const ticketCopy = [...ticketNumbers];
  const winningCopy = [...winningNumbers];
  
  // Contar emojis que coinciden, teniendo en cuenta repeticiones
  let matchCount = 0;
  for (let i = 0; i < winningCopy.length; i++) {
    const index = ticketCopy.indexOf(winningCopy[i]);
    if (index !== -1) {
      matchCount++;
      // Eliminar el emoji ya contado para no contar repetidos
      ticketCopy.splice(index, 1);
    }
  }
  
  return {
    // 4 aciertos en el mismo orden (premio mayor)
    firstPrize: exactMatches === 4,
    
    // 4 aciertos en cualquier orden (segundo premio)
    secondPrize: matchCount === 4 && exactMatches !== 4,
    
    // 3 aciertos en orden exacto (tercer premio)
    thirdPrize: exactMatches === 3,
    
    // 3 aciertos en cualquier orden (cuarto premio - ticket gratis)
    freePrize: matchCount === 3 && exactMatches !== 3
  };
};

/**
 * Verifica si ya existe un resultado para el minuto específico
 * @param {string} minuteKey - Clave del minuto a verificar
 * @param {string} processId - ID del proceso actual
 * @returns {Promise<Object>} - Resultado de la verificación
 */
const checkExistingResult = async (minuteKey, processId) => {
  // Verificación por minuteKey
  const existingByKeyQuery = db.collection(GAME_RESULTS_COLLECTION)
    .where('minuteKey', '==', minuteKey)
    .limit(1);
  
  const existingByKey = await existingByKeyQuery.get();
  
  if (!existingByKey.empty) {
    const existingResult = existingByKey.docs[0];
    logger.info(`[${processId}] Ya existe un resultado para el minuto ${minuteKey} con ID: ${existingResult.id}`);
    return { exists: true, resultId: existingResult.id };
  }
  
  // Verificación adicional por timestamp
  const minuteStart = new Date();
  minuteStart.setMinutes(parseInt(minuteKey.split('-')[4]));
  minuteStart.setHours(parseInt(minuteKey.split('-')[3]));
  minuteStart.setDate(parseInt(minuteKey.split('-')[2]));
  minuteStart.setMonth(parseInt(minuteKey.split('-')[1]) - 1);
  minuteStart.setFullYear(parseInt(minuteKey.split('-')[0]));
  minuteStart.setSeconds(0);
  minuteStart.setMilliseconds(0);
  
  const minuteEnd = new Date(minuteStart);
  minuteEnd.setMinutes(minuteStart.getMinutes() + 1);
  
  const existingResultsQuery = db.collection(GAME_RESULTS_COLLECTION)
    .where('timestamp', '>=', minuteStart)
    .where('timestamp', '<', minuteEnd)
    .limit(1);
  
  const existingResults = await existingResultsQuery.get();
  
  if (!existingResults.empty) {
    const existingResult = existingResults.docs[0];
    logger.info(`[${processId}] Ya existe un resultado para el periodo de tiempo ${minuteKey} con ID: ${existingResult.id}`);
    return { exists: true, resultId: existingResult.id };
  }
  
  return { exists: false };
};

/**
 * Verifica si un proceso está en progreso y determina si debe continuarse
 * @param {DocumentSnapshot} controlDoc - Documento de control
 * @param {string} processId - ID del proceso actual
 * @param {string} minuteKey - Clave del minuto
 * @returns {Object} - Estado del proceso
 */
const checkProcessStatus = (controlDoc, processId, minuteKey) => {
  if (!controlDoc.exists) return { shouldContinue: true };
  
  const data = controlDoc.data();
  
  // Si ya está completado, retornar el ID del resultado
  if (data.completed) {
    logger.info(`[${processId}] Ya se procesó un sorteo para el minuto ${minuteKey} con ID: ${data.resultId}`);
    return { 
      shouldContinue: false, 
      alreadyCompleted: true, 
      resultId: data.resultId 
    };
  }
  
  // Si está en proceso pero no completado, verificar timeout
  if (data.inProgress) {
    const startTime = data.startedAt ? new Date(data.startedAt).getTime() : 0;
    const elapsed = Date.now() - startTime;
    
    if (elapsed < PROCESS_TIMEOUT_MS) {
      logger.info(`[${processId}] Sorteo para el minuto ${minuteKey} en proceso, esperando...`);
      return { shouldContinue: false, inProgress: true };
    } else {
      logger.warn(`[${processId}] Sorteo para el minuto ${minuteKey} no completado después de ${PROCESS_TIMEOUT_MS/1000}s, reiniciando...`);
      return { shouldContinue: true };
    }
  }
  
  return { shouldContinue: true };
};

/**
 * Función compartida para procesar el sorteo
 * @returns {Promise<Object>} - Resultado del sorteo
 */
const processGameDraw = async () => {
  const now = new Date();
  const currentMinute = generateMinuteKey(now);
  const drawControlRef = db.collection(DRAW_CONTROL_COLLECTION).doc(currentMinute);
  const processId = Date.now().toString();
  
  try {
    logger.info(`[${processId}] Procesando sorteo del juego para el minuto ${currentMinute}...`);
    
    // 1. Verificar si ya existe un resultado
    const existingResult = await checkExistingResult(currentMinute, processId);
    if (existingResult.exists) {
      return { success: true, alreadyProcessed: true, resultId: existingResult.resultId };
    }
    
    // 2. Verificar si ya se procesó un sorteo usando transacción
    const result = await db.runTransaction(async (transaction) => {
      const drawControlDoc = await transaction.get(drawControlRef);
      
      const status = checkProcessStatus(drawControlDoc, processId, currentMinute);
      if (!status.shouldContinue) {
        return status.alreadyCompleted 
          ? { success: true, alreadyProcessed: true, resultId: status.resultId }
          : { success: false, inProgress: status.inProgress };
      }
      
      // Marcar este minuto como en proceso
      transaction.set(drawControlRef, {
        timestamp: FieldValue.serverTimestamp(),
        inProgress: true,
        startedAt: now.toISOString(),
        processId: processId
      });
      
      return { success: true, alreadyProcessed: false };
    });
    
    // Si ya está procesado o en progreso, retornar
    if (result.alreadyProcessed) {
      return result;
    }
    
    if (!result.success) {
      logger.info(`[${processId}] Sorteo ya está siendo procesado por otra instancia, abortando...`);
      return { success: false };
    }
    
    // 3. Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    logger.info(`[${processId}] Números ganadores generados:`, winningNumbers);
    
    // 4. Calcular próximo sorteo
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    // 5. Actualizar estado del juego
    await db.collection('game_state').doc(GAME_STATE_DOC).set({
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextMinute),
      lastUpdated: FieldValue.serverTimestamp(),
      lastProcessId: processId
    });
    
    // 6. Obtener tickets activos con límite para mejor rendimiento
    const ticketsSnapshot = await db.collection(TICKETS_COLLECTION)
      .limit(MAX_TICKETS_PER_DRAW)
      .get();
    
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`[${processId}] Procesando ${tickets.length} tickets (limitado a ${MAX_TICKETS_PER_DRAW})`);
    
    // 7. Comprobar ganadores
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
    
    logger.info(`[${processId}] Resultados:`, {
      firstPrize: results.firstPrize.length,
      secondPrize: results.secondPrize.length,
      thirdPrize: results.thirdPrize.length,
      freePrize: results.freePrize.length
    });
    
    // 8. Guardar resultado
    const gameResultId = Date.now().toString();
    
    // Preparar datos serializables para Firestore
    const serializableResult = {
      id: gameResultId,
      timestamp: FieldValue.serverTimestamp(),
      dateTime: new Date().toISOString(),
      winningNumbers,
      processId: processId,
      minuteKey: currentMinute,
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
    
    // 9. Generar tickets gratis para los ganadores del premio "freePrize"
    const freeTicketPromises = results.freePrize
      .filter(ticket => ticket.userId && ticket.userId !== 'anonymous' && ticket.userId !== 'temp')
      .map(ticket => {
        const freeTicketNumbers = generateRandomEmojis(4);
        
        return db.collection(TICKETS_COLLECTION).add({
          numbers: freeTicketNumbers,
          timestamp: FieldValue.serverTimestamp(),
          userId: ticket.userId,
          isFreeTicket: true,
          wonFrom: ticket.id
        });
      });
    
    await Promise.all(freeTicketPromises);
    
    if (freeTicketPromises.length > 0) {
      logger.info(`[${processId}] ${freeTicketPromises.length} tickets gratis generados`);
    }
    
    // 10. Actualizar el control de sorteos para este minuto como completado
    await drawControlRef.set({
      timestamp: FieldValue.serverTimestamp(),
      inProgress: false,
      completed: true,
      resultId: gameResultId,
      processId: processId,
      completedAt: new Date().toISOString()
    });
    
    logger.info(`[${processId}] Sorteo procesado con éxito con ID:`, gameResultId);
    
    return { success: true, resultId: gameResultId };
  } catch (error) {
    logger.error(`[${processId}] Error procesando el sorteo:`, error);
    
    // Marcar el documento de control como fallido para que pueda ser reintentado
    try {
      await drawControlRef.set({
        timestamp: FieldValue.serverTimestamp(),
        inProgress: false,
        completed: false,
        processId: processId,
        error: error.message,
        errorAt: new Date().toISOString()
      }, { merge: true });
    } catch (updateError) {
      logger.error(`[${processId}] Error actualizando documento de control tras fallo:`, updateError);
    }
    
    return { success: false, error: error.message };
  }
};

// Función programada que se ejecuta cada minuto para realizar el sorteo automáticamente
exports.scheduledGameDraw = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "America/Mexico_City",
  retryConfig: {
    maxRetryAttempts: 0, // Desactivar reintentos automáticos para evitar duplicados
    minBackoffSeconds: 10
  },
  maxInstances: 1 // Asegurar que solo se ejecuta una instancia a la vez
}, async (event) => {
  const instanceId = Date.now().toString();
  const now = new Date();
  const currentMinute = generateMinuteKey(now);
  
  logger.info(`[${instanceId}] Ejecutando sorteo programado: ${event.jobName}`);
  logger.info(`[${instanceId}] Procesando sorteo para el minuto: ${currentMinute}`);
  
  // Verificaciones rápidas para abortar si es necesario
  try {
    // Comprobar si ya existe un resultado para este minuto
    const existingResult = await checkExistingResult(currentMinute, instanceId);
    if (existingResult.exists) {
      logger.info(`[${instanceId}] Ya existe un resultado para el minuto ${currentMinute}. Abortando ejecución.`);
      return;
    }
    
    // Verificar estado del proceso de sorteo
    const drawControlRef = db.collection(DRAW_CONTROL_COLLECTION).doc(currentMinute);
    const drawControlDoc = await drawControlRef.get();
    const processStatus = checkProcessStatus(drawControlDoc, instanceId, currentMinute);
    
    if (!processStatus.shouldContinue) {
      if (processStatus.alreadyCompleted) {
        logger.info(`[${instanceId}] Ya se procesó un sorteo para el minuto ${currentMinute}. Abortando ejecución.`);
      } else {
        logger.info(`[${instanceId}] Sorteo para el minuto ${currentMinute} en progreso. Abortando ejecución.`);
      }
      return;
    }
  } catch (error) {
    logger.error(`[${instanceId}] Error en verificaciones previas:`, error);
    // Continuamos de todas formas, ya que processGameDraw tiene sus propias verificaciones
  }
  
  const lockRef = db.collection(SCHEDULER_LOCKS_COLLECTION).doc(currentMinute);
  
  try {
    // Intentar adquirir el bloqueo
    const lockResult = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      
      if (lockDoc.exists) {
        logger.info(`[${instanceId}] Ya hay una instancia procesando el sorteo para el minuto ${currentMinute}`);
        return false;
      }
      
      transaction.set(lockRef, {
        timestamp: FieldValue.serverTimestamp(),
        jobName: event.jobName,
        instanceId: instanceId,
        startedAt: now.toISOString()
      });
      
      return true;
    });
    
    if (!lockResult) {
      logger.info(`[${instanceId}] Abortando ejecución duplicada del sorteo programado`);
      return;
    }
    
    logger.info(`[${instanceId}] Bloqueo adquirido, procediendo con el sorteo`);
    
    // Ejecutar el sorteo
    const result = await processGameDraw();
    
    // Actualizar el bloqueo como completado
    await lockRef.update({
      completed: true,
      completedAt: new Date().toISOString(),
      resultId: result.resultId || null,
      success: result.success || false
    });
    
    logger.info(`[${instanceId}] Sorteo finalizado con éxito: ${result.success}`);
  } catch (error) {
    logger.error(`[${instanceId}] Error en scheduledGameDraw:`, error);
    
    // Marcar el bloqueo como fallido
    try {
      await lockRef.update({
        error: error.message,
        errorAt: new Date().toISOString(),
        completed: false
      });
    } catch (updateError) {
      logger.error(`[${instanceId}] Error actualizando bloqueo tras fallo:`, updateError);
    }
  }
});

// Función Cloud que puede ser invocada manualmente para pruebas o sorteos forzados
exports.triggerGameDraw = onCall({ maxInstances: 1 }, async (request) => {
  logger.info("Solicitud manual de sorteo recibida");
  return await processGameDraw();
});
