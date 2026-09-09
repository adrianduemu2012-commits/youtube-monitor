# Monitor autónomo de YouTube → Discord + comando `/prueba`

Este proyecto **no usa Make**. Es un bot de Discord que permanece conectado y hace lo siguiente:

1. Consulta el canal público de YouTube cada **15 minutos (900 segundos)**.
2. Detecta vídeos nuevos, directos activos y directos programados mediante YouTube Data API v3.
3. Envía una notificación al webhook de Discord únicamente cuando encuentra un elemento no notificado.
4. Guarda los IDs procesados en `state.json` para evitar duplicados tras reinicios, si el alojamiento conserva el disco.
5. Permite `/prueba` únicamente a usuarios con permisos de moderación.

## Arquitectura

```text
Bot autónomo
  ├─ cada 900 segundos → YouTube Data API
  │                         └─ vídeo nuevo → webhook → #avisos-youtube
  └─ /prueba → comprueba permisos → webhook → #avisos-youtube
```

El webhook ya apunta al canal `#avisos-youtube`, por lo que **no se necesita `CHANNEL_ID`**. El `GUILD_ID` sí se necesita para registrar rápidamente el comando slash en el servidor.

## Configuración equivalente a la solicitada

El programa utiliza estos valores lógicos:

| Configuración | Valor |
|---|---|
| Canal de YouTube | `UCEzV_-rw2Ib-e5MRYfXdxhQ` |
| Consulta | `part=snippet`, `order=date`, `maxResults=1`, `type=video` |
| Intervalo | `900000 ms` = 900 segundos = 15 minutos |
| Método YouTube | `GET` |
| Headers YouTube | Ninguno |
| Body YouTube | Ninguno |
| Método Discord | `POST` |
| Header Discord | `Content-Type: application/json` |
| Body Discord | JSON generado por el programa |

La clave de YouTube y la URL del webhook no se guardan en el código; se introducen mediante variables de entorno.

## Archivos

- `index.js`: monitor de YouTube, webhook y comando `/prueba`.
- `package.json`: dependencia y comando de inicio.
- `.env.example`: plantilla de variables.
- `.gitignore`: evita subir secretos y dependencias.

## Variables de entorno

Copia `.env.example` como `.env` en una ejecución local, o créalas en el panel del servicio donde alojes el bot:

```env
DISCORD_TOKEN=token_del_bot
CLIENT_ID=application_id
GUILD_ID=id_del_servidor
YOUTUBE_API_KEY=clave_nueva_de_youtube
YOUTUBE_CHANNEL_ID=UCEzV_-rw2Ib-e5MRYfXdxhQ
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/WEBHOOK_NUEVO
```

No necesitas `CHANNEL_ID`: el webhook ya está asociado al canal de Discord. `GUILD_ID` significa el ID del servidor, no el del canal.

## Crear el bot de Discord

