// @ts-check
const { ethers, network } = require("hardhat");
const { run } = require("hardhat");

async function main() {
  try {
    console.log("Iniciando despliegue del contrato LottoMojiFun...\nRed: " + network.name);

    // Obtener la dirección de desarrollo para recibir las comisiones
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Desplegando contratos con la cuenta:", deployerAddress);

    // Dirección de USDC según la red
    let usdcAddress;
    if (network.name === "base_sepolia") {
      // Dirección de USDC en Base Sepolia (esto es un ejemplo, verifica la dirección correcta)
      usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
      console.log("Red de pruebas detectada. Usando USDC en Base Sepolia:", usdcAddress);
    } else {
      // Dirección de USDC en Base Mainnet
      usdcAddress = "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA";
      console.log("Red principal detectada. Usando USDC en Base Mainnet:", usdcAddress);
    }

    // Desplegar el contrato LottoMojiFun
    const LottoMojiFun = await ethers.getContractFactory("LottoMojiFun");
    const lottoMojiFun = await LottoMojiFun.deploy(usdcAddress, deployerAddress);
    await lottoMojiFun.waitForDeployment();

    const contractAddress = await lottoMojiFun.getAddress();
    console.log("Contrato LottoMojiFun desplegado en:", contractAddress);

    // Verificar el contrato (opcional, requiere API KEY de Etherscan/Basescan)
    if (process.env.BASE_API_KEY) {
      console.log("Esperando 5 confirmaciones para verificar...");
      await lottoMojiFun.deploymentTransaction().wait(5);
      console.log("Inicio de verificación del contrato...");
      
      try {
        await run("verify:verify", {
          address: contractAddress,
          constructorArguments: [usdcAddress, deployerAddress],
        });
        console.log("Contrato verificado exitosamente");
      } catch (error) {
        console.error("Error verificando contrato:", error);
      }
    }

    console.log("Despliegue completado con éxito");
    console.log("----------------------------------------------------");
    console.log("IMPORTANTE: Actualice la dirección del contrato en:");
    console.log("src/contracts/LottoMojiFun.ts");
    console.log(`CONTRACT_ADDRESSES.LOTTO_MOJI_FUN: '${contractAddress}'`);
    console.log("----------------------------------------------------");
  } catch (error) {
    console.error("Error durante el despliegue:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 