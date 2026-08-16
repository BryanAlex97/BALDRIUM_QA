const pool = require('./db');
const auditRepo = require('./auditoriaRepositorio');

// ─── Parámetros (Director) ─────────────────────────────────────────────────

async function obtenerParametros() {
    const [[row]] = await pool.query(
        'SELECT ValorMinimoCompra, MinimoReferidosVisitados, ValorMinimoCompraReferido, FechaActualizacion FROM parametro_beneficio WHERE ID = 1'
    );
    return row;
}

async function actualizarParametros(valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx = {}) {
    if (valorMinimoCompra === undefined || valorMinimoCompra === null || Number(valorMinimoCompra) < 0) {
        throw new Error('El valor mínimo de compra es obligatorio y debe ser un número positivo');
    }
    if (minimoReferidosVisitados === undefined || minimoReferidosVisitados === null || Number(minimoReferidosVisitados) < 0) {
        throw new Error('El mínimo de referidos visitados es obligatorio y debe ser un número positivo');
    }
    if (valorMinimoCompraReferido === undefined || valorMinimoCompraReferido === null || Number(valorMinimoCompraReferido) < 0) {
        throw new Error('El valor mínimo de compra del referido es obligatorio y debe ser un número positivo');
    }

    const antes = await obtenerParametros();
    const valorMinimoCompraNum = Number(valorMinimoCompra);
    const minimoReferidosVisitadosNum = Number(minimoReferidosVisitados);
    const valorMinimoCompraReferidoNum = Number(valorMinimoCompraReferido);

    await pool.query(
        `UPDATE parametro_beneficio
         SET ValorMinimoCompra = ?, MinimoReferidosVisitados = ?, ValorMinimoCompraReferido = ?, FechaActualizacion = NOW()
         WHERE ID = 1`,
        [valorMinimoCompraNum, minimoReferidosVisitadosNum, valorMinimoCompraReferidoNum]
    );

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'EDITAR',
        tablaAfectada:      'parametro_beneficio',
        registroAfectadoID: 1,
        valorAnterior:      antes,
        valorNuevo:         {
            ValorMinimoCompra: valorMinimoCompraNum,
            MinimoReferidosVisitados: minimoReferidosVisitadosNum,
            ValorMinimoCompraReferido: valorMinimoCompraReferidoNum,
        },
        descripcion:        'Parámetros del beneficio 4x14 actualizados',
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Parámetros Beneficio]', err.message));

    return {
        ValorMinimoCompra: valorMinimoCompraNum,
        MinimoReferidosVisitados: minimoReferidosVisitadosNum,
        ValorMinimoCompraReferido: valorMinimoCompraReferidoNum,
    };
}

// ─── Compras elegibles (Telemercader) ──────────────────────────────────────

const DIAS_VIGENCIA_BENEFICIO = 15;

// Compras candidatas a un beneficio: dentro de los últimos 15 días desde que se
// crearon, sin ningún beneficio ya creado (en cualquier estado — Revision,
// Aceptado o Rechazado ya cuentan como "resueltas" y dejan de mostrarse aquí), y
// con al menos un referido visitado que ya se haya convertido en cliente y haya
// hecho su propia compra (también dentro de los últimos 15 días) por un monto
// mínimo (ValorMinimoCompraReferido).
const _comprasElegiblesSql = `
    SELECT
        co.ID, co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra,
        co.FechaCompra, co.EstadoCompra,
        COUNT(DISTINCT CASE WHEN v.Estado = 'Visitado' THEN cp.ID END) AS ReferidosVisitados,
        COUNT(DISTINCT cp.ID) AS TotalReferidos
    FROM compra co
    JOIN cliente cli ON cli.Cedula = co.CedulaCliente
    JOIN comprareferido cr ON cr.CompraID = co.ID
    JOIN clienteprospecto cp ON cp.ID = cr.ClienteProspectoID
    LEFT JOIN visita v ON v.PersonaID = cp.PersonaID
    WHERE co.TotalCompra >= ?
      AND co.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
      AND NOT EXISTS (SELECT 1 FROM beneficio b WHERE b.CompraID = co.ID)
      AND EXISTS (
        SELECT 1
        FROM comprareferido cr2
        JOIN clienteprospecto cp2 ON cp2.ID = cr2.ClienteProspectoID
        JOIN visita v2   ON v2.PersonaID = cp2.PersonaID AND v2.Estado = 'Visitado'
        JOIN cliente cli2 ON cli2.PersonaID = cp2.PersonaID
        JOIN compra co2  ON co2.CedulaCliente = cli2.Cedula
                         AND co2.TotalCompra >= ?
                         AND co2.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
        WHERE cr2.CompraID = co.ID
      )
    GROUP BY co.ID
    HAVING ReferidosVisitados >= ?
    ORDER BY co.FechaCompra DESC
`;

