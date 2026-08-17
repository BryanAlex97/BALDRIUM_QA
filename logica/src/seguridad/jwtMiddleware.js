const jwt = require('jsonwebtoken');

// Rutas accesibles aunque el usuario tenga pendiente el cambio obligatorio de
// contraseña (autoservicio de perfil: ver sus datos y cambiar la contraseña).
const PREFIJO_PERMITIDO_CON_CAMBIO_PENDIENTE = '/api/perfil';

/**
 * Middleware que protege rutas verificando el JWT.
 * Si el token es válido adjunta req.usuario = { cedula, nombre, roles[], debeCambiarContrasena }.
 * Si no, responde 401. Si el usuario tiene pendiente el cambio obligatorio de
 * contraseña (login con contraseña temporal), bloquea cualquier ruta que no sea
 * de autoservicio de perfil, respondiendo 403 con codigo 'CAMBIO_CONTRASENA_REQUERIDO'.
 */
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido. Inicia sesión primero.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = {
            cedula: payload.cedula,
            nombre: payload.nombre,
            roles:  payload.roles || [],
            debeCambiarContrasena: !!payload.debeCambiarContrasena,
        };

        if (req.usuario.debeCambiarContrasena) {
            const ruta = req.originalUrl.split('?')[0];
            if (!ruta.startsWith(PREFIJO_PERMITIDO_CON_CAMBIO_PENDIENTE)) {
                return res.status(403).json({
                    error: 'Debes cambiar tu contraseña temporal antes de continuar.',
                    codigo: 'CAMBIO_CONTRASENA_REQUERIDO',
                });
            }
        }

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
    }
}

/**
 * Factory que genera un middleware para verificar que el usuario
 * tenga AL MENOS uno de los roles requeridos.
 * @param {...string} rolesPermitidos  Ej: verificarRol('Dirección', 'Coordinación')
 */
function verificarRol(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'No autenticado.' });
        }
        const tieneRol = req.usuario.roles.some(r => rolesPermitidos.includes(r));
        if (!tieneRol) {
            return res.status(403).json({
                error: `Acceso denegado. Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`
            });
        }
        next();
    };
}

module.exports = { verificarToken, verificarRol };
