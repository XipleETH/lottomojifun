(function() {
  // Intenta detectar si estamos en un entorno de Farcaster/Warpcast
  const inIframe = window !== window.parent;
  const isWarpcastDomain = window.location.hostname.includes('warpcast') || 
                        window.location.href.includes('warpcast.com') ||
                        (document.referrer && document.referrer.includes('warpcast'));
  
  console.log('Farcaster detector: Running detection');
  
  // Función para intentar obtener el SDK
  function detectSdk() {
    // Posibles ubicaciones del SDK
    const possibleSdks = [
      window.frames?.sdk,
      window.Farcaster?.sdk,
      window.frameWarpcast?.sdk,
      window.fc_sdk,
      window.fcFrame?.sdk,
      window.farcaster?.sdk,
      window.frame?.sdk,
      window._farcaster?.sdk
    ];
    
    // Usar el primer SDK válido que encontremos
    for (const sdk of possibleSdks) {
      if (sdk && typeof sdk === 'object') {
        console.log('Farcaster detector: SDK found');
        return sdk;
      }
    }
    
    console.log('Farcaster detector: No SDK found');
    return null;
  }
  
  // Inicializar monitoreo para disponibilidad del SDK
  function initSdkMonitor() {
    console.log('Farcaster detector: Initializing SDK monitor');
    
    // Verificar si ya tenemos el SDK
    const sdk = detectSdk();
    if (sdk) {
      // Asegurarnos de que esté disponible globalmente
      window.Farcaster = window.Farcaster || {};
      window.Farcaster.sdk = sdk;
      console.log('Farcaster detector: SDK already available, exposing globally');
      return;
    }
    
    // Si no hay SDK, intentar cargarlo
    if (!window.Farcaster) {
      window.Farcaster = {};
    }
    
    // Intentar cargar el script si estamos en un posible entorno Farcaster
    if (inIframe || isWarpcastDomain) {
      console.log('Farcaster detector: Possible Farcaster environment detected');
      
      // Establecer un intervalo para verificar periódicamente
      const checkInterval = setInterval(() => {
        const detectedSdk = detectSdk();
        if (detectedSdk) {
          window.Farcaster.sdk = detectedSdk;
          console.log('Farcaster detector: SDK found and exposed globally');
          clearInterval(checkInterval);
        }
      }, 300);
      
      // Limpiar después de 10 segundos para evitar checks infinitos
      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('Farcaster detector: Stopping checks after timeout');
      }, 10000);
    }
  }
  
  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSdkMonitor);
  } else {
    initSdkMonitor();
  }
})(); 