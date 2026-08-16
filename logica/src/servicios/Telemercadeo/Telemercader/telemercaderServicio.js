const { prospecto, visita, trabajador, beneficio } = require('../../../infraestructura/persistenciaCliente');

async function listarPendientes() {
    return prospecto.listarPendientes();
}

async function listarEnGestion() {
    return prospecto.listarEnGestion();
}

async function buscarPendientes(q) {
    return prospecto.buscarPendientes(q);
}

async function buscarEnGestion(q) {
    return prospecto.buscarEnGestion(q);
}

async function agendarVisita(prospectoId, datos, auditCtx) {
    return prospecto.agendarVisita(prospectoId, datos, auditCtx);
}

async function cambiarEstadoProspecto(prospectoId, estado, auditCtx) {
    return prospecto.cambiarEstado(prospectoId, estado, auditCtx);
}

async function crearProspectoYAgendar(datos, auditCtx) {
    return prospecto.crearYAgendar(datos, auditCtx);
}

async function listarAsesoresComerciales() {
    const trabajadores = await trabajador.listarTodosConRoles();
    return trabajadores
        .filter(t => t.activo && t.roles.some(r => r.nombre === 'Asesor comercial'))
        .map(t => ({ cedula: t.cedula, nombre: t.nombre }));
}

function _semanaActual() {
    const hoy = new Date();
    const dia = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
        inicio: lunes.toISOString().split('T')[0],
        fin:    domingo.toISOString().split('T')[0],
    };
}

async function listarVisitasSemanaVisitadas() {
    const { inicio, fin } = _semanaActual();
    return visita.listarSemanaVisitadas(inicio, fin);
}

async function listarVisitasSemanaPorGestionar() {
    const { inicio, fin } = _semanaActual();
    return visita.listarSemanaPorGestionar(inicio, fin);
}

async function obtenerDetalleVisita(visitaId) {
    return visita.obtenerDetalle(visitaId);
}

async function editarVisita(visitaId, datos, auditCtx) {
    return visita.editar(visitaId, datos, auditCtx);
}

async function cancelarVisita(visitaId, motivo, auditCtx) {
    return visita.cancelar(visitaId, motivo, auditCtx);
}

async function cambiarEstadoVisita(visitaId, estado, notas, auditCtx) {
    return visita.cambiarEstadoTelemercader(visitaId, estado, notas, auditCtx);
}

async function listarVisitasFallidas() {
    return visita.listarFallidas();
}

async function kpiVisitasFallidas() {
    return visita.kpiVisitasFallidas();
}

async function buscarVisitasVisitadas(q) {
    return visita.buscarVisitadas(q);
}

async function buscarVisitasPorGestionar(q) {
    return visita.buscarPorGestionar(q);
}

async function buscarVisitasFallidas(q) {
    return visita.buscarFallidas(q);
}

async function listarComprasElegiblesBeneficio() {
    return beneficio.listarComprasElegibles();
}

async function crearBeneficio(compraId, auditCtx) {
    return beneficio.crear(compraId, auditCtx);
}

async function listarReferidosDeCompraBeneficio(compraId) {
    return beneficio.listarReferidosDeCompra(compraId);
}

module.exports = {
    listarPendientes, listarEnGestion, buscarPendientes, buscarEnGestion,
    agendarVisita, cambiarEstadoProspecto, crearProspectoYAgendar, listarAsesoresComerciales,
    listarVisitasSemanaVisitadas, listarVisitasSemanaPorGestionar,
    obtenerDetalleVisita, editarVisita, cancelarVisita, cambiarEstadoVisita,
    listarVisitasFallidas, kpiVisitasFallidas,
    buscarVisitasVisitadas, buscarVisitasPorGestionar, buscarVisitasFallidas,
    listarComprasElegiblesBeneficio, crearBeneficio, listarReferidosDeCompraBeneficio,
};
