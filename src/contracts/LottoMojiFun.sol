// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title LottoMojiFun
 * @dev Contrato para la lotería de emojis en la red Base, integrado con Farcaster
 */
contract LottoMojiFun is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // === CONSTANTES ===
    uint256 public constant TICKET_PRICE = 1 * 10**6; // 1 USDC (6 decimales)
    uint256 public constant DEV_FEE_PERCENT = 5; // 5% para desarrollo
    uint256 public constant RESERVE_POOL_PERCENT = 10; // 10% para pool de reserva
    uint256 public constant FIRST_PRIZE_PERCENT = 70; // 70% para primer premio
    uint256 public constant SECOND_PRIZE_PERCENT = 10; // 10% para segundo premio
    uint256 public constant THIRD_PRIZE_PERCENT = 5; // 5% para tercer premio
    uint256 public constant MAX_EMOJIS_PER_TICKET = 4;
    
    // === ESTRUCTURAS DE DATOS ===
    struct Ticket {
        uint256 id;
        address owner;
        string[] emojis;
        uint256 drawId;
        bool claimed;
        uint256 timestamp;
        uint256 fid; // Farcaster ID
    }
    
    struct DrawResult {
        uint256 id;
        string[] winningEmojis;
        uint256 prizePool;
        uint256 timestamp;
        bool completed;
        uint256 firstPrizeWinners;
        uint256 secondPrizeWinners;
        uint256 thirdPrizeWinners;
        uint256 fourthPrizeWinners;
    }
    
    // === VARIABLES DE ESTADO ===
    IERC20 public usdcToken;
    address public devWallet;
    uint256 public currentDrawId;
    uint256 public nextTicketId;
    uint256 public totalTicketsSold;
    uint256 public accumulatedDevFees;
    uint256 public reservePool;
    
    // Mapeos
    mapping(uint256 => DrawResult) public draws;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => uint256[]) public drawTickets;
    mapping(address => uint256[]) public userTickets;
    mapping(uint256 => mapping(address => uint256[])) public userDrawTickets;
    mapping(uint256 => uint256) public prizePoolForDraw;
    
    // Mapeos para rastrear ganadores
    mapping(uint256 => address[]) public firstPrizeWinners;
    mapping(uint256 => address[]) public secondPrizeWinners;
    mapping(uint256 => address[]) public thirdPrizeWinners;
    mapping(uint256 => address[]) public fourthPrizeWinners;
    mapping(uint256 => mapping(address => bool)) public hasClaimedPrize;
    
    // === EVENTOS ===
    event TicketPurchased(uint256 indexed ticketId, address indexed buyer, uint256 fid, string[] emojis, uint256 drawId);
    event DrawCompleted(uint256 indexed drawId, string[] winningEmojis, uint256 prizePool, uint256 timestamp);
    event PrizeClaimed(uint256 indexed ticketId, address indexed winner, uint256 amount, uint256 prizeCategory);
    event DevFeesWithdrawn(uint256 amount);
    event ReservePoolUpdated(uint256 amount);
    
    // === CONSTRUCTOR ===
    constructor(address _usdcToken, address _devWallet) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        devWallet = _devWallet;
        currentDrawId = 1;
        nextTicketId = 1;
        reservePool = 0;
    }
    
    // === FUNCIONES PRINCIPALES ===
    
    /**
     * @dev Compra un ticket para la lotería actual
     * @param emojis Array de emojis seleccionados para el ticket
     * @param fid ID de Farcaster del comprador
     */
    function buyTicket(string[] memory emojis, uint256 fid) external nonReentrant {
        require(emojis.length == MAX_EMOJIS_PER_TICKET, "Debe seleccionar exactamente 4 emojis");
        require(fid > 0, "FID invalido");
        
        // Transferir USDC al contrato
        bool success = usdcToken.transferFrom(msg.sender, address(this), TICKET_PRICE);
        require(success, "Fallo la transferencia de USDC");
        
        // Crear el ticket
        uint256 ticketId = nextTicketId++;
        tickets[ticketId] = Ticket({
            id: ticketId,
            owner: msg.sender,
            emojis: emojis,
            drawId: currentDrawId,
            claimed: false,
            timestamp: block.timestamp,
            fid: fid
        });
        
        // Actualizar mapeos
        drawTickets[currentDrawId].push(ticketId);
        userTickets[msg.sender].push(ticketId);
        userDrawTickets[currentDrawId][msg.sender].push(ticketId);
        
        // Actualizar fondos del sorteo
        uint256 devFee = (TICKET_PRICE * DEV_FEE_PERCENT) / 100;
        uint256 reserveFee = (TICKET_PRICE * RESERVE_POOL_PERCENT) / 100;
        uint256 prizeAmount = TICKET_PRICE - devFee - reserveFee;
        
        prizePoolForDraw[currentDrawId] += prizeAmount;
        accumulatedDevFees += devFee;
        reservePool += reserveFee;
        totalTicketsSold++;
        
        emit TicketPurchased(ticketId, msg.sender, fid, emojis, currentDrawId);
    }
    
    /**
     * @dev Función interna para verificar coincidencias con posición exacta
     */
    function _checkExactPositionMatches(string[] memory ticketEmojis, string[] memory winningEmojis) internal pure returns (uint256 matchCount) {
        require(ticketEmojis.length == winningEmojis.length, "Arrays deben tener la misma longitud");
        
        for (uint256 i = 0; i < ticketEmojis.length; i++) {
            if (keccak256(bytes(ticketEmojis[i])) == keccak256(bytes(winningEmojis[i]))) {
                matchCount++;
            }
        }
        return matchCount;
    }

    /**
     * @dev Función interna para verificar coincidencias sin importar posición
     */
    function _checkAnyPositionMatches(string[] memory ticketEmojis, string[] memory winningEmojis) internal pure returns (uint256 matchCount) {
        // Crear copia de los arrays para marcar emojis ya contados
        bool[] memory ticketCounted = new bool[](ticketEmojis.length);
        bool[] memory winningCounted = new bool[](winningEmojis.length);
        
        for (uint256 i = 0; i < ticketEmojis.length; i++) {
            if (ticketCounted[i]) continue;
            
            for (uint256 j = 0; j < winningEmojis.length; j++) {
                if (winningCounted[j]) continue;
                
                if (keccak256(bytes(ticketEmojis[i])) == keccak256(bytes(winningEmojis[j]))) {
                    matchCount++;
                    ticketCounted[i] = true;
                    winningCounted[j] = true;
                    break;
                }
            }
        }
        return matchCount;
    }
    
    /**
     * @dev Finaliza el sorteo actual y comienza uno nuevo
     * @param winningEmojis Emojis ganadores seleccionados
     * @param randomSeed Semilla para verificación (opcional)
     */
    function completeDraw(string[] memory winningEmojis, bytes32 randomSeed) external onlyOwner {
        require(winningEmojis.length == MAX_EMOJIS_PER_TICKET, "Debe haber exactamente 4 emojis ganadores");
        
        uint256 drawId = currentDrawId;
        uint256 prizePool = prizePoolForDraw[drawId];
        
        // Identificar ganadores para este sorteo
        uint256 firstWinners = 0;
        uint256 secondWinners = 0;
        uint256 thirdWinners = 0;
        uint256 fourthWinners = 0;
        
        uint256[] memory ticketsInDraw = drawTickets[drawId];
        for(uint256 i = 0; i < ticketsInDraw.length; i++) {
            uint256 ticketId = ticketsInDraw[i];
            Ticket storage ticket = tickets[ticketId];
            
            // Verificar coincidencias exactas (misma posición)
            uint256 exactMatches = _checkExactPositionMatches(ticket.emojis, winningEmojis);
            
            // Verificar coincidencias en cualquier posición
            uint256 anyMatches = _checkAnyPositionMatches(ticket.emojis, winningEmojis);
            
            if (exactMatches == 4) {
                // Primer premio: 4 emojis exactos en misma posición
                firstPrizeWinners[drawId].push(ticket.owner);
                firstWinners++;
            } else if (anyMatches == 4) {
                // Segundo premio: 4 emojis iguales en cualquier posición
                secondPrizeWinners[drawId].push(ticket.owner);
                secondWinners++;
            } else if (exactMatches == 3) {
                // Tercer premio: 3 emojis exactos en misma posición
                thirdPrizeWinners[drawId].push(ticket.owner);
                thirdWinners++;
            } else if (anyMatches == 3) {
                // Premio de consolación: 3 emojis iguales en cualquier posición
                fourthPrizeWinners[drawId].push(ticket.owner);
                fourthWinners++;
            }
        }
        
        // Registrar resultados
        draws[drawId] = DrawResult({
            id: drawId,
            winningEmojis: winningEmojis,
            prizePool: prizePool,
            timestamp: block.timestamp,
            completed: true,
            firstPrizeWinners: firstWinners,
            secondPrizeWinners: secondWinners,
            thirdPrizeWinners: thirdWinners,
            fourthPrizeWinners: fourthWinners
        });
        
        // Iniciar nuevo sorteo y añadir la reserva al nuevo pozo si hubo ganador del primer premio
        currentDrawId++;
        if(firstWinners > 0 && reservePool > 0) {
            prizePoolForDraw[currentDrawId] = reservePool;
            emit ReservePoolUpdated(0);
            reservePool = 0;
        }
        
        emit DrawCompleted(drawId, winningEmojis, prizePool, block.timestamp);
    }
    
    /**
     * @dev Comprueba si un ticket es ganador y en qué categoría
     * @param ticketId ID del ticket a comprobar
     * @return prizeCategory Categoría del premio (1-4, 0 si no es ganador)
     */
    function checkTicketPrizeCategory(uint256 ticketId) public view returns (uint256 prizeCategory) {
        Ticket storage ticket = tickets[ticketId];
        require(ticket.id > 0, "Ticket no existe");
        require(draws[ticket.drawId].completed, "Sorteo aun no completado");
        
        string[] memory winningEmojis = draws[ticket.drawId].winningEmojis;
        
        // Verificar coincidencias exactas (misma posición)
        uint256 exactMatches = _checkExactPositionMatches(ticket.emojis, winningEmojis);
        
        // Verificar coincidencias en cualquier posición
        uint256 anyMatches = _checkAnyPositionMatches(ticket.emojis, winningEmojis);
        
        // Determinar categoría del premio
        if (exactMatches == 4) {
            // Primer premio: 4 emojis exactos en misma posición
            return 1;
        } else if (anyMatches == 4) {
            // Segundo premio: 4 emojis iguales en cualquier posición
            return 2;
        } else if (exactMatches == 3) {
            // Tercer premio: 3 emojis exactos en misma posición
            return 3;
        } else if (anyMatches == 3) {
            // Premio de consolación: 3 emojis iguales en cualquier posición
            return 4;
        }
        
        return 0; // No es ganador
    }
    
    /**
     * @dev Permite a un usuario reclamar su premio
     * @param ticketId ID del ticket ganador
     */
    function claimPrize(uint256 ticketId) external nonReentrant {
        Ticket storage ticket = tickets[ticketId];
        require(ticket.owner == msg.sender, "No eres el dueno del ticket");
        require(!ticket.claimed, "Premio ya reclamado");
        require(draws[ticket.drawId].completed, "Sorteo aun no completado");
        require(!hasClaimedPrize[ticket.drawId][msg.sender], "Ya reclamaste un premio para este sorteo");
        
        uint256 prizeCategory = checkTicketPrizeCategory(ticketId);
        require(prizeCategory > 0, "Ticket no ganador");
        
        uint256 prizeAmount = 0;
        uint256 prizePool = draws[ticket.drawId].prizePool;
        DrawResult storage draw = draws[ticket.drawId];
        
        // Calcular premio según categoría y dividir entre ganadores
        if (prizeCategory == 1 && draw.firstPrizeWinners > 0) {
            // Primer premio: 4 emojis exactos - 70% del pozo
            prizeAmount = (prizePool * FIRST_PRIZE_PERCENT) / 100 / draw.firstPrizeWinners;
        } else if (prizeCategory == 2 && draw.secondPrizeWinners > 0) {
            // Segundo premio: 4 emojis en cualquier posición - 10% del pozo
            prizeAmount = (prizePool * SECOND_PRIZE_PERCENT) / 100 / draw.secondPrizeWinners;
        } else if (prizeCategory == 3 && draw.thirdPrizeWinners > 0) {
            // Tercer premio: 3 emojis exactos - 5% del pozo
            prizeAmount = (prizePool * THIRD_PRIZE_PERCENT) / 100 / draw.thirdPrizeWinners;
        } else if (prizeCategory == 4) {
            // Premio de consolación: 3 emojis en cualquier posición - ticket gratis
            prizeAmount = TICKET_PRICE;
        }
        
        // Marcar como reclamado
        ticket.claimed = true;
        hasClaimedPrize[ticket.drawId][msg.sender] = true;
        
        // Transferir premio
        require(usdcToken.transfer(msg.sender, prizeAmount), "Fallo la transferencia del premio");
        
        emit PrizeClaimed(ticketId, msg.sender, prizeAmount, prizeCategory);
    }
    
    /**
     * @dev Permite al propietario retirar las comisiones acumuladas
     */
    function withdrawDevFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedDevFees;
        require(amount > 0, "No hay comisiones para retirar");
        
        accumulatedDevFees = 0;
        require(usdcToken.transfer(devWallet, amount), "Fallo la transferencia de comisiones");
        
        emit DevFeesWithdrawn(amount);
    }
    
    /**
     * @dev Cambia la dirección de la billetera de desarrollo
     * @param _newDevWallet Nueva dirección de la billetera de desarrollo
     */
    function setDevWallet(address _newDevWallet) external onlyOwner {
        require(_newDevWallet != address(0), "Direccion invalida");
        devWallet = _newDevWallet;
    }
    
    /**
     * @dev Obtiene el balance actual de la pool de reserva
     */
    function getReservePoolBalance() external view returns (uint256) {
        return reservePool;
    }
    
    /**
     * @dev Obtiene todos los tickets de un usuario
     * @param user Dirección del usuario
     * @return Array de IDs de tickets
     */
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    /**
     * @dev Obtiene los tickets de un usuario para un sorteo específico
     * @param drawId ID del sorteo
     * @param user Dirección del usuario
     * @return Array de IDs de tickets
     */
    function getUserDrawTickets(uint256 drawId, address user) external view returns (uint256[] memory) {
        return userDrawTickets[drawId][user];
    }
    
    /**
     * @dev Obtiene los detalles de un ticket
     * @param ticketId ID del ticket
     * @return Estructura completa del ticket
     */
    function getTicketDetails(uint256 ticketId) external view returns (Ticket memory) {
        return tickets[ticketId];
    }
    
    /**
     * @dev Obtiene los detalles de un sorteo
     * @param drawId ID del sorteo
     * @return Estructura completa del sorteo
     */
    function getDrawDetails(uint256 drawId) external view returns (DrawResult memory) {
        return draws[drawId];
    }
    
    /**
     * @dev Obtiene la cantidad de ganadores de cada categoría para un sorteo
     * @param drawId ID del sorteo
     * @return firstWinners Cantidad de ganadores del primer premio
     * @return secondWinners Cantidad de ganadores del segundo premio
     * @return thirdWinners Cantidad de ganadores del tercer premio
     * @return fourthWinners Cantidad de ganadores del premio de consolación
     */
    function getWinnersCount(uint256 drawId) external view returns (
        uint256 firstWinners, 
        uint256 secondWinners, 
        uint256 thirdWinners,
        uint256 fourthWinners
    ) {
        DrawResult storage draw = draws[drawId];
        return (
            draw.firstPrizeWinners, 
            draw.secondPrizeWinners, 
            draw.thirdPrizeWinners,
            draw.fourthPrizeWinners
        );
    }
} 