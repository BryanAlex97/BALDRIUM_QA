const { beneficio } = require('../../infraestructura/persistenciaCliente');

async function listarEnRevision() {
    return beneficio.listarEnRevision();
}

async function buscarEnRevision(q) {
    return beneficio.buscarEnRevision(q);
}

async function listarReferidosDeCompra(compraId) {
    return beneficio.listarReferidosDeCompraDetallado(compraId);
}

async function listarProductosDisponibles() {
    return beneficio.listarProductosDisponibles();
}

async function cambiarEstado(beneficioId, estado, inventarioId, motivo, auditCtx) {
    return beneficio.cambiarEstado(beneficioId, estado, inventarioId, motivo, auditCtx);
}

async function listarAprobadosRecientes(dias) {
    return beneficio.listarAprobadosRecientes(dias);
}

async function buscarAprobadosRecientes(q) {
    return beneficio.buscarAprobadosRecientes(q);
}

async function listarRechazadosRecientes(dias) {
    return beneficio.listarRechazadosRecientes(dias);
}

async function buscarRechazadosRecientes(q) {
    return beneficio.buscarRechazadosRecientes(q);
}

async function kpiBeneficiosRecientes(dias) {
    return beneficio.kpiBeneficiosRecientes(dias);
}

module.exports = {
    listarEnRevision, buscarEnRevision, listarReferidosDeCompra, listarProductosDisponibles, cambiarEstado,
    listarAprobadosRecientes, buscarAprobadosRecientes,
    listarRechazadosRecientes, buscarRechazadosRecientes,
    kpiBeneficiosRecientes,
};
