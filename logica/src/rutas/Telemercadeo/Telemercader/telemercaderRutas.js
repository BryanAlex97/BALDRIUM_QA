const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../../utils/requestHelpers');
const svc = require('../../../servicios/Telemercadeo/Telemercader/telemercaderServicio');

// Solo valida el token aquí; el rol se exige por ruta (ver comentario más abajo).
router.use(verificarToken);

// El chequeo de rol se aplica por ruta, no como router.use() global: este router
// comparte prefijo de montaje con asesorComercialRutas (ambos van bajo /api/telemercadeo
// sin un path propio), así que un router.use(verificarRol(...)) global interceptaría
// también las peticiones dirigidas al otro sub-router antes de que Express pudiera
// intentarlo, bloqueando por error a los demás roles.
const soloTelemercader = verificarRol('Telemercaderista');

// ─── Prospectos ───────────────────────────────────────────────────────────────

router.get('/prospectos/pendientes', soloTelemercader, async (_req, res) => {
    try {
        const rows = await svc.listarPendientes();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/prospectos/en-gestion', soloTelemercader, async (_req, res) => {
    try {
        const rows = await svc.listarEnGestion();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/prospectos/pendientes/buscar', soloTelemercader, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await svc.buscarPendientes(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/prospectos/en-gestion/buscar', soloTelemercader, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await svc.buscarEnGestion(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/prospectos/:id/agendar-visita', soloTelemercader, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await svc.agendarVisita(Number(req.params.id), req.body, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/prospectos/:id/estado', soloTelemercader, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        await svc.cambiarEstadoProspecto(Number(req.params.id), req.body.estado, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/prospectos/nueva-agenda', soloTelemercader, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await svc.crearProspectoYAgendar(req.body, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/asesores', soloTelemercader, async (_req, res) => {
    try {
        const rows = await svc.listarAsesoresComerciales();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Beneficios ─────────────────────────────────────────────────────────────────

router.get('/beneficios/compras-elegibles', soloTelemercader, async (_req, res) => {
    try {
        const rows = await svc.listarComprasElegiblesBeneficio();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/beneficios/compras/:id/referidos', soloTelemercader, async (req, res) => {
    try {
        const rows = await svc.listarReferidosDeCompraBeneficio(Number(req.params.id));
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/beneficios', soloTelemercader, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await svc.crearBeneficio(req.body.compraId, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ─── Visitas de la semana ───────────────────────────────────────────────────────

router.get('/visitas/semana/visitadas', soloTelemercader, async (_req, res) => {
    try {
        const rows = await svc.listarVisitasSemanaVisitadas();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/semana/por-gestionar', soloTelemercader, async (_req, res) => {
    try {
        const rows = await svc.listarVisitasSemanaPorGestionar();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/fallidas', soloTelemercader, async (_req, res) => {
    try {
        const rows = await svc.listarVisitasFallidas();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/fallidas/kpi', soloTelemercader, async (_req, res) => {
    try {
        const kpi = await svc.kpiVisitasFallidas();
        res.json(kpi);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/fallidas/buscar', soloTelemercader, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await svc.buscarVisitasFallidas(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/semana/visitadas/buscar', soloTelemercader, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await svc.buscarVisitasVisitadas(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/semana/por-gestionar/buscar', soloTelemercader, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await svc.buscarVisitasPorGestionar(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visitas/:id/estado', soloTelemercader, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        await svc.cambiarEstadoVisita(Number(req.params.id), req.body.estado, req.body.notas, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/visitas/:id', soloTelemercader, async (req, res) => {
    try {
        const datos = await svc.obtenerDetalleVisita(Number(req.params.id));
        if (!datos) return res.status(404).json({ error: 'Visita no encontrada' });
        res.json(datos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/visitas/:id', soloTelemercader, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        await svc.editarVisita(Number(req.params.id), req.body, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/visitas/:id/cancelar', soloTelemercader, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        await svc.cancelarVisita(Number(req.params.id), req.body.motivo, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