async function listarComprasElegibles() {
    const params = await obtenerParametros();
    const [rows] = await pool.query(
        _comprasElegiblesSql,
        [
            params.ValorMinimoCompra, DIAS_VIGENCIA_BENEFICIO,
            params.ValorMinimoCompraReferido, DIAS_VIGENCIA_BENEFICIO,
            params.MinimoReferidosVisitados,
        ]
    );
    return rows;
}

// Detalle de los referidos de una compra, para que Telemercader vea a cada persona
// individualmente (no solo el conteo agregado). Sin montos: "Compro" es un simple
// sí/no que ya viene evaluado contra el mínimo del Director — el umbral en sí no
// se expone aquí, solo el resultado.
async function listarReferidosDeCompra(compraId) {
    const params = await obtenerParametros();
    const [rows] = await pool.query(
        `SELECT
            cp.ID, cp.Nombre, cp.Celular, cp.Direccion,
            CASE WHEN v.Estado = 'Visitado' THEN 'Visitado' ELSE cp.Estado END AS Estado,
            EXISTS (
                SELECT 1
                FROM cliente cli2
                JOIN compra co2 ON co2.CedulaCliente = cli2.Cedula
                WHERE cli2.PersonaID = cp.PersonaID
                  AND co2.TotalCompra >= ?
                  AND co2.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
            ) AS Compro
         FROM comprareferido cr
         JOIN clienteprospecto cp ON cp.ID = cr.ClienteProspectoID
         LEFT JOIN visita v ON v.PersonaID = cp.PersonaID AND v.Estado = 'Visitado'
         WHERE cr.CompraID = ?
         ORDER BY cp.Nombre ASC`,
        [params.ValorMinimoCompraReferido, DIAS_VIGENCIA_BENEFICIO, compraId]
    );
    return rows.map(r => ({ ...r, Compro: !!r.Compro }));
}

// Recalcula la elegibilidad de UNA compra puntual contra los parámetros actuales (para validar al crear)
async function _compraSigueCalificando(compraId) {
    const params = await obtenerParametros();
    const [[compra]] = await pool.query(
        `SELECT co.ID, co.TotalCompra, co.FechaCompra,
           COUNT(DISTINCT CASE WHEN v.Estado = 'Visitado' THEN cp.ID END) AS ReferidosVisitados
         FROM compra co
         LEFT JOIN comprareferido cr ON cr.CompraID = co.ID
         LEFT JOIN clienteprospecto cp ON cp.ID = cr.ClienteProspectoID
         LEFT JOIN visita v ON v.PersonaID = cp.PersonaID
         WHERE co.ID = ?
         GROUP BY co.ID`,
        [compraId]
    );
    if (!compra) throw new Error('Compra no encontrada');

    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_VIGENCIA_BENEFICIO);
    if (new Date(compra.FechaCompra) < limite) {
        throw new Error(`Esta compra ya superó el plazo máximo de ${DIAS_VIGENCIA_BENEFICIO} días para aplicar al beneficio`);
    }

    if (Number(compra.TotalCompra) < Number(params.ValorMinimoCompra) || compra.ReferidosVisitados < params.MinimoReferidosVisitados) {
        throw new Error('Esta compra no cumple (o dejó de cumplir) los parámetros actuales del beneficio');
    }

    const [[{ tieneReferidoComprador }]] = await pool.query(
        `SELECT EXISTS (
            SELECT 1
            FROM comprareferido cr2
            JOIN clienteprospecto cp2 ON cp2.ID = cr2.ClienteProspectoID
            JOIN visita v2   ON v2.PersonaID = cp2.PersonaID AND v2.Estado = 'Visitado'
            JOIN cliente cli2 ON cli2.PersonaID = cp2.PersonaID
            JOIN compra co2  ON co2.CedulaCliente = cli2.Cedula
                             AND co2.TotalCompra >= ?
                             AND co2.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
            WHERE cr2.CompraID = ?
         ) AS tieneReferidoComprador`,
        [params.ValorMinimoCompraReferido, DIAS_VIGENCIA_BENEFICIO, compraId]
    );
    if (!tieneReferidoComprador) {
        throw new Error('Ningún referido visitado se ha convertido en cliente con una compra propia que cumpla el mínimo requerido');
    }

    return compra;
}

