import { createPublicClient, createWalletClient, http, parseAbi, type Address, formatUnits } from 'viem';
import { base } from 'viem/chains';

// ABI simplificado del contrato LottoMojiFun
export const lottoMojiFunAbi = parseAbi([
  // Funciones de lectura
  'function getTicketDetails(uint256 ticketId) external view returns (tuple(uint256 id, address owner, string[] emojis, uint256 drawId, bool claimed, uint256 timestamp, uint256 fid))',
  'function getDrawDetails(uint256 drawId) external view returns (tuple(uint256 id, string[] winningEmojis, uint256 prizePool, uint256 timestamp, bool completed, uint256 firstPrizeWinners, uint256 secondPrizeWinners, uint256 thirdPrizeWinners, uint256 fourthPrizeWinners))',
  'function getUserTickets(address user) external view returns (uint256[] memory)',
  'function getUserDrawTickets(uint256 drawId, address user) external view returns (uint256[] memory)',
  'function checkTicketPrizeCategory(uint256 ticketId) public view returns (uint256 prizeCategory)',
  'function currentDrawId() external view returns (uint256)',
  'function nextTicketId() external view returns (uint256)',
  'function totalTicketsSold() external view returns (uint256)',
  'function accumulatedDevFees() external view returns (uint256)',
  'function reservePool() external view returns (uint256)',
  'function getReservePoolBalance() external view returns (uint256)',
  'function getWinnersCount(uint256 drawId) external view returns (uint256 firstWinners, uint256 secondWinners, uint256 thirdWinners, uint256 fourthWinners)',
  'function draws(uint256) public view returns (uint256 id, string[] winningEmojis, uint256 prizePool, uint256 timestamp, bool completed, uint256 firstPrizeWinners, uint256 secondPrizeWinners, uint256 thirdPrizeWinners, uint256 fourthPrizeWinners)',
  'function tickets(uint256) public view returns (uint256 id, address owner, string[] emojis, uint256 drawId, bool claimed, uint256 timestamp, uint256 fid)',
  'function TICKET_PRICE() external view returns (uint256)',
  'function DEV_FEE_PERCENT() external view returns (uint256)',
  'function RESERVE_POOL_PERCENT() external view returns (uint256)',
  'function FIRST_PRIZE_PERCENT() external view returns (uint256)',
  'function SECOND_PRIZE_PERCENT() external view returns (uint256)',
  'function THIRD_PRIZE_PERCENT() external view returns (uint256)',
  
  // Funciones de escritura
  'function buyTicket(string[] memory emojis, uint256 fid) external',
  'function claimPrize(uint256 ticketId) external',
  
  // Funciones de administrador
  'function completeDraw(string[] memory winningEmojis, bytes32 randomSeed) external',
  'function withdrawDevFees() external',
  'function setDevWallet(address _newDevWallet) external',
  
  // Eventos
  'event TicketPurchased(uint256 indexed ticketId, address indexed buyer, uint256 fid, string[] emojis, uint256 drawId)',
  'event DrawCompleted(uint256 indexed drawId, string[] winningEmojis, uint256 prizePool, uint256 timestamp)',
  'event PrizeClaimed(uint256 indexed ticketId, address indexed winner, uint256 amount, uint256 prizeCategory)',
  'event DevFeesWithdrawn(uint256 amount)',
  'event ReservePoolUpdated(uint256 amount)'
]);

// ABI simplificado para USDC
export const usdcAbi = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)'
]);

// Direcciones de contratos en Base
export const CONTRACT_ADDRESSES = {
  LOTTO_MOJI_FUN: '0xA92937B6De354298C0aAb704C073203ABd83Ef7c' as Address, // Mainnet
  // LOTTO_MOJI_FUN: '0x0889850Ca65443b6693443bc9eaaaC2b561ab4a3' as Address, // Testnet (Sepolia)
  USDC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as Address, // USDC en Base Mainnet
  // USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // USDC en Base Sepolia
};

// Tipos para los resultados del contrato
export interface TicketStruct {
  id: bigint;
  owner: Address;
  emojis: string[];
  drawId: bigint;
  claimed: boolean;
  timestamp: bigint;
  fid: bigint;
}

export interface DrawResultStruct {
  id: bigint;
  winningEmojis: string[];
  prizePool: bigint;
  timestamp: bigint;
  completed: boolean;
  firstPrizeWinners: bigint;
  secondPrizeWinners: bigint;
  thirdPrizeWinners: bigint;
  fourthPrizeWinners: bigint;
}

// Enumeración para categorías de premios
export enum PrizeCategory {
  None = 0,
  FirstPrize = 1,  // 4 emojis exactos en misma posición - 70%
  SecondPrize = 2, // 4 emojis en cualquier posición - 10%
  ThirdPrize = 3,  // 3 emojis exactos en misma posición - 5%
  FourthPrize = 4  // 3 emojis en cualquier posición - ticket gratis
}

