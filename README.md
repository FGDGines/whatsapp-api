# API de WhatsApp

API REST simple para enviar mensajes de WhatsApp usando Baileys.

## Instalación

1. Clonar o crear el proyecto
2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tu configuración
```

4. Iniciar el servidor:
```bash
npm start
# o para desarrollo:
npm run dev
```

## Configuración

### Variables de entorno (.env)
```env
PORT=3000
API_PASSWORD=tu_password_secreto
PRINT_QR_IN_TERMINAL=true
```

## Uso de la API

### Autenticación
Todas las peticiones requieren autenticación usando el password configurado en `API_PASSWORD`.

**Opción 1: Header**
```
x-api-password: tu_password_secreto
```

**Opción 2: Body**
```json
{
  "password": "tu_password_secreto",
  "message": "...",
  "receiver": "..."
}
```

### Endpoints

#### 1. Verificar estado
```bash
GET /status
```

**Respuesta:**
```json
{
  "success": true,
  "whatsapp_connected": true,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 2. Enviar mensaje
```bash
POST /send-message
```

**Body:**
```json
{
  "message": "Hola mundo!",
  "receiver": "123456789@s.whatsapp.net",
  "media": "https://ejemplo.com/imagen.jpg"  // OPCIONAL
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "messageId": "ABC123",
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "message": "Mensaje enviado exitosamente"
}
```

#### 3. Reconectar WhatsApp
```bash
POST /reconnect
```

## Formatos de Receiver

- **Número completo:** `123456789@s.whatsapp.net`
- **Solo número:** `123456789` (se formatea automáticamente)

## Tipos de Media Soportados

- **Imágenes:** .jpg, .jpeg, .png, .gif, .webp
- **Videos:** .mp4, .avi, .mov, .mkv
- **Audio:** .mp3, .wav, .ogg, .m4a
- **Documentos:** .pdf, .doc, .docx, .txt

## Ejemplos de Uso

### cURL
```bash
# Enviar mensaje de texto
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-api-password: tu_password" \
  -d '{
    "message": "Hola desde la API!",
    "receiver": "123456789"
  }'

# Enviar imagen con caption
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-api-password: tu_password" \
  -d '{
    "message": "Mira esta imagen!",
    "receiver": "123456789",
    "media": "https://ejemplo.com/imagen.jpg"
  }'
```

### JavaScript/Fetch
```javascript
const sendMessage = async (message, receiver, media = null) => {
  const response = await fetch('http://localhost:3000/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-password': 'tu_password'
    },
    body: JSON.stringify({
      message,
      receiver,
      media
    })
  });
  
  return await response.json();
};

// Uso
sendMessage('Hola!', '123456789')
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### Python/Requests
```python
import requests

def send_message(message, receiver, media=None):
    url = "http://localhost:3000/send-message"
    headers = {
        "Content-Type": "application/json",
        "x-api-password": "tu_password"
    }
    data = {
        "message": message,
        "receiver": receiver
    }
    if media:
        data["media"] = media
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# Uso
result = send_message("Hola desde Python!", "123456789")
print(result)
```

## Notas Importantes

1. **Primera conexión:** Al iniciar por primera vez, se mostrará un código QR en la terminal. Escanéalo con WhatsApp en tu teléfono.

2. **Sesiones:** Las credenciales se guardan en la carpeta `auth_info_baileys/` para reconexiones automáticas.

3. **Conexión:** El servidor debe estar conectado a WhatsApp para enviar mensajes. Verifica el estado con `/status`.

4. **Seguridad:** Cambia el `API_PASSWORD` por defecto en producción.

5. **Rate Limiting:** WhatsApp tiene límites de envío. No envíes demasiados mensajes rápidamente.

## Solución de Problemas

### WhatsApp no se conecta
- Verifica que el código QR se escanee correctamente
- Revisa los logs del servidor
- Usa `/reconnect` para reconectar manualmente

### Error de autenticación
- Verifica que el `API_PASSWORD` coincida
- Usa el header `x-api-password` o campo `password` en el body

### Mensaje no se envía
- Verifica que el receiver esté en formato correcto
- Asegúrate de que WhatsApp esté conectado (`/status`)
- Revisa que el número exista en WhatsApp

## Licencia

MIT 