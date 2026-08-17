const pool = require('./db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function buscarPorCedula(cedula) {
    const sql = `
        SELECT
            t.Cedula, t.Contrasena, t.Nombre, t.Celular, t.Telefono,
            t.CorreoElectronico, t.Direccion, t.CodigoTrabajador, t.Activo,
            t.RequiereCambioContrasena,
            r.ID      AS rolId,
            r.TipoRol AS tipoRol
        FROM trabajador t
        LEFT JOIN rol_trabajador rt ON t.Cedula = rt.CedulaTrabajador
        LEFT JOIN rol r             ON rt.RolID  = r.ID
        WHERE t.Cedula = ?
    `;
    const [rows] = await pool.execute(sql, [cedula]);
    if (!rows || rows.length === 0) return null;

    const { Cedula, Contrasena, Nombre, Celular, Telefono,
        CorreoElectronico, Direccion, CodigoTrabajador, Activo, RequiereCambioContrasena } = rows[0];

    const roles = rows
        .filter(row => row.tipoRol !== null)
        .map(row => row.tipoRol);

    return {
        trabajador: {
            Cedula, Contrasena, Nombre, Celular, Telefono,
            CorreoElectronico, Direccion, CodigoTrabajador, Activo, RequiereCambioContrasena
        },
        roles
    };
}

async function crearTrabajador(datos, rolesIds = []) {
    const { Cedula, Contrasena, Nombre, Celular, Telefono,
        CorreoElectronico, Direccion, CodigoTrabajador } = datos;

    const hash = await bcrypt.hash(Contrasena, SALT_ROUNDS);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(
            `INSERT INTO trabajador
                (Cedula, Contrasena, Nombre, Celular, Telefono, CorreoElectronico, Direccion, CodigoTrabajador)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [Cedula, hash, Nombre, Celular, Telefono || null, CorreoElectronico, Direccion, CodigoTrabajador]
        );

        for (const rolId of rolesIds) {
            await conn.execute(
                'INSERT INTO rol_trabajador (CedulaTrabajador, RolID) VALUES (?, ?)',
                [Cedula, rolId]
            );
        }

        await conn.commit();
        return { Cedula, Nombre, roles: rolesIds };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function existeCedula(cedula) {
    const [rows] = await pool.execute('SELECT Cedula FROM trabajador WHERE Cedula = ?', [cedula]);
    return rows.length > 0;
}

async function existeCorreo(correo, excluirCedula = null) {
    const sql = excluirCedula
        ? 'SELECT Cedula FROM trabajador WHERE CorreoElectronico = ? AND Cedula != ?'
        : 'SELECT Cedula FROM trabajador WHERE CorreoElectronico = ?';
    const params = excluirCedula ? [correo, excluirCedula] : [correo];
    const [rows] = await pool.execute(sql, params);
    return rows.length > 0;
}

async function existeCodigoTrabajador(codigo, excluirCedula = null) {
    const sql = excluirCedula
        ? 'SELECT Cedula FROM trabajador WHERE CodigoTrabajador = ? AND Cedula != ?'
        : 'SELECT Cedula FROM trabajador WHERE CodigoTrabajador = ?';
    const params = excluirCedula ? [codigo, excluirCedula] : [codigo];
    const [rows] = await pool.execute(sql, params);
    return rows.length > 0;
}

async function buscarPorCorreo(correo) {
    const [rows] = await pool.execute(
        'SELECT t.Cedula, t.Nombre, t.CorreoElectronico FROM trabajador t WHERE t.CorreoElectronico = ? LIMIT 1',
        [correo]
    );
    return rows[0] || null;
}

async function actualizarPerfil(cedula, datos) {
    const { Nombre, Celular, Telefono, CorreoElectronico, Direccion } = datos;
    await pool.execute(
        `UPDATE trabajador SET Nombre=?, Celular=?, Telefono=?, CorreoElectronico=?, Direccion=? WHERE Cedula=?`,
        [Nombre, Celular, Telefono || null, CorreoElectronico, Direccion, cedula]
    );
}

async function actualizarContrasena(cedula, nuevaContrasena, requiereCambio = false) {
    const hash = await bcrypt.hash(nuevaContrasena, SALT_ROUNDS);
    await pool.execute(
        'UPDATE trabajador SET Contrasena = ?, RequiereCambioContrasena = ? WHERE Cedula = ?',
        [hash, requiereCambio ? 1 : 0, cedula]
    );
}

async function listarTodosConRoles() {
    const sql = `
        SELECT
            t.Cedula, t.CodigoTrabajador, t.Nombre, t.Celular, t.Telefono,
            t.CorreoElectronico, t.Direccion, t.Activo,
            r.ID AS rolId, r.TipoRol AS tipoRol
        FROM trabajador t
        LEFT JOIN rol_trabajador rt ON t.Cedula = rt.CedulaTrabajador
        LEFT JOIN rol r             ON rt.RolID  = r.ID
        ORDER BY t.Nombre
    `;
    const [rows] = await pool.execute(sql);

    const map = new Map();
    for (const row of rows) {
        if (!map.has(row.Cedula)) {
            map.set(row.Cedula, {
                cedula: row.Cedula,
                codigoTrabajador: row.CodigoTrabajador,
                nombre: row.Nombre,
                celular: row.Celular,
                telefono: row.Telefono,
                correo: row.CorreoElectronico,
                direccion: row.Direccion,
                activo: !!row.Activo,
                roles: []
            });
        }
        if (row.tipoRol) {
            map.get(row.Cedula).roles.push({ id: row.rolId, nombre: row.tipoRol });
        }
    }
    return [...map.values()];
}

async function actualizarTrabajador(cedula, datos, rolesIds = []) {
    const { Nombre, Celular, Telefono, CorreoElectronico, Direccion, CodigoTrabajador } = datos;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(
            `UPDATE trabajador
             SET Nombre=?, Celular=?, Telefono=?, CorreoElectronico=?, Direccion=?, CodigoTrabajador=?
             WHERE Cedula=?`,
            [Nombre, Celular, Telefono || null, CorreoElectronico, Direccion, CodigoTrabajador, cedula]
        );

        await conn.execute('DELETE FROM rol_trabajador WHERE CedulaTrabajador = ?', [cedula]);
        for (const rolId of rolesIds) {
            await conn.execute(
                'INSERT INTO rol_trabajador (CedulaTrabajador, RolID) VALUES (?, ?)',
                [cedula, rolId]
            );
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function cambiarEstado(cedula, activo) {
    await pool.execute('UPDATE trabajador SET Activo = ? WHERE Cedula = ?', [activo ? 1 : 0, cedula]);
}

async function listarRoles() {
    const [rows] = await pool.execute('SELECT ID AS id, TipoRol AS nombre FROM rol ORDER BY ID');
    return rows;
}

module.exports = {
    buscarPorCedula, crearTrabajador, existeCedula, existeCorreo, existeCodigoTrabajador, buscarPorCorreo,
    actualizarContrasena, actualizarPerfil,
    listarTodosConRoles, actualizarTrabajador, cambiarEstado, listarRoles
};
