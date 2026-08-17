const express  = require('express');
const router   = express.Router();
const svc = require('../../servicios/Inventario/inventarioServicio');
const { verificarToken, verificarRol } = require('../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../utils/requestHelpers');

router.use(verificarToken, verificarRol('Coordinador'));

// GET /api/Inventario
router.get('/', async (_req, res) => {
    try {
        res.json(await svc.listar());
    } catch (err) {
        console.error('Error al listar inventario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Inventario/auditoria
router.get('/auditoria', async (_req, res) => {
    try {
        res.json(await svc.listarAuditoriaMovimientos(400));
    } catch (err) {
        console.error('Error al listar auditoría de inventario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Inventario/auditoria/info
router.get('/auditoria/info', async (_req, res) => {
    try {
        res.json(await svc.listarAuditoriaInfo(400));
    } catch (err) {
        console.error('Error al listar auditoría info inventario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/Inventario
router.post('/', async (req, res) => {
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        const nuevo = await svc.crear(req.body, auditCtx);
        res.status(201).json({ mensaje: 'Producto creado exitosamente.', producto: nuevo });
    } catch (err) {
        if (err.message.includes('ya está registrado') || err.message.includes('ya existe')) {
            return res.status(409).json({ error: err.message });
        }
        if (err.message.includes('requerid') || err.message.includes('álid') || err.message.includes('negativ')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Error al crear producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PUT /api/Inventario/:id
router.put('/:id', async (req, res) => {
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        await svc.actualizar(parseInt(req.params.id), req.body, auditCtx);
        res.json({ mensaje: 'Producto actualizado correctamente.' });
    } catch (err) {
        if (err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        if (err.message.includes('requerid') || err.message.includes('álid') || err.message.includes('negativ')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Error al actualizar producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// DELETE /api/Inventario/:id
router.delete('/:id', async (req, res) => {
    const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
    try {
        await svc.eliminar(parseInt(req.params.id), auditCtx);
        res.json({ mensaje: 'Producto eliminado correctamente.' });
    } catch (err) {
        if (err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        console.error('Error al eliminar producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
