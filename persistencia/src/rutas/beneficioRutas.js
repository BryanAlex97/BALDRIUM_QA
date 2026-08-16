const express = require('express');
const router = express.Router();
const repo = require('../db/beneficioRepositorio');

router.get('/parametros', async (_req, res) => {
    try {
        res.json(await repo.obtenerParametros());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/parametros', async (req, res) => {
    try {
        const { valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx } = req.body;
        const result = await repo.actualizarParametros(valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/compras-elegibles', async (_req, res) => {
    try {
        res.json(await repo.listarComprasElegibles());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/:id/referidos', async (req, res) => {
    try {
        res.json(await repo.listarReferidosDeCompra(Number(req.params.id)));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { compraId, auditCtx } = req.body;
        const result = await repo.crearBeneficio(compraId, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/revision', async (_req, res) => {
    try {
        res.json(await repo.listarEnRevision());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/:id/referidos-detallado', async (req, res) => {
    try {
        res.json(await repo.listarReferidosDeCompraDetallado(Number(req.params.id)));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/productos-disponibles', async (_req, res) => {
    try {
        res.json(await repo.listarProductosDisponibles());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/estado', async (req, res) => {
    try {
        const { estado, inventarioId, motivo, auditCtx } = req.body;
        await repo.cambiarEstadoBeneficio(Number(req.params.id), estado, inventarioId, motivo, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/revision/buscar', async (req, res) => {
    try {
        res.json(await repo.buscarEnRevision(req.query.q || ''));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/aprobados-recientes', async (req, res) => {
    try {
        const { dias } = req.query;
        res.json(await repo.listarAprobadosRecientes(dias ? Number(dias) : undefined));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/aprobados-recientes/buscar', async (req, res) => {
    try {
        res.json(await repo.buscarAprobadosRecientes(req.query.q || ''));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/rechazados-recientes', async (req, res) => {
    try {
        const { dias } = req.query;
        res.json(await repo.listarRechazadosRecientes(dias ? Number(dias) : undefined));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/rechazados-recientes/buscar', async (req, res) => {
    try {
        res.json(await repo.buscarRechazadosRecientes(req.query.q || ''));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/kpi-recientes', async (req, res) => {
    try {
        const { dias } = req.query;
        res.json(await repo.kpiBeneficiosRecientes(dias ? Number(dias) : undefined));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
