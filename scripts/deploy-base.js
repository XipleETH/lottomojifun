// Script para desplegar el contrato LottoMojiFun en la red Base
const { ethers } = require("hardhat");

async function main() {
  console.log("Iniciando despliegue del contrato LottoMojiFun en la red Base...");

  // Dirección del token USDC en Base Mainnet
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Dirección de la billetera de desarrollo (5% de las tarifas)
  const DEV_WALLET = "0x..."; // Reemplazar con la dirección de la billetera de desarrollo
  
  // Obtener el contrato
  const LottoMojiFun = await ethers.getContractFactory("LottoMojiFun");
  console.log("Compilación exitosa. Desplegando contrato...");
  
  // Desplegar el contrato
  const lottoContract = await LottoMojiFun.deploy(USDC_ADDRESS, DEV_WALLET);
  await lottoContract.deployed();
  
  console.log(`¡Contrato LottoMojiFun desplegado en la red Base!`);
  console.log(`Dirección del contrato: ${lottoContract.address}`);
  console.log(`Token USDC: ${USDC_ADDRESS}`);
  console.log(`Billetera de desarrollo: ${DEV_WALLET}`);
  console.log(`\nPara verificar el contrato en Basescan:`);
  console.log(`npx hardhat verify --network base ${lottoContract.address} ${USDC_ADDRESS} ${DEV_WALLET}`);
}

// Ejecutar el despliegue
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error en el despliegue:", error);
    process.exit(1);
  }); 