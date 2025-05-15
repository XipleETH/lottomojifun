import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateRandomEmojis } from '../utils/gameLogic';

export const FirestoreDirectWrite: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Usar una colección de prueba para no interferir con los resultados reales
  const TEST_COLLECTION = "test_game_results";

  const writeDirectlyToGameResults = async () => {
    setIsLoading(true);
    setStatus(`Intentando escribir directamente en ${TEST_COLLECTION} (colección de prueba)...`);
    
    try {
      // Crear un documento de prueba con formato simple
      const testResult = {
        id: `test-direct-${Date.now()}`,
        timestamp: new Date().toISOString(),
        dateTime: new Date().toISOString(),
        winningNumbers: ['🍎', '🍊', '🍋', '🍉'],
        firstPrize: [],
        secondPrize: [],
        thirdPrize: [],
        testMode: true
      };
      
      // Método 1: Usando addDoc (colección)
      try {
        const docRef = await addDoc(collection(db, TEST_COLLECTION), testResult);
        setStatus(prev => prev + `\n✅ Método 1 (addDoc) exitoso! ID: ${docRef.id}`);
      } catch (error: any) {
        setStatus(prev => prev + `\n❌ Error Método 1 (addDoc): ${error.message}`);
      }
      
      // Método 2: Usando setDoc (documento con ID)
      try {
        const docId = `test-setdoc-${Date.now()}`;
        await setDoc(doc(db, TEST_COLLECTION, docId), testResult);
        setStatus(prev => prev + `\n✅ Método 2 (setDoc) exitoso! ID: ${docId}`);
      } catch (error: any) {
        setStatus(prev => prev + `\n❌ Error Método 2 (setDoc): ${error.message}`);
      }
      
      // Método 3: Usando setDoc con ruta más explícita
      try {
        const docId = `test-explicit-${Date.now()}`;
        const gameResultsRef = collection(db, TEST_COLLECTION);
        const docRef = doc(gameResultsRef, docId);
        await setDoc(docRef, testResult);
        setStatus(prev => prev + `\n✅ Método 3 (setDoc con ruta explícita) exitoso! ID: ${docId}`);
      } catch (error: any) {
        setStatus(prev => prev + `\n❌ Error Método 3 (setDoc con ruta explícita): ${error.message}`);
      }
      
      setStatus(prev => prev + `\n\nPruebas completadas! Los datos se guardaron en ${TEST_COLLECTION}`);
    } catch (error: any) {
      setStatus(prev => prev + `\n❌ Error general: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCompleteGameResult = async () => {
    setIsLoading(true);
    setStatus(`Generando un resultado de juego completo en ${TEST_COLLECTION} (colección de prueba)...`);
    
    try {
      // Generar emojis ganadores aleatorios
      const winningEmojis = generateRandomEmojis(4);
      
      // Crear un documento con estructura completa
      const gameResultId = `full-game-${Date.now()}`;
      const completeResult = {
        id: gameResultId,
        timestamp: serverTimestamp(),
        dateTime: new Date().toISOString(),
        winningNumbers: winningEmojis,
        // Tickets de ejemplo
        firstPrize: [
          {
            id: `ticket-1-${Date.now()}`,
            numbers: winningEmojis,
            timestamp: Date.now(),
            userId: 'anonymous'
          }
        ],
        secondPrize: [
          {
            id: `ticket-2-${Date.now()}`,
            numbers: [...winningEmojis.slice(0, 3), '🍍'],
            timestamp: Date.now(),
            userId: 'anonymous'
          }
        ],
        thirdPrize: [
          {
            id: `ticket-3-${Date.now()}`,
            numbers: [...winningEmojis.slice(0, 2), '🍍', '🍇'],
            timestamp: Date.now(),
            userId: 'anonymous'
          }
        ],
        testMode: true
      };
      
      try {
        await setDoc(doc(db, TEST_COLLECTION, gameResultId), completeResult);
        setStatus(prev => prev + `\n✅ Resultado de juego completo guardado en ${TEST_COLLECTION}! ID: ${gameResultId}`);
        setStatus(prev => prev + `\n📊 Emojis ganadores: ${winningEmojis.join(' ')}`);
      } catch (error: any) {
        setStatus(prev => prev + `\n❌ Error al guardar resultado completo: ${error.message}`);
      }
      
    } catch (error: any) {
      setStatus(prev => prev + `\n❌ Error general: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/90 p-6 rounded-xl shadow-lg max-w-xl mx-auto my-4">
      <h2 className="text-xl font-bold mb-4">Escritura Directa en {TEST_COLLECTION}</h2>
      <p className="text-sm text-red-600 mb-4">⚠️ Estas pruebas escriben en una colección de prueba ({TEST_COLLECTION}) y no afectan a los resultados reales del juego</p>
      
      <button 
        onClick={writeDirectlyToGameResults}
        disabled={isLoading}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg mb-4 disabled:opacity-50 mr-2"
      >
        {isLoading ? 'Ejecutando...' : 'Escribir Documentos de Prueba'}
      </button>
      
      <button 
        onClick={generateCompleteGameResult}
        disabled={isLoading}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg mb-4 disabled:opacity-50"
      >
        {isLoading ? 'Generando...' : 'Generar Resultado de Juego de Prueba'}
      </button>
      
      {status && (
        <div className="bg-gray-100 p-4 rounded-lg mt-4">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {status}
          </pre>
        </div>
      )}
    </div>
  );
}; 