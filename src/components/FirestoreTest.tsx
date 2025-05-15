import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, query, limit, orderBy } from 'firebase/firestore';

export const FirestoreTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Prueba 1: Verificar conexión
      setTestResults(prev => [...prev, "1. Probando conexión a Firestore..."]);
      
      // Prueba 2: Intentar escribir un documento de prueba
      setTestResults(prev => [...prev, "2. Intentando escribir un documento de prueba..."]);
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: "Test document"
      };
      
      try {
        const docRef = await addDoc(collection(db, "test_collection"), testData);
        setTestResults(prev => [...prev, `✅ Escritura exitosa! ID: ${docRef.id}`]);
      } catch (error: any) {
        setTestResults(prev => [...prev, `❌ Error de escritura: ${error.message}`]);
      }
      
      // Prueba 3: Intentar leer documentos
      setTestResults(prev => [...prev, "3. Intentando leer documentos de test_collection..."]);
      try {
        const querySnapshot = await getDocs(query(
          collection(db, "test_collection"),
          orderBy("timestamp", "desc"),
          limit(5)
        ));
        setTestResults(prev => [...prev, `✅ Lectura exitosa! Documentos encontrados: ${querySnapshot.docs.length}`]);
      } catch (error: any) {
        setTestResults(prev => [...prev, `❌ Error de lectura: ${error.message}`]);
      }
      
      // Prueba 4: Intentar leer documentos de game_results
      setTestResults(prev => [...prev, "4. Intentando leer documentos de game_results..."]);
      try {
        const querySnapshot = await getDocs(query(
          collection(db, "game_results"),
          limit(5)
        ));
        setTestResults(prev => [...prev, `✅ Lectura de game_results exitosa! Documentos encontrados: ${querySnapshot.docs.length}`]);
      } catch (error: any) {
        setTestResults(prev => [...prev, `❌ Error al leer game_results: ${error.message}`]);
      }
      
      // Prueba 5: Intentar escribir un documento de prueba en game_results
      setTestResults(prev => [...prev, "5. Intentando escribir un documento de prueba en game_results..."]);
      const gameResultTest = {
        timestamp: new Date().toISOString(),
        winningNumbers: ["🍎", "🍊", "🍋", "🍉"],
        firstPrize: [],
        secondPrize: [],
        thirdPrize: []
      };
      
      try {
        const docRef = await addDoc(collection(db, "game_results"), gameResultTest);
        setTestResults(prev => [...prev, `✅ Escritura en game_results exitosa! ID: ${docRef.id}`]);
      } catch (error: any) {
        setTestResults(prev => [...prev, `❌ Error al escribir en game_results: ${error.message}`]);
      }
      
      setTestResults(prev => [...prev, "Pruebas completadas!"]);
    } catch (error: any) {
      setTestResults(prev => [...prev, `Error general: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/90 p-6 rounded-xl shadow-lg max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Diagnostico de Firestore</h2>
      
      <button 
        onClick={runTests}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 disabled:opacity-50"
      >
        {isLoading ? 'Ejecutando pruebas...' : 'Ejecutar Pruebas'}
      </button>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Resultados:</h3>
        {testResults.length > 0 ? (
          <ul className="space-y-2">
            {testResults.map((result, index) => (
              <li key={index} className={`
                ${result.includes('✅') ? 'text-green-600' : ''} 
                ${result.includes('❌') ? 'text-red-600' : ''}
              `}>
                {result}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Haz clic en "Ejecutar Pruebas" para comenzar el diagnóstico</p>
        )}
      </div>
    </div>
  );
}; 