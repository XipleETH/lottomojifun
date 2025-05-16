# Instrucciones para Migrar a la Nueva Colección player_tickets

Estas instrucciones describen los pasos para migrar el juego LottoMoji a la nueva colección `player_tickets` después de que la colección original `tickets` fue eliminada.

## Preparación

1. Clona el repositorio o asegúrate de tener la última versión del código.
2. Asegúrate de tener configuradas correctamente las credenciales de Firebase en tus archivos de scripts.

## Pasos para la Migración

### 1. Ejecuta el Script de Actualización del Estado

Este script actualizará el documento de estado del juego para utilizar la nueva colección:

```bash
# Primero actualiza las credenciales de Firebase en el archivo
node src/scripts/updateGameState.js
```

### 2. Inicializa la Nueva Colección con Tickets de Ejemplo

```bash
# Primero actualiza las credenciales de Firebase en el archivo
node src/scripts/initPlayerTickets.js
```

Este script creará varios tickets de ejemplo en la nueva colección `player_tickets` y actualizará el documento de estado del juego.

### 3. (Opcional) Migra Tickets Existentes si Aún Tienes Acceso a la Colección Antigua

Si aún tienes acceso a algunos tickets en la colección original, puedes migrarlos:

```bash
# Primero actualiza las credenciales de Firebase en el archivo
node src/scripts/migrateTickets.js
```

### 4. Despliega las Cloud Functions Actualizadas

Las Cloud Functions han sido actualizadas para usar la nueva colección de tickets. Despliega las funciones nuevamente:

```bash
firebase deploy --only functions
```

### 5. Verifica en la Consola de Firebase

Accede a la consola de Firebase y verifica:

1. El documento `game_state/current_game_state` debe tener el campo `ticketsCollection` = "player_tickets"
2. La colección `player_tickets` debe contener tickets
3. Las Cloud Functions deben estar actualizadas y funcionando

### 6. Prueba la Aplicación

Inicia la aplicación y verifica que:

1. Puedes ver los tickets existentes
2. Puedes generar nuevos tickets
3. Los sorteos se realizan correctamente
4. Los tickets ganadores se identifican adecuadamente

## Resolución de Problemas

### Si la aplicación no muestra tickets

Verifica en la consola del navegador que:

1. No hay errores de conexión a Firebase
2. La consulta a la colección `player_tickets` está funcionando
3. El documento de estado del juego tiene correctamente configurada la colección de tickets

### Si los sorteos no funcionan correctamente

1. Verifica el documento de estado del juego
2. Revisa los logs de Cloud Functions en la consola de Firebase
3. Ejecuta un sorteo manual a través de la función `triggerGameDraw`

## Revertir la Migración (Si es Necesario)

Si necesitas revertir la migración, simplemente actualiza el documento de estado del juego:

```javascript
// En la consola de Firebase o mediante un script
db.collection('game_state').doc('current_game_state').update({
  ticketsCollection: 'tickets'
});
```

Luego reinstala la colección `tickets` ejecutando el script original de inicialización. 