// Crea el beneficio para una compra elegible: NO elige producto todavía —
// eso lo decide Auxiliar Administrativo al aprobar. Queda en 'Revision'.
async function crearBeneficio(compraId, auditCtx = {}) {
    if (!compraId) throw new Error('La compra es obligatoria');

    await _compraSigueCalificando(compraId);

    const [[existente]] = await pool.query(
        `SELECT ID FROM beneficio WHERE CompraID = ? LIMIT 1`,
        [compraId]
    );
    if (existente) throw new Error('Esta compra ya tiene un beneficio creado');

    const [result] = await pool.query(
        `INSERT INTO beneficio (CompraID, InventarioID, EstadoBeneficio) VALUES (?, NULL, 'Revision')`,
        [compraId]
    );
    const beneficioId = result.insertId;

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'CREAR',
        tablaAfectada:      'beneficio',
        registroAfectadoID: beneficioId,
        valorAnterior:      null,
        valorNuevo:         { compraId, estado: 'Revision' },
        descripcion:        `Beneficio creado para la compra #${compraId}; queda en Revisión (Auxiliar Administrativo elige el producto al aprobar)`,
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Crear Beneficio]', err.message));

    return { beneficioId, compraId, estado: 'Revision' };
}

// ─── Revisión (Auxiliar Administrativo) ────────────────────────────────────

async function listarEnRevision() {
    const [rows] = await pool.query(
        `SELECT b.ID, b.CompraID, b.InventarioID, b.EstadoBeneficio,
           co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra, co.FechaCompra, co.EstadoCompra,
           inv.Nombre AS NombreProducto
         FROM beneficio b
         JOIN compra co ON co.ID = b.CompraID
         JOIN cliente cli ON cli.Cedula = co.CedulaCliente
         LEFT JOIN inventario inv ON inv.ID = b.InventarioID
         WHERE b.EstadoBeneficio = 'Revision'
           AND co.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
         ORDER BY b.ID DESC`,
        [DIAS_VIGENCIA_BENEFICIO]
    );
    return rows;
}

// Búsqueda en revisión SIN restricción de tiempo (a diferencia de listarEnRevision,
// que solo muestra compras dentro de los 15 días de vigencia del beneficio)
async function buscarEnRevision(q) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
        `SELECT b.ID, b.CompraID, b.InventarioID, b.EstadoBeneficio,
           co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra, co.FechaCompra, co.EstadoCompra,
           inv.Nombre AS NombreProducto
         FROM beneficio b
         JOIN compra co ON co.ID = b.CompraID
         JOIN cliente cli ON cli.Cedula = co.CedulaCliente
         LEFT JOIN inventario inv ON inv.ID = b.InventarioID
         WHERE b.EstadoBeneficio = 'Revision'
           AND (
             CAST(b.ID AS CHAR) LIKE ?
             OR co.CedulaCliente LIKE ?
             OR cli.Nombre LIKE ?
             OR DATE_FORMAT(co.FechaCompra, '%d/%m/%Y') LIKE ?
           )
         ORDER BY b.ID DESC`,
        [like, like, like, like]
    );
    return rows;
}

