"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerGameDraw = exports.scheduledGameDraw = exports.farcasterWebhook = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
// Inicializar la aplicación de Firebase
admin.initializeApp();
// Constantes para el juego
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
// Webhook para procesar eventos de Farcaster
exports.farcasterWebhook = functions.https.onRequest(async (req, res) => {
    try {
        // Verificar que es un POST
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        // Obtener y verificar el evento de Farcaster
        const event = req.body;
        console.log('Evento de Farcaster recibido:', event);
        // Procesar diferentes tipos de eventos
        if (event && event.type) {
            switch (event.type) {
                case 'APP_ADDED':
                    // Un usuario ha añadido la aplicación
                    await handleAppAdded(event.data);
                    break;
                case 'APP_REMOVED':
                    // Un usuario ha eliminado la aplicación
                    await handleAppRemoved(event.data);
                    break;
                case 'USER_INTERACTION':
                    // Interacción de usuario (por ejemplo, clic en un botón)
                    await handleUserInteraction(event.data);
                    break;
                case 'NOTIFICATION_SENT':
                    // Notificación enviada
                    console.log('Notificación enviada:', event.data);
                    break;
                default:
                    console.log('Tipo de evento desconocido:', event.type);
            }
        }
        // Responder con éxito
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error procesando webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Procesar evento APP_ADDED
async function handleAppAdded(data) {
    if (!data || !data.userId)
        return;
    try {
        // Guardar datos del usuario que añadió la aplicación
        const db = admin.firestore();
        await db.collection('farcaster_users').doc(data.userId).set({
            fid: data.userId,
            added_at: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        }, { merge: true });
        console.log(`Usuario ${data.userId} ha añadido la aplicación`);
    }
    catch (error) {
        console.error('Error guardando datos de usuario:', error);
    }
}
// Procesar evento APP_REMOVED
async function handleAppRemoved(data) {
    if (!data || !data.userId)
        return;
    try {
        // Marcar usuario como inactivo
        const db = admin.firestore();
        await db.collection('farcaster_users').doc(data.userId).update({
            status: 'inactive',
            removed_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Usuario ${data.userId} ha eliminado la aplicación`);
    }
    catch (error) {
        console.error('Error actualizando estado de usuario:', error);
    }
}
// Procesar interacción de usuario
async function handleUserInteraction(data) {
    if (!data || !data.userId)
        return;
    try {
        // Registrar la interacción
        const db = admin.firestore();
        await db.collection('farcaster_interactions').add({
            fid: data.userId,
            type: data.type || 'unknown',
            data: data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Interacción registrada para usuario ${data.userId}`);
    }
    catch (error) {
        console.error('Error registrando interacción:', error);
    }
}
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
    if (!ticketNumbers || !winningNumbers)
        return {
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
    // Para el segundo premio y ticket gratis, contar emojis coincidentes
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
// Función compartida para procesar el sorteo
const processGameDraw = async () => {
    const db = admin.firestore();
    const now = new Date();
    const currentMinute = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    const drawControlRef = db.collection('draw_control').doc(currentMinute);
    const processId = Date.now().toString();
    try {
        console.log(`[${processId}] Procesando sorteo del juego para el minuto ${currentMinute}...`);
        // Verificaciones para evitar duplicados
        const minuteStart = new Date(now);
        minuteStart.setSeconds(0);
        minuteStart.setMilliseconds(0);
        const minuteEnd = new Date(minuteStart);
        minuteEnd.setMinutes(minuteStart.getMinutes() + 1);
        // Verificar si ya existe un resultado por minuteKey
        const existingByKeyQuery = await db.collection(GAME_RESULTS_COLLECTION)
            .where('minuteKey', '==', currentMinute)
            .limit(1)
            .get();
        if (!existingByKeyQuery.empty) {
            const existingResult = existingByKeyQuery.docs[0];
            console.log(`[${processId}] Ya existe un resultado para el minuto ${currentMinute} con ID: ${existingResult.id}`);
            return { success: true, alreadyProcessed: true, resultId: existingResult.id };
        }
        // Usar transacción para evitar condiciones de carrera
        const result = await db.runTransaction(async (transaction) => {
            const drawControlDoc = await transaction.get(drawControlRef);
            if (drawControlDoc.exists) {
                const data = drawControlDoc.data();
                if (data?.completed) {
                    console.log(`[${processId}] Ya se procesó un sorteo para el minuto ${currentMinute} con ID: ${data.resultId}`);
                    return { success: true, alreadyProcessed: true, resultId: data.resultId };
                }
                if (data?.inProgress) {
                    const startTime = data.startedAt ? new Date(data.startedAt).getTime() : 0;
                    const elapsed = Date.now() - startTime;
                    if (elapsed < 30000) {
                        console.log(`[${processId}] Sorteo para el minuto ${currentMinute} en proceso, esperando...`);
                        return { success: false, inProgress: true };
                    }
                }
            }
            // Marcar este minuto como en proceso
            transaction.set(drawControlRef, {
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                inProgress: true,
                startedAt: now.toISOString(),
                processId: processId
            });
            return { success: true, alreadyProcessed: false };
        });
        if (result.alreadyProcessed) {
            return result;
        }
        if (!result.success) {
            console.log(`[${processId}] Sorteo ya está siendo procesado por otra instancia, abortando...`);
            return { success: false };
        }
        // Generar números ganadores
        const winningNumbers = generateRandomEmojis(4);
        console.log(`[${processId}] Números ganadores generados:`, winningNumbers);
        // Calcular próximo sorteo (en 10 minutos)
        const nextDraw = new Date(now);
        const currentMinutes = nextDraw.getMinutes();
        const minutesToAdd = 10 - (currentMinutes % 10);
        nextDraw.setMinutes(nextDraw.getMinutes() + minutesToAdd);
        nextDraw.setSeconds(0);
        nextDraw.setMilliseconds(0);
        // Actualizar estado del juego
        await db.collection('game_state').doc(GAME_STATE_DOC).set({
            winningNumbers,
            nextDrawTime: admin.firestore.Timestamp.fromDate(nextDraw),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            lastProcessId: processId
        });
        // Obtener tickets activos
        const ticketsSnapshot = await db.collection(TICKETS_COLLECTION).get();
        const tickets = ticketsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`[${processId}] Procesando ${tickets.length} tickets`);
        // Comprobar ganadores
        const results = {
            firstPrize: [],
            secondPrize: [],
            thirdPrize: [],
            freePrize: []
        };
        tickets.forEach((ticket) => {
            if (!ticket?.numbers)
                return;
            const winStatus = checkWin(ticket.numbers, winningNumbers);
            if (winStatus.firstPrize)
                results.firstPrize.push(ticket);
            else if (winStatus.secondPrize)
                results.secondPrize.push(ticket);
            else if (winStatus.thirdPrize)
                results.thirdPrize.push(ticket);
            else if (winStatus.freePrize)
                results.freePrize.push(ticket);
        });
        // Guardar resultado
        const gameResultId = Date.now().toString();
        // Preparar datos serializables para Firestore
        const serializableResult = {
            id: gameResultId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            dateTime: new Date().toISOString(),
            winningNumbers,
            processId: processId,
            minuteKey: currentMinute,
            firstPrize: results.firstPrize.map((ticket) => ({
                id: ticket.id,
                numbers: ticket.numbers,
                timestamp: ticket.timestamp,
                userId: ticket.userId || 'anonymous'
            })),
            secondPrize: results.secondPrize.map((ticket) => ({
                id: ticket.id,
                numbers: ticket.numbers,
                timestamp: ticket.timestamp,
                userId: ticket.userId || 'anonymous'
            })),
            thirdPrize: results.thirdPrize.map((ticket) => ({
                id: ticket.id,
                numbers: ticket.numbers,
                timestamp: ticket.timestamp,
                userId: ticket.userId || 'anonymous'
            })),
            freePrize: results.freePrize.map((ticket) => ({
                id: ticket.id,
                numbers: ticket.numbers,
                timestamp: ticket.timestamp,
                userId: ticket.userId || 'anonymous'
            }))
        };
        // Guardar el resultado en Firestore
        await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(serializableResult);
        // Generar tickets gratis para los ganadores del premio "freePrize"
        for (const ticket of results.freePrize) {
            if (ticket.userId && ticket.userId !== 'anonymous' && ticket.userId !== 'temp') {
                // Generar un nuevo ticket gratis con números aleatorios
                const freeTicketNumbers = generateRandomEmojis(4);
                await db.collection(TICKETS_COLLECTION).add({
                    numbers: freeTicketNumbers,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    userId: ticket.userId,
                    isFreeTicket: true,
                    wonFrom: ticket.id
                });
                console.log(`[${processId}] Ticket gratis generado para usuario ${ticket.userId}`);
            }
        }
        // Actualizar el control de sorteos para este minuto como completado
        await drawControlRef.set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            inProgress: false,
            completed: true,
            resultId: gameResultId,
            processId: processId,
            completedAt: new Date().toISOString()
        });
        console.log(`[${processId}] Sorteo procesado con éxito con ID:`, gameResultId);
        return { success: true, resultId: gameResultId };
    }
    catch (error) {
        console.error(`[${processId}] Error procesando el sorteo:`, error);
        // Marcar el documento de control como fallido
        try {
            await drawControlRef.set({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                inProgress: false,
                completed: false,
                processId: processId,
                error: error instanceof Error ? error.message : 'Error desconocido',
                errorAt: new Date().toISOString()
            }, { merge: true });
        }
        catch (updateError) {
            console.error(`[${processId}] Error actualizando documento de control tras fallo:`, updateError);
        }
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
};
// Función programada que se ejecuta cada 10 minutos para realizar el sorteo automáticamente
exports.scheduledGameDraw = (0, scheduler_1.onSchedule)({
    schedule: "every 10 minutes",
    timeZone: "America/Mexico_City", // Ajusta a tu zona horaria
    maxInstances: 1 // Asegurar que solo se ejecuta una instancia a la vez
}, async (event) => {
    const instanceId = Date.now().toString();
    console.log(`[${instanceId}] Ejecutando sorteo programado: ${event.jobName}`);
    try {
        // Ejecutar el sorteo
        const result = await processGameDraw();
        console.log(`[${instanceId}] Sorteo finalizado con éxito: ${result.success}`);
    }
    catch (error) {
        console.error(`[${instanceId}] Error en scheduledGameDraw:`, error);
    }
});
// Función Cloud que puede ser invocada manualmente (para pruebas o sorteos forzados)
exports.triggerGameDraw = (0, https_1.onCall)({ maxInstances: 1 }, async (request) => {
    console.log("Solicitud manual de sorteo recibida");
    return await processGameDraw();
});
//# sourceMappingURL=index.js.map