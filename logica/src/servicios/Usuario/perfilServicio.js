const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { trabajador, auditoria } = require('../../infraestructura/persistenciaCliente');
const { ValidationError, validarCamposTrabajador } = require('../../utils/validacionesTrabajador');

async function obtenerPerfil(cedula) {
    const resultado = await trabajador.buscarPorCedula(cedula);
    if (!resultado) throw new Error('Usuario no encontrado.');
    const { trabajador: t, roles } = resultado;
    return {
        cedula:           t.Cedula,
        codigoTrabajador: t.CodigoTrabajador,
        nombre:           t.Nombre,
        celular:          t.Celular,
        telefono:         t.Telefono,
        correo:           t.CorreoElectronico,
        direccion:        t.Direccion,
        roles
    };
}

async function actualizarPerfil(cedula, datos, auditCtx = {}) {
    const { Nombre, Celular, Telefono, CorreoElectronico, Direccion } = datos;
    if (!Nombre || !Celular || !CorreoElectronico || !Direccion) {
        throw new ValidationError('Nombre, celular, correo y dirección son requeridos.');
    }
    validarCamposTrabajador(datos);

    const anterior = await obtenerPerfil(cedula);
    await trabajador.actualizarPerfil(cedula, { Nombre, Celular, Telefono, CorreoElectronico, Direccion });

    auditoria.registrarSistema({
        cedulaTrabajador: cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'EDITAR', tablaAfectada: 'trabajador',
        valorAnterior: { Nombre: anterior.nombre, Celular: anterior.celular, CorreoElectronico: anterior.correo, Direccion: anterior.direccion },
        valorNuevo:    { Nombre, Celular, CorreoElectronico, Direccion },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador actualizó su perfil: ${anterior.nombre} (${cedula})`,
    });
}

async function cambiarContrasena(cedula, contrasenaActual, nuevaContrasena, auditCtx = {}) {
    if (!contrasenaActual || !nuevaContrasena) {
        throw new ValidationError('La contraseña actual y la nueva son requeridas.');
    }
    if (nuevaContrasena.length < 6) {
        throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres.');
    }
    const resultado = await trabajador.buscarPorCedula(cedula);
    if (!resultado) throw new Error('Usuario no encontrado.');

    const esValida = await bcrypt.compare(contrasenaActual, resultado.trabajador.Contrasena);
    if (!esValida) {
        auditoria.registrarSistema({
            cedulaTrabajador: cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CAMBIO_CONTRASENA', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `Intento fallido de cambio de contraseña: contraseña actual incorrecta`,
        });
        throw new ValidationError('La contraseña actual es incorrecta.');
    }

    // requiereCambio=false: limpia el flag de cambio obligatorio (si venía de una
    // contraseña temporal por recuperación, ya quedó resuelto con este cambio).
    await trabajador.actualizarContrasena(cedula, nuevaContrasena, false);

    auditoria.registrarSistema({
        cedulaTrabajador: cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'CAMBIO_CONTRASENA', tablaAfectada: 'trabajador',
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Cambio de contraseña exitoso: ${auditCtx.actor?.nombre} (${cedula})`,
    });

    // El token viejo (si el login fue con contraseña temporal) aún trae
    // debeCambiarContrasena=true incrustado; se reemite uno nuevo ya limpio
    // para que el front deje de estar bloqueado sin tener que reloguear.
    const token = jwt.sign(
        { cedula, nombre: resultado.trabajador.Nombre, roles: resultado.roles, debeCambiarContrasena: false },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return { token };
}

module.exports = { obtenerPerfil, actualizarPerfil, cambiarContrasena, ValidationError };
