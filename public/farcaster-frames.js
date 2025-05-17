/**
 * Script mejorado para Farcaster Frames
 * Basado en ejemplos exitosos de integración con Warpcast
 */
(function() {
  // Configuración global
  window.FARCASTER_CONFIG = {
    appId: 'MD6NcmUnNhly',
    domain: window.location.hostname,
    siweUri: window.location.origin,
    debug: true
  };

  // Logs específicos para depuración
  const logDebug = (message, data) => {
    if (window.FARCASTER_CONFIG.debug) {
      console.log(`[FARCASTER-FRAMES] ${message}`, data || '');
    }
  };

  // Detecta si estamos en Warpcast
  const detectWarpcastEnvironment = () => {
    const isInIframe = window !== window.parent;
    const isWarpcastDomain = window.location.hostname.includes('warpcast.com') || 
                          document.referrer.includes('warpcast.com');
    const hasFrameGlobals = !!(window.frames || window.fc_frame || window.frameWarpcast);
    const hasOnchainContext = !!(window.ethereum && window.ethereum.isFarcaster);
    
    const result = {
      inIframe: isInIframe,
      isWarpcastDomain: isWarpcastDomain,
      hasFrameGlobals: hasFrameGlobals,
      hasOnchainContext: hasOnchainContext,
      isWarpcast: isInIframe || isWarpcastDomain || hasFrameGlobals || hasOnchainContext
    };
    
    logDebug('Detección de entorno Warpcast', result);
    return result;
  };

  // Inicializa la conexión con Warpcast
  const initializeWarpcastConnection = async () => {
    try {
      const env = detectWarpcastEnvironment();
      
      // Si detectamos que estamos en Warpcast
      if (env.isWarpcast) {
        logDebug('Ambiente de Warpcast detectado, iniciando conexión');
        
        // Buscar el SDK en diferentes ubicaciones
        const possibleSDKs = [
          window.frames?.sdk,
          window.Farcaster?.sdk,
          window.fc_sdk,
          window.fcFrame?.sdk,
          window.farcaster?.sdk,
          window.frameWarpcast?.sdk,
          window._farcaster?.sdk
        ];
        
        // Encontrar el primer SDK válido
        let sdk = null;
        for (const potentialSDK of possibleSDKs) {
          if (potentialSDK && typeof potentialSDK === 'object') {
            sdk = potentialSDK;
            break;
          }
        }
        
        // Si encontramos el SDK, hacerlo disponible globalmente
        if (sdk) {
          logDebug('SDK de Farcaster encontrado', sdk);
          window.Farcaster = window.Farcaster || {};
          window.Farcaster.sdk = sdk;
          
          // Disparar evento de SDK disponible
          const sdkEvent = new CustomEvent('farcaster:sdk:ready', { detail: sdk });
          window.dispatchEvent(sdkEvent);
          
          return true;
        } else {
          logDebug('No se pudo encontrar el SDK de Farcaster');
        }
      } else {
        logDebug('No estamos en un ambiente de Warpcast');
      }
    } catch (error) {
      console.error('[FARCASTER-FRAMES] Error al inicializar conexión con Warpcast:', error);
    }
    
    return false;
  };

  // Iniciar la detección al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWarpcastConnection);
  } else {
    initializeWarpcastConnection();
  }
  
  // Exponer funciones globalmente
  window.FarcasterFrames = {
    detectEnvironment: detectWarpcastEnvironment,
    initialize: initializeWarpcastConnection
  };
  
  // Volver a intentar periódicamente si no se detecta el SDK
  let attempts = 0;
  const maxAttempts = 10;
  const retryInterval = setInterval(() => {
    attempts++;
    logDebug(`Intento ${attempts}/${maxAttempts} de detectar SDK de Farcaster`);
    
    const success = initializeWarpcastConnection();
    if (success || attempts >= maxAttempts) {
      clearInterval(retryInterval);
      logDebug(`Detección finalizada: ${success ? 'Éxito' : 'Fallido después de ' + attempts + ' intentos'}`);
    }
  }, 1000);
})(); 