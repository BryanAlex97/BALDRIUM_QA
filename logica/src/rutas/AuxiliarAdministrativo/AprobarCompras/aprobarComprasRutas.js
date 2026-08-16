const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../../utils/requestHelpers');
const svc = require('../../../servicios/AuxiliarAdministrativo/aprobarComprasServicio');

// Todas las rutas de este router requieren token válido + rol Auxiliar Administrativo
router.use(verificarToken, verificarRol('Auxiliar Administrativo'));

router.get('/pendientes', async (req, res) => {
    try {
        const { dias } = req.query;
        const rows = await svc.listarPendientes(dias ? Number(dias) : undefined);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/aprobadas', async (req, res) => {
    try {
        const { dias } = req.query;
        const rows = await svc.listarAprobadas(dias ? Number(dias) : undefined);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/rechazadas', async (req, res) => {
    try {
        const { dias } = req.query;
        const rows = await svc.listarRechazadas(dias ? Number(dias) : undefined);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/pendientes/buscar', async (req, res) => {
    try {
        const rows = await svc.buscarPendientes(req.query.q || '');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/aprobadas/buscar', async (req, res) => {
    try {
        const rows = await svc.buscarAprobadas(req.query.q || '');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/rechazadas/buscar', async (req, res) => {
    try {
        const rows = await svc.buscarRechazadas(req.query.q || '');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/estado', async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const { estado, motivo } = req.body;
        await svc.cambiarEstado(Number(req.params.id), estado, motivo, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
