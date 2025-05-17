// Script de diagnóstico para Farcaster SDK
console.log('🔍 Iniciando diagnóstico del SDK de Farcaster...');

// Función para verificar el entorno
function detectEnvironment() {
  console.log('\n📊 DIAGNÓSTICO DE ENTORNO:');
  
  // Verificar si estamos en un iframe
  const inIframe = window !== window.parent;
  console.log(`- inIframe: ${inIframe ? '✅' : '❌'}`);
  
  // Verificar si estamos en un dominio de Warpcast
  const isWarpcastDomain = window.location.hostname.includes('warpcast') || 
                         document.referrer?.includes('warpcast');
  console.log(`- isWarpcastDomain: ${isWarpcastDomain ? '✅' : '❌'}`);
  
  // Verificar si estamos en una mini-app
  const isMiniApp = window.location.href.includes('miniapp') || 
                   document.referrer?.includes('miniapp');
  console.log(`- isMiniApp: ${isMiniApp ? '✅' : '❌'}`);
  
  return { inIframe, isWarpcastDomain, isMiniApp };
}

// Función para buscar el SDK en diferentes ubicaciones
function findSDK() {
  console.log('\n🔎 BÚSQUEDA DEL SDK:');
  
  const possibleLocations = [
    { name: 'window.frames?.sdk', value: window.frames?.sdk },
    { name: 'window.Farcaster?.sdk', value: window.Farcaster?.sdk },
    { name: 'window.frameWarpcast?.sdk', value: window.frameWarpcast?.sdk },
    { name: 'window.fc_sdk', value: window.fc_sdk },
    { name: 'window.fcFrame?.sdk', value: window.fcFrame?.sdk },
    { name: 'window.farcaster?.sdk', value: window.farcaster?.sdk },
    { name: 'window.frame?.sdk', value: window.frame?.sdk },
    { name: 'window._farcaster?.sdk', value: window._farcaster?.sdk }
  ];
  
  let found = false;
  
  for (const location of possibleLocations) {
    if (location.value) {
      console.log(`- ${location.name}: ✅ ENCONTRADO`);
      console.log(`  Propiedades disponibles: ${Object.keys(location.value).join(', ')}`);
      found = true;
    } else {
      console.log(`- ${location.name}: ❌ No encontrado`);
    }
  }
  
  if (!found) {
    console.log('❌ No se encontró el SDK de Farcaster en ninguna ubicación conocida.');
  }
  
  return found;
}

// Función para verificar los scripts cargados
function checkLoadedScripts() {
  console.log('\n📑 SCRIPTS CARGADOS:');
  
  const scripts = document.querySelectorAll('script');
  const farcasterScripts = Array.from(scripts).filter(script => 
    script.src && (
      script.src.includes('farcaster') || 
      script.src.includes('warpcast') ||
      script.src.includes('frames')
    )
  );
  
  if (farcasterScripts.length > 0) {
    console.log(`✅ Scripts relacionados con Farcaster (${farcasterScripts.length}):`);
    farcasterScripts.forEach(script => {
      console.log(`- ${script.src}`);
    });
  } else {
    console.log('❌ No se encontraron scripts relacionados con Farcaster.');
  }
  
  return farcasterScripts.length > 0;
}

// Función para verificar metadatos de Frame
function checkFrameMetadata() {
  console.log('\n🖼️ METADATOS DE FRAME:');
  
  const frameMeta = document.querySelector('meta[name="fc:frame"]');
  if (frameMeta) {
    console.log('✅ Metadatos de Frame encontrados:');
    try {
      const frameContent = JSON.parse(frameMeta.content);
      console.log(`- Versión: ${frameContent.version}`);
      console.log(`- URL de imagen: ${frameContent.image || frameContent.imageUrl}`);
      if (frameContent.buttons) {
        console.log(`- Botones: ${frameContent.buttons.length}`);
      } else if (frameContent.button) {
        console.log(`- Botón: ${frameContent.button.title || 'Sin título'}`);
      }
    } catch (e) {
      console.log(`❌ Error al parsear metadatos: ${e.message}`);
      console.log(`- Contenido: ${frameMeta.content}`);
    }
  } else {
    console.log('❌ No se encontraron metadatos de Frame.');
  }
}

// Función para intentar inicializar el SDK (simular lo que hace la app)
function attemptSDKInitialization() {
  console.log('\n🚀 INTENTANDO INICIALIZAR SDK:');
  
  try {
    // Crear un elemento script
    const script = document.createElement('script');
    script.src = 'https://warpcast.com/js/frames.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Script frames.js cargado correctamente');
      setTimeout(checkSDKAfterLoad, 1000);
    };
    script.onerror = (e) => {
      console.log(`❌ Error cargando script: ${e}`);
    };
    
    document.head.appendChild(script);
    console.log('✅ Script de Farcaster agregado dinámicamente');
    
    return true;
  } catch (e) {
    console.log(`❌ Error inicializando SDK: ${e.message}`);
    return false;
  }
}

// Verificar SDK después de carga
function checkSDKAfterLoad() {
  console.log('\n⏱️ VERIFICACIÓN DESPUÉS DE CARGA:');
  findSDK();
}

// Ejecutar todas las verificaciones
function runAllChecks() {
  detectEnvironment();
  const sdkFound = findSDK();
  checkLoadedScripts();
  checkFrameMetadata();
  
  if (!sdkFound) {
    attemptSDKInitialization();
  }
  
  console.log('\n🏁 DIAGNÓSTICO COMPLETO');
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllChecks);
} else {
  runAllChecks();
} 