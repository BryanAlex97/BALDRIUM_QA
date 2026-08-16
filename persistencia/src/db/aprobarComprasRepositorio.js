const pool = require('./db');
const auditRepo = require('./auditoriaRepositorio');

const DIAS_HISTORIAL_COMPRAS = 30;

const _comprasBase = `
  SELECT
    co.ID, co.FechaCompra, co.TotalCompra, co.EstadoCompra, co.FormaPago, co.Notas, co.MotivoResolucion,
    co.CedulaCliente, cli.Nombre AS NombreCliente,
    co.CedulaTrabajador, tr.Nombre AS NombreTrabajador,
    GROUP_CONCAT(DISTINCT inv.Nombre ORDER BY inv.Nombre SEPARATOR ', ') AS Productos
  FROM compra co
  JOIN cliente cli ON cli.Cedula = co.CedulaCliente
  LEFT JOIN trabajador tr ON tr.Cedula = co.CedulaTrabajador
  LEFT JOIN compra_inventario ci ON ci.CompraID = co.ID
  LEFT JOIN inventario inv ON inv.ID = ci.InventarioID
`;

// Pendientes: prioriza las que llevan más tiempo esperando (FechaCompra ASC = la más vieja primero)
async function listarPendientes(dias = DIAS_HISTORIAL_COMPRAS) {
    const [rows] = await pool.query(
        `${_comprasBase}
         WHERE co.EstadoCompra = 'Pendiente'
           AND co.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
         GROUP BY co.ID ORDER BY co.FechaCompra ASC`,
        [dias]
    );
    return rows;
}

async function listarAprobadas(dias = DIAS_HISTORIAL_COMPRAS) {
    const [rows] = await pool.query(
        `${_comprasBase}
         WHERE co.EstadoCompra = 'Confirmado'
           AND co.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
         GROUP BY co.ID ORDER BY co.FechaCompra DESC`,
        [dias]
    );
    return rows;
}

async function listarRechazadas(dias = DIAS_HISTORIAL_COMPRAS) {
    const [rows] = await pool.query(
        `${_comprasBase}
         WHERE co.EstadoCompra = 'Rechazado'
           AND co.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
         GROUP BY co.ID ORDER BY co.FechaCompra DESC`,
        [dias]
    );
    return rows;
}

// Búsqueda por estado, SIN restricción de tiempo (puede encontrar cualquier compra, sin importar la fecha)
async function _buscarPorEstado(estado, q, orden) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
        `${_comprasBase}
         WHERE co.EstadoCompra = ?
           AND (
             CAST(co.ID AS CHAR) LIKE ?
             OR co.CedulaCliente LIKE ?
             OR cli.Nombre LIKE ?
             OR co.CedulaTrabajador LIKE ?
             OR tr.Nombre LIKE ?
             OR DATE_FORMAT(co.FechaCompra, '%d/%m/%Y') LIKE ?
             OR co.Notas LIKE ?
             OR EXISTS (
               SELECT 1 FROM compra_inventario ci2
               JOIN inventario inv2 ON inv2.ID = ci2.InventarioID
               WHERE ci2.CompraID = co.ID AND inv2.Nombre LIKE ?
             )
           )
         GROUP BY co.ID ORDER BY co.FechaCompra ${orden}`,
        [estado, like, like, like, like, like, like, like, like]
    );
    return rows;
}

async function buscarPendientes(q) {
    return _buscarPorEstado('Pendiente', q, 'ASC');
}

async function buscarAprobadas(q) {
    return _buscarPorEstado('Confirmado', q, 'DESC');
}

async function buscarRechazadas(q) {
    return _buscarPorEstado('Rechazado', q, 'DESC');
}

const ESTADOS_RESOLUCION = ['Confirmado', 'Rechazado'];

// Conserva TODO lo que ya tenía la nota y solo agrega la razón de aprobación/rechazo al final
function _agregarMotivoANotas(notasActuales, nuevoEstado, motivo) {
    const linea = `[Compra ${nuevoEstado}] ${motivo}`;
    return notasActuales && notasActuales.trim() ? `${notasActuales}\n${linea}` : linea;
}

// Aprobar (Confirmado) o rechazar una compra pendiente. Exige motivo en ambos casos,
// que se guarda estructurado en compra.MotivoResolucion y además se agrega al final
// de las Notas existentes, sin borrar lo que ya había.
async function cambiarEstadoCompra(compraId, nuevoEstado, motivo, auditCtx = {}) {
    if (!ESTADOS_RESOLUCION.includes(nuevoEstado)) {
        throw new Error(`Estado inválido. Solo se permite: ${ESTADOS_RESOLUCION.join(', ')}.`);
    }
    if (!motivo || !motivo.trim()) {
        throw new Error('El motivo de la aprobación o el rechazo es obligatorio');
    }
    const motivoTrim = motivo.trim();

    const [[antes]] = await pool.query(
        `SELECT EstadoCompra, Notas FROM compra WHERE ID = ?`,
        [compraId]
    );
    if (!antes) throw new Error('Compra no encontrada');
    if (antes.EstadoCompra !== 'Pendiente') {
        throw new Error(`Esta compra ya está en estado "${antes.EstadoCompra}", no está pendiente`);
    }

    const notaNueva = _agregarMotivoANotas(antes.Notas, nuevoEstado, motivoTrim);

    await pool.query(
        `UPDATE compra SET EstadoCompra = ?, MotivoResolucion = ?, Notas = ? WHERE ID = ?`,
        [nuevoEstado, motivoTrim, notaNueva, compraId]
    );

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'CAMBIO_ESTADO',
        tablaAfectada:      'compra',
        registroAfectadoID: compraId,
        valorAnterior:      { estado: antes.EstadoCompra },
        valorNuevo:         { estado: nuevoEstado, motivo: motivoTrim },
        descripcion:        `Compra #${compraId} pasó a "${nuevoEstado}". Motivo: ${motivoTrim}`,
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Estado Compra]', err.message));
}

module.exports = {
    listarPendientes, listarAprobadas, listarRechazadas,
    buscarPendientes, buscarAprobadas, buscarRechazadas,
    cambiarEstadoCompra,
};
