const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

class WhatsAppClient {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.authFolder = './auth_info_baileys';
    }

    async connect() {
        try {
            // Crear carpeta de auth si no existe
            if (!fs.existsSync(this.authFolder)) {
                fs.mkdirSync(this.authFolder);
            }

            // Cargar estado de autenticación
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            // Crear socket de WhatsApp
            this.sock = makeWASocket({
                auth: state,
                logger: {
                    level: 'silent',
                    child: () => ({
                        level: 'silent',
                        error: () => {},
                        info: () => {},
                        warn: () => {},
                        debug: () => {},
                        trace: () => {}
                    }),
                    error: () => {},
                    info: () => {},
                    warn: () => {},
                    debug: () => {},
                    trace: () => {}
                }
            });

            // Manejar eventos de conexión
            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    console.log('\n📱 Escanea este código QR con WhatsApp:');
                    qrcode.generate(qr, { small: true });
                    console.log('');
                }
                
                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log('Conexión cerrada debido a:', lastDisconnect?.error, ', reconectando:', shouldReconnect);
                    
                    if (shouldReconnect) {
                        setTimeout(() => this.connect(), 3000);
                    }
                } else if (connection === 'open') {
                    console.log('✅ Conexión de WhatsApp establecida');
                    this.isConnected = true;
                }
            });

            // Guardar credenciales cuando se actualicen
            this.sock.ev.on('creds.update', saveCreds);

            return true;
        } catch (error) {
            console.error('Error al conectar WhatsApp:', error);
            return false;
        }
    }

    async sendMessage(receiver, message, media = null) {
        if (!this.sock || !this.isConnected) {
            throw new Error('WhatsApp no está conectado');
        }

        try {
            // Formatear el receiver si es necesario
            let formattedReceiver = receiver;
            if (!receiver.includes('@')) {
                formattedReceiver = `${receiver}@s.whatsapp.net`;
            }

            let messageContent = {};

            // Si hay media, enviar media con caption
            if (media) {
                const mediaType = this.getMediaType(media);
                messageContent = {
                    [mediaType]: { url: media },
                    caption: message
                };
            } else {
                // Mensaje de texto simple
                messageContent = { text: message };
            }

            // Enviar mensaje
            const result = await this.sock.sendMessage(formattedReceiver, messageContent);
            
            return {
                success: true,
                messageId: result.key.id,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            throw new Error(`Error al enviar mensaje: ${error.message}`);
        }
    }

    getMediaType(mediaUrl) {
        const extension = path.extname(mediaUrl).toLowerCase();
        
        switch (extension) {
            case '.jpg':
            case '.jpeg':
            case '.png':
            case '.gif':
            case '.webp':
                return 'image';
            case '.mp4':
            case '.avi':
            case '.mov':
            case '.mkv':
                return 'video';
            case '.mp3':
            case '.wav':
            case '.ogg':
            case '.m4a':
                return 'audio';
            case '.pdf':
            case '.doc':
            case '.docx':
            case '.txt':
                return 'document';
            default:
                return 'image'; // Por defecto como imagen
        }
    }

    isReady() {
        return this.sock && this.isConnected;
    }

    disconnect() {
        if (this.sock) {
            this.sock.end();
            this.isConnected = false;
        }
    }
}

module.exports = WhatsAppClient; 