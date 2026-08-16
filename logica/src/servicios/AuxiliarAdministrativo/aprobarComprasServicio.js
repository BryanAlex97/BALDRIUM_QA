const { aprobarCompras } = require('../../infraestructura/persistenciaCliente');

async function listarPendientes(dias) {
    return aprobarCompras.listarPendientes(dias);
}

async function listarAprobadas(dias) {
    return aprobarCompras.listarAprobadas(dias);
}

async function listarRechazadas(dias) {
    return aprobarCompras.listarRechazadas(dias);
}

async function buscarPendientes(q) {
    return aprobarCompras.buscarPendientes(q);
}

async function buscarAprobadas(q) {
    return aprobarCompras.buscarAprobadas(q);
}

async function buscarRechazadas(q) {
    return aprobarCompras.buscarRechazadas(q);
}

async function cambiarEstado(compraId, estado, motivo, auditCtx) {
    return aprobarCompras.cambiarEstado(compraId, estado, motivo, auditCtx);
}

module.exports = {
    listarPendientes, listarAprobadas, listarRechazadas,
    buscarPendientes, buscarAprobadas, buscarRechazadas,
    cambiarEstado,
};
