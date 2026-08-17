const express  = require('express');
const router   = express.Router();
const svc = require('../../servicios/Usuario/perfilServicio');
const { ValidationError } = svc;
const { verificarToken } = require('../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../utils/requestHelpers');

router.use(verificarToken);

// GET /api/perfil
router.get('/', async (req, res) => {
    try {
        res.json(await svc.obtenerPerfil(req.usuario.cedula));
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// PUT /api/perfil
router.put('/', async (req, res) => {
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        await svc.actualizarPerfil(req.usuario.cedula, req.body, auditCtx);
        res.json({ mensaje: 'Perfil actualizado correctamente.' });
    } catch (err) {
        if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
        console.error('Error al actualizar perfil:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PATCH /api/perfil/contrasena
router.patch('/contrasena', async (req, res) => {
    const { contrasenaActual, nuevaContrasena } = req.body;
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        const { token } = await svc.cambiarContrasena(req.usuario.cedula, contrasenaActual, nuevaContrasena, auditCtx);
        res.json({ mensaje: 'Contraseña actualizada correctamente.', token });
    } catch (err) {
        if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
        console.error('Error al cambiar contraseña:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