// Detalle de los referidos de una compra para Auxiliar Administrativo: a diferencia
// de listarReferidosDeCompra (Telemercader), aquí sí se muestra la compra propia
// completa de cada referido (monto, estado y fecha), no solo un sí/no.
async function listarReferidosDeCompraDetallado(compraId) {
    const [rows] = await pool.query(
        `SELECT
            cp.ID, cp.Nombre, cp.Celular, cp.Direccion,
            CASE WHEN v.Estado = 'Visitado' THEN 'Visitado' ELSE cp.Estado END AS Estado,
            co2.ID AS CompraPropiaID,
            co2.TotalCompra AS CompraPropiaTotal,
            co2.EstadoCompra AS CompraPropiaEstado,
            co2.FechaCompra AS CompraPropiaFecha
         FROM comprareferido cr
         JOIN clienteprospecto cp ON cp.ID = cr.ClienteProspectoID
         LEFT JOIN visita v   ON v.PersonaID = cp.PersonaID AND v.Estado = 'Visitado'
         LEFT JOIN cliente cli2 ON cli2.PersonaID = cp.PersonaID
         LEFT JOIN compra co2   ON co2.CedulaCliente = cli2.Cedula
         WHERE cr.CompraID = ?
         ORDER BY cp.Nombre ASC, co2.FechaCompra DESC`,
        [compraId]
    );
    return rows;
}

// Productos que Auxiliar Administrativo puede otorgar como beneficio:
// solo inventario de Tipo = 'Beneficio', activo y con existencias.
async function listarProductosDisponibles() {
    const [rows] = await pool.query(
        `SELECT ID, Nombre, Valor, Cantidad
         FROM inventario
         WHERE Tipo = 'Beneficio' AND Activo = 1 AND Cantidad > 0
         ORDER BY Nombre ASC`
    );
    return rows;
}

const ESTADOS_REVISION = ['Aceptado', 'Rechazado'];

// Construye la nota nueva de la compra: conserva TODO lo que ya tenía y solo
// agrega la razón de entrega/negación del beneficio al final.
function _agregarMotivoANotas(notasActuales, nuevoEstado, motivo) {
    const linea = `[Beneficio ${nuevoEstado}] ${motivo}`;
    return notasActuales && notasActuales.trim() ? `${notasActuales}\n${linea}` : linea;
}

