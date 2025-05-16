// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LottoMojiFun
 * @dev Contrato de lotería para la red Base con sorteos cada 10 minutos
 * Permite a los usuarios comprar tickets por 1 USDC
 * Los premios se distribuyen a los ganadores con un 5% para una billetera de desarrollo
 */
contract LottoMojiFun is Ownable, ReentrancyGuard {
    // Referencia al token USDC en la red Base
    IERC20 public usdcToken;
    
    // Constantes
    uint256 public constant TICKET_PRICE = 1 * 10**6; // 1 USDC (6 decimales)
    uint256 public constant DEV_FEE_PERCENT = 5; // 5% para desarrollo
    uint256 public constant MAX_EMOJIS_PER_TICKET = 5; // Máximo 5 emojis por ticket
    uint256 public constant DRAW_INTERVAL = 10 minutes; // Intervalo de 10 minutos entre sorteos
    
    // Porcentajes de premios
    uint256 public constant FIRST_PRIZE_PERCENT = 50; // 50% para primer premio
    uint256 public constant SECOND_PRIZE_PERCENT = 25; // 25% para segundo premio
    uint256 public constant THIRD_PRIZE_PERCENT = 15; // 15% para tercer premio
    uint256 public constant RESERVE_POOL_PERCENT = 5; // 5% para el fondo de reserva
    
    // Variables de estado
    address public devWallet;
    uint256 public currentDrawId;
    uint256 public nextTicketId;
    uint256 public totalTicketsSold;
    uint256 public accumulatedDevFees;
    uint256 public reservePool;
    uint256 public lastDrawTime;
    uint256 public nextDrawTime;
    
    // Estructura para los tickets
    struct Ticket {
        uint256 id;
        address owner;
        string[] emojis;
        uint256 drawId;
        bool claimed;
        uint256 timestamp;
        uint256 fid; // Farcaster ID
    }
    
    // Estructura para los resultados del sorteo
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
    
    // Mapeos
    mapping(uint256 => DrawResult) private draws;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => uint256[]) public drawTickets;
    mapping(address => uint256[]) private userTickets;
    mapping(uint256 => mapping(address => uint256[])) private userDrawTickets;
    mapping(uint256 => uint256) public prizePoolForDraw;
    mapping(uint256 => address[]) private firstPrizeWinners;
    mapping(uint256 => address[]) public secondPrizeWinners;
    mapping(uint256 => address[]) public thirdPrizeWinners;
    mapping(uint256 => address[]) private fourthPrizeWinners;
    mapping(uint256 => mapping(address => bool)) public hasClaimedPrize;
    
    // Eventos
    event TicketPurchased(
        uint256 indexed ticketId,
        address indexed buyer,
        uint256 fid,
        string[] emojis,
        uint256 drawId
    );
    
    event DrawCompleted(
        uint256 indexed drawId,
        string[] winningEmojis,
        uint256 prizePool,
        uint256 timestamp
    );
    
    event PrizeClaimed(
        uint256 indexed ticketId,
        address indexed winner,
        uint256 amount,
        uint256 prizeCategory
    );
    
    event DevFeesWithdrawn(uint256 amount);
    
    // Constructor
    constructor(address _usdcToken, address _devWallet) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        devWallet = _devWallet;
        currentDrawId = 1;
        nextTicketId = 1;
        
        // Inicializar el tiempo del próximo sorteo
        lastDrawTime = block.timestamp;
        nextDrawTime = block.timestamp + DRAW_INTERVAL;
    }
    
    /**
     * @dev Compra un ticket para la lotería
     * @param emojis Array de emojis seleccionados por el usuario
     * @param fid ID de Farcaster del usuario
     */
    function buyTicket(string[] calldata emojis, uint256 fid) external nonReentrant {
        // Verificaciones
        require(emojis.length > 0 && emojis.length <= MAX_EMOJIS_PER_TICKET, "Numero invalido de emojis");
        
        // Transferir USDC al contrato
        require(usdcToken.transferFrom(msg.sender, address(this), TICKET_PRICE), "Fallo la transferencia de USDC");
        
        // Calcular distribución
        uint256 devFee = (TICKET_PRICE * DEV_FEE_PERCENT) / 100;
        uint256 prizeAmount = TICKET_PRICE - devFee;
        
        // Actualizar estado
        accumulatedDevFees += devFee;
        prizePoolForDraw[currentDrawId] += prizeAmount;
        
        // Crear ticket
        uint256 ticketId = nextTicketId;
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
        
        // Incrementar counters
        nextTicketId++;
        totalTicketsSold++;
        
        // Emitir evento
        emit TicketPurchased(ticketId, msg.sender, fid, emojis, currentDrawId);
    }
    
    /**
     * @dev Completa un sorteo
     * @param winningEmojis Array de emojis ganadores
     * @param randomSeed Semilla aleatoria para la selección de ganadores
     */
    function completeDraw(string[] memory winningEmojis, bytes32 randomSeed) external onlyOwner {
        require(winningEmojis.length > 0 && winningEmojis.length <= MAX_EMOJIS_PER_TICKET, "Numero invalido de emojis");
        require(block.timestamp >= nextDrawTime, "Aun no es tiempo para el sorteo");
        
        uint256 drawId = currentDrawId;
        uint256 prizePool = prizePoolForDraw[drawId];
        
        // Si no hay tickets vendidos, transferir todo al fondo de reserva
        if (drawTickets[drawId].length == 0) {
            reservePool += prizePool;
            prizePoolForDraw[drawId] = 0;
            
            // Preparar para el siguiente sorteo
            currentDrawId++;
            lastDrawTime = block.timestamp;
            nextDrawTime = block.timestamp + DRAW_INTERVAL;
            
            // Registrar el sorteo vacío
            draws[drawId] = DrawResult({
                id: drawId,
                winningEmojis: winningEmojis,
                prizePool: prizePool,
                timestamp: block.timestamp,
                completed: true,
                firstPrizeWinners: 0,
                secondPrizeWinners: 0,
                thirdPrizeWinners: 0,
                fourthPrizeWinners: 0
            });
            
            emit DrawCompleted(drawId, winningEmojis, prizePool, block.timestamp);
            return;
        }
        
        // Determinar ganadores
        (
            address[] memory first,
            address[] memory second,
            address[] memory third,
            address[] memory fourth
        ) = _determineWinners(drawId, winningEmojis, randomSeed);
        
        // Guardar ganadores
        firstPrizeWinners[drawId] = first;
        secondPrizeWinners[drawId] = second;
        thirdPrizeWinners[drawId] = third;
        fourthPrizeWinners[drawId] = fourth;
        
        // Registrar el sorteo
        draws[drawId] = DrawResult({
            id: drawId,
            winningEmojis: winningEmojis,
            prizePool: prizePool,
            timestamp: block.timestamp,
            completed: true,
            firstPrizeWinners: first.length,
            secondPrizeWinners: second.length,
            thirdPrizeWinners: third.length,
            fourthPrizeWinners: fourth.length
        });
        
        // Preparar para el siguiente sorteo
        currentDrawId++;
        lastDrawTime = block.timestamp;
        nextDrawTime = block.timestamp + DRAW_INTERVAL;
        
        // Emitir evento
        emit DrawCompleted(drawId, winningEmojis, prizePool, block.timestamp);
    }
    
    /**
     * @dev Determina los ganadores de un sorteo
     * @param drawId ID del sorteo
     * @param winningEmojis Emojis ganadores
     * @param randomSeed Semilla aleatoria
     */
    function _determineWinners(
        uint256 drawId,
        string[] memory winningEmojis,
        bytes32 randomSeed
    ) internal view returns (
        address[] memory firstPrize,
        address[] memory secondPrize,
        address[] memory thirdPrize,
        address[] memory fourthPrize
    ) {
        uint256 numTickets = drawTickets[drawId].length;
        address[] memory firstTemp = new address[](numTickets);
        address[] memory secondTemp = new address[](numTickets);
        address[] memory thirdTemp = new address[](numTickets);
        address[] memory fourthTemp = new address[](numTickets);
        
        uint256 firstCount = 0;
        uint256 secondCount = 0;
        uint256 thirdCount = 0;
        uint256 fourthCount = 0;
        
        // Evaluar cada ticket
        for (uint256 i = 0; i < numTickets; i++) {
            uint256 ticketId = drawTickets[drawId][i];
            Ticket storage ticket = tickets[ticketId];
            
            // Contar coincidencias
            uint256 matches = _countMatches(ticket.emojis, winningEmojis);
            
            // Clasificar según el número de coincidencias
            if (matches >= 4) {
                firstTemp[firstCount] = ticket.owner;
                firstCount++;
            } else if (matches == 3) {
                secondTemp[secondCount] = ticket.owner;
                secondCount++;
            } else if (matches == 2) {
                thirdTemp[thirdCount] = ticket.owner;
                thirdCount++;
            } else if (matches == 1) {
                fourthTemp[fourthCount] = ticket.owner;
                fourthCount++;
            }
        }
        
        // Redimensionar los arrays de resultados
        firstPrize = new address[](firstCount);
        secondPrize = new address[](secondCount);
        thirdPrize = new address[](thirdCount);
        fourthPrize = new address[](fourthCount);
        
        for (uint256 i = 0; i < firstCount; i++) {
            firstPrize[i] = firstTemp[i];
        }
        
        for (uint256 i = 0; i < secondCount; i++) {
            secondPrize[i] = secondTemp[i];
        }
        
        for (uint256 i = 0; i < thirdCount; i++) {
            thirdPrize[i] = thirdTemp[i];
        }
        
        for (uint256 i = 0; i < fourthCount; i++) {
            fourthPrize[i] = fourthTemp[i];
        }
        
        return (firstPrize, secondPrize, thirdPrize, fourthPrize);
    }
    
    /**
     * @dev Cuenta las coincidencias entre los emojis del ticket y los ganadores
     * @param ticketEmojis Emojis del ticket
     * @param winningEmojis Emojis ganadores
     */
    function _countMatches(
        string[] storage ticketEmojis,
        string[] memory winningEmojis
    ) internal view returns (uint256) {
        uint256 matches = 0;
        
        for (uint256 i = 0; i < ticketEmojis.length; i++) {
            for (uint256 j = 0; j < winningEmojis.length; j++) {
                // Comparar las cadenas
                if (_compareStrings(ticketEmojis[i], winningEmojis[j])) {
                    matches++;
                    break;
                }
            }
        }
        
        return matches;
    }
    
    /**
     * @dev Compara dos strings
     */
    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
    
    /**
     * @dev Verifica la categoría de premio de un ticket
     * @param ticketId ID del ticket
     */
    function checkTicketPrizeCategory(uint256 ticketId) public view returns (uint256 prizeCategory) {
        Ticket storage ticket = tickets[ticketId];
        require(ticket.id > 0, "Ticket no existe");
        
        uint256 drawId = ticket.drawId;
        require(drawId < currentDrawId, "Sorteo aun no completado");
        
        DrawResult storage draw = draws[drawId];
        require(draw.completed, "Sorteo no completado");
        
        // Contar coincidencias
        uint256 matches = _countMatches(ticket.emojis, draw.winningEmojis);
        
        if (matches >= 4) return 1; // Primer premio
        if (matches == 3) return 2; // Segundo premio
        if (matches == 2) return 3; // Tercer premio
        if (matches == 1) return 4; // Cuarto premio
        
        return 0; // Sin premio
    }
    
    /**
     * @dev Reclama el premio de un ticket
     * @param ticketId ID del ticket
     */
    function claimPrize(uint256 ticketId) external nonReentrant {
        Ticket storage ticket = tickets[ticketId];
        require(ticket.id > 0, "Ticket no existe");
        require(ticket.owner == msg.sender, "No eres el dueño");
        require(ticket.drawId < currentDrawId, "Sorteo aun no completado");
        require(!ticket.claimed, "Premio ya reclamado");
        require(!hasClaimedPrize[ticket.drawId][msg.sender], "Ya reclamaste un premio de este sorteo");
        
        uint256 drawId = ticket.drawId;
        DrawResult storage draw = draws[drawId];
        
        uint256 prizeCategory = checkTicketPrizeCategory(ticketId);
        require(prizeCategory > 0, "No ganaste ningun premio");
        
        // Marcar como reclamado
        ticket.claimed = true;
        hasClaimedPrize[drawId][msg.sender] = true;
        
        // Calcular premio según categoría
        uint256 prizeAmount = 0;
        
        if (prizeCategory == 1) {
            // Primer premio (50% dividido entre ganadores)
            uint256 firstPrizePool = (draw.prizePool * FIRST_PRIZE_PERCENT) / 100;
            prizeAmount = firstPrizePool / draws[drawId].firstPrizeWinners;
        } else if (prizeCategory == 2) {
            // Segundo premio (25% dividido entre ganadores)
            uint256 secondPrizePool = (draw.prizePool * SECOND_PRIZE_PERCENT) / 100;
            prizeAmount = secondPrizePool / draws[drawId].secondPrizeWinners;
        } else if (prizeCategory == 3) {
            // Tercer premio (15% dividido entre ganadores)
            uint256 thirdPrizePool = (draw.prizePool * THIRD_PRIZE_PERCENT) / 100;
            prizeAmount = thirdPrizePool / draws[drawId].thirdPrizeWinners;
        } else if (prizeCategory == 4) {
            // Para el cuarto premio, damos un ticket gratis (usando el fondo de reserva)
            if (reservePool >= TICKET_PRICE) {
                prizeAmount = TICKET_PRICE;
                reservePool -= TICKET_PRICE;
            }
        }
        
        // Transferir premio
        if (prizeAmount > 0) {
            require(usdcToken.transfer(msg.sender, prizeAmount), "Fallo la transferencia del premio");
            
            // Reducir el premio del pool (excepto para categoría 4 que usa reservePool)
            if (prizeCategory != 4) {
                prizePoolForDraw[drawId] -= prizeAmount;
            }
            
            // Emitir evento
            emit PrizeClaimed(ticketId, msg.sender, prizeAmount, prizeCategory);
        }
    }
    
    /**
     * @dev Retira las tarifas de desarrollo acumuladas
     */
    function withdrawDevFees() external onlyOwner {
        uint256 amount = accumulatedDevFees;
        require(amount > 0, "No hay tarifas para retirar");
        
        accumulatedDevFees = 0;
        require(usdcToken.transfer(devWallet, amount), "Fallo la transferencia");
        
        emit DevFeesWithdrawn(amount);
    }
    
    /**
     * @dev Cambia la dirección de la billetera de desarrollo
     * @param _newDevWallet Nueva dirección
     */
    function setDevWallet(address _newDevWallet) external onlyOwner {
        require(_newDevWallet != address(0), "Direccion invalida");
        devWallet = _newDevWallet;
    }
    
    /**
     * @dev Obtiene los tickets de un sorteo
     * @param drawId ID del sorteo
     */
    function getDrawTickets(uint256 drawId) external view returns (uint256[] memory) {
        return drawTickets[drawId];
    }
    
    /**
     * @dev Obtiene los tickets de un usuario
     * @param user Dirección del usuario
     */
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    /**
     * @dev Obtiene los tickets de un usuario en un sorteo específico
     * @param drawId ID del sorteo
     * @param user Dirección del usuario
     */
    function getUserDrawTickets(uint256 drawId, address user) external view returns (uint256[] memory) {
        return userDrawTickets[drawId][user];
    }
    
    /**
     * @dev Obtiene el resultado de un sorteo
     * @param drawId ID del sorteo
     */
    function getDrawResult(uint256 drawId) external view returns (
        string[] memory winningEmojis,
        uint256 prizePool,
        uint256 timestamp,
        bool completed,
        uint256 firstPrizeCount,
        uint256 secondPrizeCount,
        uint256 thirdPrizeCount,
        uint256 fourthPrizeCount
    ) {
        DrawResult storage draw = draws[drawId];
        return (
            draw.winningEmojis,
            draw.prizePool,
            draw.timestamp,
            draw.completed,
            draw.firstPrizeWinners,
            draw.secondPrizeWinners,
            draw.thirdPrizeWinners,
            draw.fourthPrizeWinners
        );
    }
    
    /**
     * @dev Obtiene información sobre el próximo sorteo
     */
    function getNextDrawInfo() external view returns (
        uint256 currentDraw,
        uint256 nextDraw,
        uint256 timeRemaining,
        uint256 currentPool
    ) {
        return (
            currentDrawId,
            nextDrawTime,
            nextDrawTime > block.timestamp ? nextDrawTime - block.timestamp : 0,
            prizePoolForDraw[currentDrawId]
        );
    }
} 