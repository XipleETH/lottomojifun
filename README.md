# LottoMoji - Juego de Lotería con Emojis en Tiempo Real

Un divertido juego de lotería con emojis donde los usuarios pueden generar tickets y ganar premios en tiempo real. Incluye un chat de emojis para que todos los usuarios puedan comunicarse.

## Características

- Juego de lotería con emojis en tiempo real
- Resultados sincronizados para todos los usuarios
- Chat de emojis en tiempo real
- Autenticación anónima
- Historial de resultados

## Configuración

1. Crea un proyecto en [Firebase](https://console.firebase.google.com/)
2. Habilita Firestore Database y Authentication (anónima)
3. Copia el archivo `.env.example` a `.env` y completa con tus credenciales de Firebase:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## Despliegue

El proyecto está configurado para ser desplegado en Vercel. Simplemente conecta tu repositorio a Vercel y asegúrate de configurar las variables de entorno.

## Estructura del Proyecto

- `src/components` - Componentes de React
- `src/firebase` - Configuración y servicios de Firebase
- `src/hooks` - Hooks personalizados de React
- `src/utils` - Utilidades y funciones auxiliares

## Nota para producción

En un entorno de producción, deberías implementar las funciones de sorteo del juego usando Firebase Cloud Functions para garantizar que los sorteos ocurran de manera confiable y segura.