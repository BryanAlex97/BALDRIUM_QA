const pool = require('./db');

async function registrarSistema({
    cedulaTrabajador,
    nombreTrabajador,
    tipoAccion,
    tablaAfectada    = null,
    registroAfectadoID = null,
    valorAnterior    = null,
    valorNuevo       = null,
    direccionIP      = null,
    dispositivo      = null,
    resultado        = 'EXITOSO',
    descripcion      = null,
}) {
    try {
        await pool.execute(
            `INSERT INTO auditoria_sistema
             (CedulaTrabajador, NombreTrabajador, TipoAccion, TablaAfectada, RegistroAfectadoID,
              ValorAnterior, ValorNuevo, DireccionIP, Dispositivo, Resultado, Descripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cedulaTrabajador, nombreTrabajador, tipoAccion,
                tablaAfectada, registroAfectadoID,
                valorAnterior ? JSON.stringify(valorAnterior) : null,
                valorNuevo    ? JSON.stringify(valorNuevo)    : null,
                direccionIP, dispositivo, resultado, descripcion,
            ]
        );
    } catch (err) {
        console.error('[Auditoría Sistema] Error al registrar:', err.message);
    }
}

async function registrarInventario({
    inventarioID, nombreProducto, cedulaResponsable, nombreResponsable,
    tipoMovimiento, cantidadAnterior, cantidadMovimiento, cantidadPosterior,
    valorUnitario, motivo,
    referenciaID    = null,
    tablaReferencia = null,
    observaciones   = null,
}) {
    try {
        await pool.execute(
            `INSERT INTO auditoria_inventario
             (InventarioID, NombreProducto, CedulaResponsable, NombreResponsable,
              TipoMovimiento, CantidadAnterior, CantidadMovimiento, CantidadPosterior,
              ValorUnitario, Motivo, ReferenciaID, TablaReferencia, Observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                inventarioID, nombreProducto, cedulaResponsable, nombreResponsable,
                tipoMovimiento, cantidadAnterior, cantidadMovimiento, cantidadPosterior,
                valorUnitario, motivo, referenciaID, tablaReferencia, observaciones,
            ]
        );
    } catch (err) {
        console.error('[Auditoría Inventario] Error al registrar:', err.message);
    }
}

async function listarInventario(limite = 400) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 400, 1), 1000);
    const [rows] = await pool.query(
        `SELECT ID, InventarioID, NombreProducto, CedulaResponsable, NombreResponsable,
                TipoMovimiento, CantidadAnterior, CantidadMovimiento, CantidadPosterior,
                ValorUnitario, Motivo, ReferenciaID, TablaReferencia, Observaciones, FechaHora
         FROM auditoria_inventario
         ORDER BY FechaHora DESC
         LIMIT ?`,
        [lim]
    );
    return rows;
}

async function listarSistema(limite = 400) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 400, 1), 1000);
    const [rows] = await pool.query(
        `SELECT ID, CedulaTrabajador, NombreTrabajador, TipoAccion, TablaAfectada,
                ValorAnterior, ValorNuevo, DireccionIP, Dispositivo, Resultado, Descripcion, FechaHora
         FROM auditoria_sistema
         WHERE TablaAfectada != 'inventario' OR TablaAfectada IS NULL
         ORDER BY FechaHora DESC
         LIMIT ?`,
        [lim]
    );
    return rows;
}

async function listarSistemaInventario(limite = 400) {
    const lim = Math.min(Math.max(parseInt(limite, 10) || 400, 1), 1000);
    const [rows] = await pool.query(
        `SELECT ID, CedulaTrabajador AS CedulaResponsable, NombreTrabajador AS NombreResponsable,
                TipoAccion, Descripcion, ValorAnterior, ValorNuevo, DireccionIP, Dispositivo,
                Resultado, FechaHora, RegistroAfectadoID
         FROM auditoria_sistema
         WHERE TablaAfectada = 'inventario'
         ORDER BY FechaHora DESC
         LIMIT ?`,
        [lim]
    );
    return rows;
}

module.exports = { registrarSistema, registrarInventario, listarSistema, listarInventario, listarSistemaInventario };