Entra en [Discord Developer Portal](https://discord.com/developers/applications):

1. Pulsa **New Application**.
2. Entra en **Bot** y pulsa **Add Bot**.
3. Copia el token como `DISCORD_TOKEN`.
4. En **General Information**, copia el **Application ID** como `CLIENT_ID`.
5. Activa el modo desarrollador en Discord y copia el ID del servidor como `GUILD_ID`.
6. Invita el bot con los scopes `bot` y `applications.commands`.
7. Dale permisos mínimos para estar en el servidor. El mensaje de prueba lo envía el webhook.

El comando `/prueba` permite el uso a miembros con alguno de estos permisos:

- **Moderar miembros** (`Moderate Members`)
- **Gestionar mensajes** (`Manage Messages`)
- **Administrador** (`Administrator`)

## Crear la clave de YouTube

En [Google Cloud Console](https://console.cloud.google.com/):

1. Crea o selecciona un proyecto.
2. Activa **YouTube Data API v3**.
3. Crea una API key.
4. Restringe la clave a YouTube Data API v3 si es posible.
5. Guarda la clave como `YOUTUBE_API_KEY`.

El canal se consulta públicamente; no es necesario ser propietario del canal de YouTube.

## Configurar el webhook

Crea un webhook nuevo dentro del canal `#avisos-youtube` y guarda la URL como `DISCORD_WEBHOOK_URL`.

Los webhooks y las claves API que aparecieron en la conversación han quedado expuestos. Debes eliminarlos o revocarlos y generar otros nuevos antes de poner el bot en producción.

## Subirlo a Render

Para ejecutarlo sin mantener el ordenador encendido:

1. Crea un repositorio privado en [GitHub](https://github.com/).
2. Sube `index.js`, `package.json`, `.env.example`, `.gitignore` y `README.md`.
3. No subas `.env`, tokens, claves API ni URLs de webhook reales.
4. Entra en [Render](https://render.com/).
5. Selecciona **New → Background Worker**.
6. Conecta el repositorio.
7. Configura:

| Campo | Valor |
|---|---|
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |

8. Añade en **Environment Variables**:

| Nombre | Valor |
|---|---|
| `DISCORD_TOKEN` | Token del bot |
| `CLIENT_ID` | Application ID |
| `GUILD_ID` | ID del servidor |
| `YOUTUBE_API_KEY` | Clave nueva de YouTube |
| `YOUTUBE_CHANNEL_ID` | `UCEzV_-rw2Ib-e5MRYfXdxhQ` |
| `DISCORD_WEBHOOK_URL` | Webhook nuevo |

9. Pulsa **Create Background Worker**.

El servicio debe mantenerse activo para consultar cada 15 minutos. Algunos planes gratuitos pueden suspender procesos; para un funcionamiento 24/7 real utiliza un plan que mantenga activo el worker o un servidor siempre encendido.

## Cómo comprobar que funciona

En los logs debes ver mensajes parecidos a:

```text
Comando /prueba registrado en el servidor.
Bot conectado como ...
Monitor de YouTube iniciado: intervalo de 900 segundos.
```

El bot realiza una primera consulta al conectarse y, después, consulta cada 15 minutos.

### Prueba de `/prueba`

En Discord escribe:

```text
/prueba
```

Un moderador debe recibir una confirmación privada y `#avisos-youtube` debe recibir un mensaje como:

```text
✅ Prueba correcta | Ejecutada por Usuario | 2026-...
```

Prueba también con un usuario sin permisos. Debe recibir:

```text
No tienes permiso de moderación para usar este comando.
```

### Prueba del monitor de YouTube

Para verificar el monitor sin esperar 15 minutos:

1. Inicia el bot.
2. Mira los logs de la primera consulta.
3. Comprueba si envía el vídeo más reciente a Discord.
4. Espera al siguiente intervalo y confirma que muestra `Sin vídeo nuevo` si no hay cambios.
5. Cuando aparezca un vídeo nuevo, debería enviar una notificación con título, descripción y enlace.

El monitor evita duplicados comparando el `videoId` en memoria. Si el proceso se reinicia, pierde ese valor y puede volver a notificar el último vídeo; para evitarlo de forma permanente habría que guardar el último ID en una base de datos o archivo persistente.

## Ejecutarlo localmente

Requiere Node.js 18 o posterior:

```bash
npm install
cp .env.example .env
# Edita .env y completa las seis variables
npm start
```

No cierres la terminal mientras quieras que el bot permanezca conectado.

## Seguridad

Si una credencial se publica accidentalmente:

1. Regenera inmediatamente el token del bot.
2. Elimina y crea un webhook nuevo.
3. Revoca la API key de Google y crea otra.
4. Cambia las variables de entorno del servicio.
5. Revisa el historial de GitHub para confirmar que no quedaron secretos.

## Comportamiento actualizado

El monitor consulta los últimos 10 elementos del canal cada 15 minutos para reducir el riesgo de perder publicaciones entre comprobaciones. Solo envía vídeos, directos activos o directos programados cuyo `videoId` no figure en `state.json`, y guarda hasta 100 IDs procesados. La primera consulta crea una línea base silenciosa, por lo que no envía avisos antiguos al arrancar.

Para que la deduplicación sobreviva a reinicios, el alojamiento debe conservar `state.json` en un disco persistente. Si el alojamiento utiliza almacenamiento efímero, el bot puede volver a notificar el último elemento después de reiniciarse.
