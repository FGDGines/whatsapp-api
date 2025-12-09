const authMiddleware = (req, res, next) => {
    const apiPassword = req.headers['x-api-password'] || (req.body && req.body.password);
    const expectedPassword = process.env.API_PASSWORD;

    if (!expectedPassword) {
        return res.status(500).json({
            success: false,
            error: 'API_PASSWORD no configurado en el servidor'
        });
    }

    if (!apiPassword) {
        return res.status(401).json({
            success: false,
            error: 'Password requerido. Usa header x-api-password o campo password en el body'
        });
    }

    if (apiPassword !== expectedPassword) {
        return res.status(401).json({
            success: false,
            error: 'Password incorrecto'
        });
    }

    next();
};

module.exports = authMiddleware; 