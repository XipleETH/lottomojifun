/**
 * Script para inicializar/recuperar la estructura de la base de datos Firebase
 * Ejecución: node recoverDb.js
 */

const { execSync } = require('child_process');

// Asegurarse de que ts-node esté instalado
try {
  // Primero intentamos ejecutar el script con ts-node directamente
  console.log('Intentando recuperar la base de datos de Firebase...');
  execSync('npx ts-node --skipProject src/scripts/recoverFirebase.ts', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('Error al ejecutar el script de recuperación:', error);
  console.log('Puede que necesites instalar ts-node primero:');
  console.log('npm install -g ts-node typescript');
  console.log('\nIntentando con ts-node local...');
  try {
    execSync('npx ts-node --skipProject src/scripts/recoverFirebase.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (e) {
    console.error('No se pudo ejecutar el script de recuperación:', e.message);
  }
} 