// Aceptar exige inventarioId (debe ser Tipo='Beneficio', activo y con stock) y descuenta
// una unidad del inventario, dejando registro en auditoria_inventario. Rechazar no toca
// inventario. En ambos casos: exige un motivo, que se guarda en el beneficio
// (MotivoResolucion/FechaResolucion) y ADEMÁS se agrega al final de las notas de la
// compra original, sin borrar las notas que ya existían.
async function cambiarEstadoBeneficio(beneficioId, nuevoEstado, inventarioId, motivo, auditCtx = {}) {
    if (!ESTADOS_REVISION.includes(nuevoEstado)) {
        throw new Error(`Estado inválido. Desde revisión solo se permite: ${ESTADOS_REVISION.join(', ')}.`);
    }
    if (!motivo || !motivo.trim()) {
        throw new Error('El motivo de la aprobación o el rechazo es obligatorio');
    }
    const motivoTrim = motivo.trim();

    const [[antes]] = await pool.query(
        `SELECT b.EstadoBeneficio, b.CompraID, co.Notas AS NotasCompra
         FROM beneficio b JOIN compra co ON co.ID = b.CompraID
         WHERE b.ID = ?`,
        [beneficioId]
    );
    if (!antes) throw new Error('Beneficio no encontrado');
    if (antes.EstadoBeneficio !== 'Revision') {
        throw new Error(`Este beneficio ya está en estado "${antes.EstadoBeneficio}", no está en revisión`);
    }

    const actor = auditCtx.actor ?? {};
    const notaNueva = _agregarMotivoANotas(antes.NotasCompra, nuevoEstado, motivoTrim);

    if (nuevoEstado === 'Rechazado') {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query(
                'UPDATE beneficio SET EstadoBeneficio = ?, MotivoResolucion = ?, FechaResolucion = NOW() WHERE ID = ?',
                [nuevoEstado, motivoTrim, beneficioId]
            );
            await conn.query('UPDATE compra SET Notas = ? WHERE ID = ?', [notaNueva, antes.CompraID]);
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CAMBIO_ESTADO',
            tablaAfectada:      'beneficio',
            registroAfectadoID: beneficioId,
            valorAnterior:      { estado: antes.EstadoBeneficio },
            valorNuevo:         { estado: nuevoEstado, motivo: motivoTrim },
            descripcion:        `Beneficio #${beneficioId} (compra #${antes.CompraID}) pasó a "${nuevoEstado}". Motivo: ${motivoTrim}`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Estado Beneficio]', err.message));
        return;
    }

    // Aceptado: exige producto de Tipo='Beneficio' con stock, lo descuenta y deja el registro.
    if (!inventarioId) throw new Error('Debes elegir el producto que se otorga como beneficio');

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[producto]] = await conn.query(
            `SELECT ID, Nombre, Tipo, Cantidad, Valor FROM inventario WHERE ID = ? FOR UPDATE`,
            [inventarioId]
        );
        if (!producto) throw new Error('Producto no encontrado');
        if (producto.Tipo !== 'Beneficio') throw new Error('Solo se puede otorgar inventario de tipo "Beneficio"');
        if (producto.Cantidad <= 0) throw new Error(`"${producto.Nombre}" no tiene existencias disponibles`);

        const cantidadAnterior  = producto.Cantidad;
        const cantidadPosterior = cantidadAnterior - 1;

        await conn.query('UPDATE inventario SET Cantidad = ? WHERE ID = ?', [cantidadPosterior, inventarioId]);
        await conn.query(
            'UPDATE beneficio SET EstadoBeneficio = ?, InventarioID = ?, MotivoResolucion = ?, FechaResolucion = NOW() WHERE ID = ?',
            [nuevoEstado, inventarioId, motivoTrim, beneficioId]
        );
        await conn.query('UPDATE compra SET Notas = ? WHERE ID = ?', [notaNueva, antes.CompraID]);

        await conn.commit();

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CAMBIO_ESTADO',
            tablaAfectada:      'beneficio',
            registroAfectadoID: beneficioId,
            valorAnterior:      { estado: antes.EstadoBeneficio },
            valorNuevo:         { estado: nuevoEstado, inventarioId, producto: producto.Nombre, motivo: motivoTrim },
            descripcion:        `Beneficio #${beneficioId} (compra #${antes.CompraID}) pasó a "${nuevoEstado}"; se otorgó "${producto.Nombre}". Motivo: ${motivoTrim}`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Estado Beneficio]', err.message));

        auditRepo.registrarInventario({
            inventarioID:       inventarioId,
            nombreProducto:     producto.Nombre,
            cedulaResponsable:  actor.cedula ?? null,
            nombreResponsable:  actor.nombre ?? null,
            tipoMovimiento:     'SALIDA',
            cantidadAnterior,
            cantidadMovimiento: 1,
            cantidadPosterior,
            valorUnitario:      producto.Valor,
            motivo:             'BENEFICIO',
            referenciaID:       beneficioId,
            tablaReferencia:    'beneficio',
            observaciones:      `Beneficio otorgado por la compra #${antes.CompraID}`,
        }).catch(err => console.error('[Auditoría Inventario Beneficio]', err.message));
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

// ─── Aprobados / Rechazados recientes (Auxiliar Administrativo) ───────────
// Ventana rodante de 30 días (no mes calendario): evita que algo resuelto el
// día 30 desaparezca de golpe el día 1 solo porque cambió el mes.

const DIAS_HISTORIAL_RESOLUCION = 30;

async function listarAprobadosRecientes(dias = DIAS_HISTORIAL_RESOLUCION) {
    const [rows] = await pool.query(
        `SELECT b.ID, b.CompraID, b.InventarioID, b.EstadoBeneficio, b.MotivoResolucion, b.FechaResolucion,
           co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra, co.FechaCompra, co.EstadoCompra,
           inv.Nombre AS NombreProducto
         FROM beneficio b
         JOIN compra co ON co.ID = b.CompraID
         JOIN cliente cli ON cli.Cedula = co.CedulaCliente
         LEFT JOIN inventario inv ON inv.ID = b.InventarioID
         WHERE b.EstadoBeneficio = 'Aceptado'
           AND b.FechaResolucion >= (NOW() - INTERVAL ? DAY)
         ORDER BY b.FechaResolucion DESC`,
        [dias]
    );
    return rows;
}

