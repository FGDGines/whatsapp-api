require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const WhatsAppClient = require('./whatsapp-client');
const authMiddleware = require('./auth-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'WhatsApp API',
            version: '1.0.0',
            description: 'API REST para enviar mensajes de WhatsApp usando Baileys',
            contact: {
                name: 'API Support'
            }
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                ApiPasswordAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-password',
                    description: 'Password de autenticación de la API'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'string',
                            example: 'Mensaje de error'
                        }
                    }
                },
                StatusResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        whatsapp_connected: {
                            type: 'boolean',
                            example: true
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-12-09T14:00:00.000Z'
                        }
                    }
                },
                SendMessageRequest: {
                    type: 'object',
                    required: ['message', 'receiver'],
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Mensaje de texto a enviar',
                            example: 'Hola, este es un mensaje de prueba'
                        },
                        receiver: {
                            type: 'string',
                            description: 'Número de teléfono del destinatario (con o sin @s.whatsapp.net)',
                            example: '1234567890@s.whatsapp.net'
                        },
                        media: {
                            type: 'string',
                            description: 'URL opcional de media (imagen, video, audio, documento)',
                            example: 'https://example.com/image.jpg'
                        }
                    }
                },
                SendMessageResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    example: true
                                },
                                messageId: {
                                    type: 'string',
                                    example: '3EB0C767F26BEC-CD'
                                },
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time',
                                    example: '2025-12-09T14:00:00.000Z'
                                }
                            }
                        },
                        message: {
                            type: 'string',
                            example: 'Mensaje enviado exitosamente'
                        }
                    }
                },
                ReconnectResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Reconexión iniciada'
                        }
                    }
                }
            }
        },
        security: [
            {
                ApiPasswordAuth: []
            }
        ]
    },
    apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configurar CORS con dominios permitidos desde .env
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.length === 0) {
            callback(null, true);
            return;
        }
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
};

// Middleware de logging
app.use((req, res, next) => {
    const origin = req.headers.origin || 'Sin origen';
    const method = req.method;
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] ${method} ${path} | Origen: ${origin} | IP: ${ip}`);
    
    const originalSend = res.send;
    res.send = function(data) {
        const statusCode = res.statusCode;
        const duration = Date.now() - startTime;
        const responseTimestamp = new Date().toISOString();
        console.log(`[${responseTimestamp}] ${method} ${path} | Status: ${statusCode} | Duración: ${duration}ms | Origen: ${origin}`);
        return originalSend.call(this, data);
    };
    
    next();
});

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Inicializar cliente de WhatsApp
const whatsappClient = new WhatsAppClient();

// Conectar WhatsApp al iniciar
whatsappClient.connect().then(() => {
    console.log('🔄 Iniciando conexión con WhatsApp...');
}).catch(error => {
    console.error('❌ Error al conectar WhatsApp:', error);
});

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Obtener estado de la conexión de WhatsApp
 *     description: Verifica si WhatsApp está conectado y listo para enviar mensajes
 *     tags: [Estado]
 *     security: []
 *     responses:
 *       200:
 *         description: Estado de la conexión
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 */
app.get('/status', (req, res) => {
    res.json({
        success: true,
        whatsapp_connected: whatsappClient.isReady(),
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /send-message:
 *   post:
 *     summary: Enviar mensaje de WhatsApp
 *     description: Envía un mensaje de texto o media a un número de WhatsApp
 *     tags: [Mensajes]
 *     security:
 *       - ApiPasswordAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *           examples:
 *             texto:
 *               summary: Mensaje de texto simple
 *               value:
 *                 message: "Hola, este es un mensaje de prueba"
 *                 receiver: "1234567890@s.whatsapp.net"
 *             conMedia:
 *               summary: Mensaje con imagen
 *               value:
 *                 message: "Mira esta imagen"
 *                 receiver: "1234567890@s.whatsapp.net"
 *                 media: "https://example.com/image.jpg"
 *     responses:
 *       200:
 *         description: Mensaje enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendMessageResponse'
 *       400:
 *         description: Error de validación (campos faltantes)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado (password incorrecto o faltante)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: WhatsApp no está conectado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/send-message', authMiddleware, async (req, res) => {
    try {
        const { message, receiver, media } = req.body;

        // Validaciones
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Campo "message" es requerido'
            });
        }

        if (!receiver) {
            return res.status(400).json({
                success: false,
                error: 'Campo "receiver" es requerido'
            });
        }

        if (!whatsappClient.isReady()) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp no está conectado. Espera a que se complete la conexión.'
            });
        }

        // Enviar mensaje
        const result = await whatsappClient.sendMessage(receiver, message, media);

        res.json({
            success: true,
            data: result,
            message: 'Mensaje enviado exitosamente'
        });

    } catch (error) {
        const origin = req.headers.origin || 'Sin origen';
        console.error(`Error en endpoint /send-message | Origen: ${origin}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /reconnect:
 *   post:
 *     summary: Reconectar WhatsApp
 *     description: Desconecta y vuelve a conectar WhatsApp. Útil si la conexión se perdió.
 *     tags: [Conexión]
 *     security:
 *       - ApiPasswordAuth: []
 *     responses:
 *       200:
 *         description: Resultado de la reconexión
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconnectResponse'
 *       401:
 *         description: No autorizado (password incorrecto o faltante)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/reconnect', authMiddleware, async (req, res) => {
    try {
        whatsappClient.disconnect();
        const connected = await whatsappClient.connect();
        
        res.json({
            success: connected,
            message: connected ? 'Reconexión iniciada' : 'Error en reconexión'
        });
    } catch (error) {
        const origin = req.headers.origin || 'Sin origen';
        console.error(`Error en endpoint /reconnect | Origen: ${origin}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Manejo de errores
app.use((error, req, res, next) => {
    const origin = req.headers.origin || 'Sin origen';
    console.error(`Error no manejado | Origen: ${origin}:`, error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor API iniciado en puerto ${PORT}`);
    console.log(`📱 Endpoint: http://localhost:${PORT}/send-message`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`📚 Documentación Swagger: http://localhost:${PORT}/api-docs`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    whatsappClient.disconnect();
    process.exit(0);
}); 