const express = require('express');
const router  = express.Router();
const repo    = require('../db/trabajadorRepositorio');

// GET /trabajadores/roles
router.get('/roles', async (_req, res) => {
    try {
        res.json(await repo.listarRoles());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /trabajadores/existe-cedula/:cedula
router.get('/existe-cedula/:cedula', async (req, res) => {
    try {
        const existe = await repo.existeCedula(req.params.cedula);
        res.json({ existe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /trabajadores/existe-correo?correo=&excluir=
router.get('/existe-correo', async (req, res) => {
    try {
        const { correo, excluir } = req.query;
        const existe = await repo.existeCorreo(correo, excluir || null);
        res.json({ existe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /trabajadores/existe-codigo?codigo=&excluir=
router.get('/existe-codigo', async (req, res) => {
    try {
        const { codigo, excluir } = req.query;
        const existe = await repo.existeCodigoTrabajador(codigo, excluir || null);
        res.json({ existe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /trabajadores/por-correo?correo=
router.get('/por-correo', async (req, res) => {
    try {
        const trabajador = await repo.buscarPorCorreo(req.query.correo);
        if (!trabajador) return res.status(404).json({ error: 'No encontrado' });
        res.json(trabajador);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /trabajadores
router.get('/', async (_req, res) => {
    try {
        res.json(await repo.listarTodosConRoles());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /trabajadores/:cedula
router.get('/:cedula', async (req, res) => {
    try {
        const resultado = await repo.buscarPorCedula(req.params.cedula);
        if (!resultado) return res.status(404).json({ error: 'No encontrado' });
        res.json(resultado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /trabajadores
router.post('/', async (req, res) => {
    try {
        const { rolesIds, ...datos } = req.body;
        const nuevo = await repo.crearTrabajador(datos, rolesIds || []);
        res.status(201).json(nuevo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /trabajadores/:cedula
router.put('/:cedula', async (req, res) => {
    try {
        const { rolesIds, ...datos } = req.body;
        await repo.actualizarTrabajador(req.params.cedula, datos, rolesIds || []);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /trabajadores/:cedula/estado
router.patch('/:cedula/estado', async (req, res) => {
    try {
        await repo.cambiarEstado(req.params.cedula, req.body.activo);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /trabajadores/:cedula/perfil
router.put('/:cedula/perfil', async (req, res) => {
    try {
        await repo.actualizarPerfil(req.params.cedula, req.body);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /trabajadores/:cedula/contrasena
router.patch('/:cedula/contrasena', async (req, res) => {
    try {
        await repo.actualizarContrasena(req.params.cedula, req.body.nuevaContrasena, !!req.body.requiereCambio);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
