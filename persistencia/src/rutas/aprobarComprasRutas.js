const express = require('express');
const router = express.Router();
const repo = require('../db/aprobarComprasRepositorio');

router.get('/pendientes', async (req, res) => {
    try {
        const { dias } = req.query;
        res.json(await repo.listarPendientes(dias ? Number(dias) : undefined));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/aprobadas', async (req, res) => {
    try {
        const { dias } = req.query;
        res.json(await repo.listarAprobadas(dias ? Number(dias) : undefined));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/rechazadas', async (req, res) => {
    try {
        const { dias } = req.query;
        res.json(await repo.listarRechazadas(dias ? Number(dias) : undefined));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/pendientes/buscar', async (req, res) => {
    try {
        res.json(await repo.buscarPendientes(req.query.q || ''));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/aprobadas/buscar', async (req, res) => {
    try {
        res.json(await repo.buscarAprobadas(req.query.q || ''));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/rechazadas/buscar', async (req, res) => {
    try {
        res.json(await repo.buscarRechazadas(req.query.q || ''));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/estado', async (req, res) => {
    try {
        const { estado, motivo, auditCtx } = req.body;
        await repo.cambiarEstadoCompra(Number(req.params.id), estado, motivo, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