// Clase para interactuar con el contrato
export class LottoMojiFun {
  public publicClient;
  private walletClient: any;
  public contractAddress: Address;
  private usdcAddress: Address;
  public lottoMojiFunAbi = lottoMojiFunAbi;
  
  constructor(contractAddress: Address = CONTRACT_ADDRESSES.LOTTO_MOJI_FUN, usdcAddress: Address = CONTRACT_ADDRESSES.USDC) {
    this.contractAddress = contractAddress;
    this.usdcAddress = usdcAddress;
    
    // Cliente público para lectura - usando múltiples RPC para mayor confiabilidad
    try {
      console.log('Inicializando cliente público para Base con dirección de contrato:', contractAddress);
      this.publicClient = createPublicClient({
        chain: base,
        transport: http('https://base.publicnode.com'),
        batch: {
          multicall: true,
        },
      });
    } catch (error) {
      console.error('Error al crear el cliente público:', error);
      // Fallback a RPC alternativo
      console.log('Intentando con RPC alternativo...');
      this.publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
      });
    }
  }
  
  // Configurar cliente de billetera
  public setWalletClient(client: any) {
    this.walletClient = client;
  }
  
  // ===== Funciones de lectura =====
  
  /**
   * Obtiene los detalles de un ticket
   */
  public async getTicketDetails(ticketId: bigint): Promise<TicketStruct> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'getTicketDetails',
      args: [ticketId]
    }) as Promise<TicketStruct>;
  }
  
  /**
   * Obtiene los detalles de un sorteo
   */
  public async getDrawDetails(drawId: bigint): Promise<DrawResultStruct> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'getDrawDetails',
      args: [drawId]
    }) as Promise<DrawResultStruct>;
  }
  
  /**
   * Obtiene los tickets de un usuario
   */
  public async getUserTickets(userAddress: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'getUserTickets',
      args: [userAddress]
    }) as Promise<bigint[]>;
  }
  
  /**
   * Obtiene los tickets de un usuario para un sorteo específico
   */
  public async getUserDrawTickets(drawId: bigint, userAddress: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'getUserDrawTickets',
      args: [drawId, userAddress]
    }) as Promise<bigint[]>;
  }
  
  /**
   * Comprueba la categoría de premio de un ticket
   */
  public async checkTicketPrizeCategory(ticketId: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'checkTicketPrizeCategory',
      args: [ticketId]
    }) as Promise<bigint>;
  }
  
  /**
   * Obtiene la cantidad de ganadores por categoría para un sorteo
   */
  public async getWinnersCount(drawId: bigint): Promise<{
    firstWinners: bigint;
    secondWinners: bigint;
    thirdWinners: bigint;
    fourthWinners: bigint;
  }> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'getWinnersCount',
      args: [drawId]
    }) as [bigint, bigint, bigint, bigint];
    
    return {
      firstWinners: result[0],
      secondWinners: result[1],
      thirdWinners: result[2],
      fourthWinners: result[3]
    };
  }
  
  /**
   * Obtiene el ID del sorteo actual
   */
  public async getCurrentDrawId(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'currentDrawId'
    }) as Promise<bigint>;
  }
  
  /**
   * Obtiene el saldo de la pool de reserva
   */
  public async getReservePoolBalance(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'getReservePoolBalance'
    }) as Promise<bigint>;
  }
  
  /**
   * Obtiene las constantes de porcentajes
   */
  public async getConstants(): Promise<{
    ticketPrice: bigint;
    devFeePercent: bigint;
    reservePoolPercent: bigint;
    firstPrizePercent: bigint;
    secondPrizePercent: bigint;
    thirdPrizePercent: bigint;
  }> {
    const [ticketPrice, devFeePercent, reservePoolPercent, firstPrizePercent, secondPrizePercent, thirdPrizePercent] = await Promise.all([
      this.publicClient.readContract({ address: this.contractAddress, abi: lottoMojiFunAbi, functionName: 'TICKET_PRICE' }),
      this.publicClient.readContract({ address: this.contractAddress, abi: lottoMojiFunAbi, functionName: 'DEV_FEE_PERCENT' }),
      this.publicClient.readContract({ address: this.contractAddress, abi: lottoMojiFunAbi, functionName: 'RESERVE_POOL_PERCENT' }),
      this.publicClient.readContract({ address: this.contractAddress, abi: lottoMojiFunAbi, functionName: 'FIRST_PRIZE_PERCENT' }),
      this.publicClient.readContract({ address: this.contractAddress, abi: lottoMojiFunAbi, functionName: 'SECOND_PRIZE_PERCENT' }),
      this.publicClient.readContract({ address: this.contractAddress, abi: lottoMojiFunAbi, functionName: 'THIRD_PRIZE_PERCENT' })
    ]) as [bigint, bigint, bigint, bigint, bigint, bigint];
    
    return {
      ticketPrice,
      devFeePercent,
      reservePoolPercent,
      firstPrizePercent,
      secondPrizePercent,
      thirdPrizePercent
    };
  }
  
  /**
   * Obtiene el precio de un ticket
   */
  public async getTicketPrice(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'TICKET_PRICE'
    }) as Promise<bigint>;
  }
  
  /**
   * Obtiene el balance de USDC de un usuario
   */
  public async getUsdcBalance(userAddress: Address): Promise<string> {
    const balance = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: usdcAbi,
      functionName: 'balanceOf',
      args: [userAddress]
    }) as bigint;
    
    const decimals = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: usdcAbi,
      functionName: 'decimals'
    }) as number;
    
    return formatUnits(balance, decimals);
  }
  
  // ===== Funciones de escritura =====
  
  /**
   * Aprueba al contrato para gastar USDC del usuario
   */
  public async approveUsdcSpending(userAddress: Address, amount: bigint): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }
    
    const hash = await this.walletClient.writeContract({
      address: this.usdcAddress,
      abi: usdcAbi,
      functionName: 'approve',
      args: [this.contractAddress, amount],
      account: userAddress
    });
    
    return hash;
  }
  
  /**
   * Compra un ticket para la lotería
   */
  public async buyTicket(userAddress: Address, emojis: string[], fid: bigint): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }
    
    // Verificar la asignación de USDC primero
    const ticketPrice = await this.getTicketPrice();
    const allowance = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: usdcAbi,
      functionName: 'allowance',
      args: [userAddress, this.contractAddress]
    }) as bigint;
    
    if (allowance < ticketPrice) {
      throw new Error('Insufficient USDC allowance. Please approve the contract to spend USDC.');
    }
    
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'buyTicket',
      args: [emojis, fid],
      account: userAddress
    });
    
    return hash;
  }
  
  /**
   * Reclama un premio
   */
  public async claimPrize(userAddress: Address, ticketId: bigint): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }
    
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: lottoMojiFunAbi,
      functionName: 'claimPrize',
      args: [ticketId],
      account: userAddress
    });
    
    return hash;
  }
  
  // ===== Funciones de evento =====
  
  /**
   * Obtiene los eventos de tickets comprados
   */
  public async getTicketPurchasedEvents(fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const logs = await this.publicClient.getLogs({
      address: this.contractAddress,
      event: {
        type: 'event',
        name: 'TicketPurchased',
        inputs: [
          { type: 'uint256', name: 'ticketId', indexed: true },
          { type: 'address', name: 'buyer', indexed: true },
          { type: 'uint256', name: 'fid', indexed: false },
          { type: 'string[]', name: 'emojis', indexed: false },
          { type: 'uint256', name: 'drawId', indexed: false }
        ]
      },
      fromBlock,
      toBlock
    });
    
    return logs;
  }
  
  /**
   * Obtiene los eventos de sorteos completados
   */
  public async getDrawCompletedEvents(fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const logs = await this.publicClient.getLogs({
      address: this.contractAddress,
      event: {
        type: 'event',
        name: 'DrawCompleted',
        inputs: [
          { type: 'uint256', name: 'drawId', indexed: true },
          { type: 'string[]', name: 'winningEmojis', indexed: false },
          { type: 'uint256', name: 'prizePool', indexed: false },
          { type: 'uint256', name: 'timestamp', indexed: false }
        ]
      },
      fromBlock,
      toBlock
    });
    
    return logs;
  }
  
  /**
   * Obtiene los eventos de premios reclamados
   */
  public async getPrizeClaimedEvents(fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const logs = await this.publicClient.getLogs({
      address: this.contractAddress,
      event: {
        type: 'event',
        name: 'PrizeClaimed',
        inputs: [
          { type: 'uint256', name: 'ticketId', indexed: true },
          { type: 'address', name: 'winner', indexed: true },
          { type: 'uint256', name: 'amount', indexed: false },
          { type: 'uint256', name: 'prizeCategory', indexed: false }
        ]
      },
      fromBlock,
      toBlock
    });
    
    return logs;
  }
  
  /**
   * Obtiene los eventos de actualización de la pool de reserva
   */
  public async getReservePoolUpdatedEvents(fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const logs = await this.publicClient.getLogs({
      address: this.contractAddress,
      event: {
        type: 'event',
        name: 'ReservePoolUpdated',
        inputs: [
          { type: 'uint256', name: 'amount', indexed: false }
        ]
      },
      fromBlock,
      toBlock
    });
    
    return logs;
  }
} 