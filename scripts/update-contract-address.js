/**
 * Script para actualizar la dirección del contrato en el archivo LottoMojiFun.ts
 * Ejecutar con: node scripts/update-contract-address.js [dirección]
 */

const fs = require('fs');
const path = require('path');

// Obtener la dirección del contrato desde los argumentos de la línea de comandos
const contractAddress = process.argv[2];
if (!contractAddress) {
  console.error('Error: No se proporcionó dirección de contrato.');
  console.log('Uso: node scripts/update-contract-address.js [dirección]');
  process.exit(1);
}

// Verificar formato de la dirección
if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
  console.error('Error: La dirección proporcionada no parece tener el formato correcto.');
  console.log('Debe comenzar con "0x" y tener 42 caracteres en total.');
  process.exit(1);
}

// Ruta al archivo LottoMojiFun.ts
const filePath = path.resolve(__dirname, '../src/contracts/LottoMojiFun.ts');

try {
  // Leer el contenido actual del archivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Buscar y reemplazar la dirección del contrato
  content = content.replace(
    /LOTTO_MOJI_FUN: '0x[0-9a-fA-F]{0,40}' as Address/,
    `LOTTO_MOJI_FUN: '${contractAddress}' as Address`
  );
  
  // Escribir el contenido actualizado al archivo
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Dirección del contrato actualizada con éxito en:');
  console.log(filePath);
  console.log(`Nueva dirección: ${contractAddress}`);
} catch (error) {
  console.error('Error al actualizar la dirección del contrato:', error.message);
  process.exit(1);
} 