async function listarRechazadosRecientes(dias = DIAS_HISTORIAL_RESOLUCION) {
    const [rows] = await pool.query(
        `SELECT b.ID, b.CompraID, b.EstadoBeneficio, b.MotivoResolucion, b.FechaResolucion,
           co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra, co.FechaCompra, co.EstadoCompra
         FROM beneficio b
         JOIN compra co ON co.ID = b.CompraID
         JOIN cliente cli ON cli.Cedula = co.CedulaCliente
         WHERE b.EstadoBeneficio = 'Rechazado'
           AND b.FechaResolucion >= (NOW() - INTERVAL ? DAY)
         ORDER BY b.FechaResolucion DESC`,
        [dias]
    );
    return rows;
}

// Búsquedas SIN restricción de tiempo (ignoran la ventana de 30 días de aprobados/rechazados-recientes)
async function buscarAprobadosRecientes(q) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
        `SELECT b.ID, b.CompraID, b.InventarioID, b.EstadoBeneficio, b.MotivoResolucion, b.FechaResolucion,
           co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra, co.FechaCompra, co.EstadoCompra,
           inv.Nombre AS NombreProducto
         FROM beneficio b
         JOIN compra co ON co.ID = b.CompraID
         JOIN cliente cli ON cli.Cedula = co.CedulaCliente
         LEFT JOIN inventario inv ON inv.ID = b.InventarioID
         WHERE b.EstadoBeneficio = 'Aceptado'
           AND (
             CAST(b.ID AS CHAR) LIKE ?
             OR co.CedulaCliente LIKE ?
             OR cli.Nombre LIKE ?
             OR DATE_FORMAT(co.FechaCompra, '%d/%m/%Y') LIKE ?
             OR b.MotivoResolucion LIKE ?
             OR inv.Nombre LIKE ?
           )
         ORDER BY b.FechaResolucion DESC`,
        [like, like, like, like, like, like]
    );
    return rows;
}

async function buscarRechazadosRecientes(q) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
        `SELECT b.ID, b.CompraID, b.EstadoBeneficio, b.MotivoResolucion, b.FechaResolucion,
           co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra, co.FechaCompra, co.EstadoCompra
         FROM beneficio b
         JOIN compra co ON co.ID = b.CompraID
         JOIN cliente cli ON cli.Cedula = co.CedulaCliente
         WHERE b.EstadoBeneficio = 'Rechazado'
           AND (
             CAST(b.ID AS CHAR) LIKE ?
             OR co.CedulaCliente LIKE ?
             OR cli.Nombre LIKE ?
             OR DATE_FORMAT(co.FechaCompra, '%d/%m/%Y') LIKE ?
             OR b.MotivoResolucion LIKE ?
           )
         ORDER BY b.FechaResolucion DESC`,
        [like, like, like, like, like]
    );
    return rows;
}

async function kpiBeneficiosRecientes(dias = DIAS_HISTORIAL_RESOLUCION) {
    const [[row]] = await pool.query(
        `SELECT
           SUM(CASE WHEN EstadoBeneficio = 'Aceptado'  THEN 1 ELSE 0 END) AS TotalAprobados,
           SUM(CASE WHEN EstadoBeneficio = 'Rechazado' THEN 1 ELSE 0 END) AS TotalRechazados
         FROM beneficio
         WHERE EstadoBeneficio IN ('Aceptado', 'Rechazado')
           AND FechaResolucion >= (NOW() - INTERVAL ? DAY)`,
        [dias]
    );
    return {
        TotalAprobados: row.TotalAprobados || 0,
        TotalRechazados: row.TotalRechazados || 0,
    };
}

module.exports = {
    obtenerParametros, actualizarParametros, listarComprasElegibles, listarReferidosDeCompra,
    crearBeneficio, listarEnRevision, listarReferidosDeCompraDetallado, listarProductosDisponibles, cambiarEstadoBeneficio,
    listarAprobadosRecientes, listarRechazadosRecientes, kpiBeneficiosRecientes,
    buscarEnRevision, buscarAprobadosRecientes, buscarRechazadosRecientes,
};
