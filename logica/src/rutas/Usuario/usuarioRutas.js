const express  = require('express');
const router   = express.Router();
const svc = require('../../servicios/Usuario/usuarioServicio');
const { verificarToken, verificarRol } = require('../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../utils/requestHelpers');

router.use(verificarToken, verificarRol('Director'));

// GET /api/Usuario
router.get('/', async (_req, res) => {
    try {
        res.json(await svc.listar());
    } catch (err) {
        console.error('Error al listar usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Usuario/roles
router.get('/roles', async (_req, res) => {
    try {
        res.json(await svc.listarRoles());
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Usuario/auditoria
router.get('/auditoria', async (_req, res) => {
    try {
        res.json(await svc.listarAuditoria(400));
    } catch (err) {
        console.error('Error al listar auditoría:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/Usuario
router.post('/', async (req, res) => {
    const { roles, ...datos } = req.body;
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        const nuevo = await svc.crear(datos, roles || [], auditCtx);
        res.status(201).json({ mensaje: 'Trabajador creado exitosamente.', trabajador: nuevo });
    } catch (err) {
        if (err.message.includes('ya está registrada') || err.message.includes('ya está en uso')) {
            return res.status(409).json({ error: err.message });
        }
        if (err.message.includes('requeridos')) return res.status(400).json({ error: err.message });
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Usuario/parametros-beneficio
router.get('/parametros-beneficio', async (_req, res) => {
    try {
        res.json(await svc.obtenerParametrosBeneficio());
    } catch (err) {
        console.error('Error al obtener parámetros de beneficio:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PUT /api/Usuario/parametros-beneficio
// OJO: debe ir antes de PUT /:cedula, si no Express interpretaría
// "parametros-beneficio" como una cédula.
router.put('/parametros-beneficio', async (req, res) => {
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        const { valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido } = req.body;
        const result = await svc.actualizarParametrosBeneficio(valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/Usuario/:cedula
router.put('/:cedula', async (req, res) => {
    const { roles, ...datos } = req.body;
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        await svc.actualizar(req.params.cedula, datos, roles || [], auditCtx);
        res.json({ mensaje: 'Trabajador actualizado correctamente.' });
    } catch (err) {
        if (err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        if (err.message.includes('ya está en uso')) return res.status(409).json({ error: err.message });
        console.error('Error al actualizar usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PATCH /api/Usuario/:cedula/estado
router.patch('/:cedula/estado', async (req, res) => {
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        await svc.cambiarEstado(req.params.cedula, req.body.activo, auditCtx);
        res.json({ mensaje: `Trabajador ${req.body.activo ? 'activado' : 'desactivado'} correctamente.` });
    } catch (err) {
        if (err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        console.error('Error al cambiar estado:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


module.exports = router;
