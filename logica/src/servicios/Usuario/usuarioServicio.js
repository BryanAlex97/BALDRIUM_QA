const { trabajador, auditoria, beneficio } = require('../../infraestructura/persistenciaCliente');
const { ValidationError, validarCamposTrabajador } = require('../../utils/validacionesTrabajador');

// Error de negocio propio de este servicio (choque de unicidad): se distingue
// de ValidationError para que la ruta responda 409 en vez de 400/500.
class ConflictError extends Error {}

async function listar() {
    return await trabajador.listarTodosConRoles();
}

async function listarRoles() {
    return await trabajador.listarRoles();
}

async function listarAuditoria(limite = 400) {
    return await auditoria.listarSistema(limite);
}

async function crear(datos, rolesIds = [], auditCtx = {}) {
    const { Cedula, Contrasena, Nombre, Celular, CorreoElectronico, Direccion, CodigoTrabajador } = datos;
    if (!Cedula || !Contrasena || !Nombre || !Celular || !CorreoElectronico || !Direccion || !CodigoTrabajador) {
        throw new ValidationError('Cédula, contraseña, nombre, celular, correo, dirección y código de trabajador son requeridos.');
    }
    if (!Array.isArray(rolesIds) || rolesIds.length === 0) {
        throw new ValidationError('Debes asignar al menos un rol al trabajador.');
    }
    if (Contrasena.length < 6) {
        throw new ValidationError('La contraseña debe tener al menos 6 caracteres.');
    }
    validarCamposTrabajador(datos);

    if (await trabajador.existeCedula(Cedula)) {
        auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `La cédula ${Cedula} ya está registrada.`,
        });
        throw new ConflictError(`La cédula ${Cedula} ya está registrada.`);
    }

    if (CorreoElectronico && await trabajador.existeCorreo(CorreoElectronico)) {
        auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `El correo ${CorreoElectronico} ya está en uso.`,
        });
        throw new ConflictError(`El correo ${CorreoElectronico} ya está en uso por otro trabajador.`);
    }

    if (CodigoTrabajador && await trabajador.existeCodigoTrabajador(CodigoTrabajador)) {
        auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `El código de trabajador ${CodigoTrabajador} ya está en uso.`,
        });
        throw new ConflictError(`El código de trabajador ${CodigoTrabajador} ya está en uso por otro trabajador.`);
    }

    const nuevo = await trabajador.crearTrabajador(datos, rolesIds);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
        valorNuevo: { Cedula, Nombre, CodigoTrabajador: datos.CodigoTrabajador, Celular: datos.Celular, CorreoElectronico, roles: rolesIds },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador creado: ${Nombre} (${Cedula})`,
    });

    return nuevo;
}

async function actualizar(cedula, datos, rolesIds = [], auditCtx = {}) {
    const anterior = await obtenerUno(cedula);
    if (!anterior) throw new Error('Trabajador no encontrado.');

    const { Nombre, Celular, CorreoElectronico, Direccion, CodigoTrabajador } = datos;
    if (!Nombre || !Celular || !CorreoElectronico || !Direccion || !CodigoTrabajador) {
        throw new ValidationError('Nombre, celular, correo, dirección y código de trabajador son requeridos.');
    }

    if (!Array.isArray(rolesIds) || rolesIds.length === 0) {
        throw new ValidationError('Debes asignar al menos un rol al trabajador.');
    }
    validarCamposTrabajador(datos);

    if (datos.CorreoElectronico && await trabajador.existeCorreo(datos.CorreoElectronico, cedula)) {
        throw new ConflictError(`El correo ${datos.CorreoElectronico} ya está en uso por otro trabajador.`);
    }

    if (datos.CodigoTrabajador && await trabajador.existeCodigoTrabajador(datos.CodigoTrabajador, cedula)) {
        throw new ConflictError(`El código de trabajador ${datos.CodigoTrabajador} ya está en uso por otro trabajador.`);
    }

    await trabajador.actualizarTrabajador(cedula, datos, rolesIds);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'EDITAR', tablaAfectada: 'trabajador',
        valorAnterior: { Nombre: anterior.nombre, Celular: anterior.celular, CorreoElectronico: anterior.correo, Direccion: anterior.direccion, roles: anterior.roles },
        valorNuevo:    { Nombre: datos.Nombre,    Celular: datos.Celular,    CorreoElectronico: datos.CorreoElectronico, Direccion: datos.Direccion, roles: rolesIds },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador editado: ${anterior.nombre} (${cedula})`,
    });
}

async function cambiarEstado(cedula, activo, auditCtx = {}) {
    const anterior = await obtenerUno(cedula);
    if (!anterior) throw new Error('Trabajador no encontrado.');

    await trabajador.cambiarEstado(cedula, activo);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'CAMBIO_ESTADO', tablaAfectada: 'trabajador',
        valorAnterior: { Activo: !activo },
        valorNuevo:    { Activo: activo },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador ${cedula} ${activo ? 'activado' : 'desactivado'}`,
    });
}

async function obtenerUno(cedula) {
    const resultado = await trabajador.buscarPorCedula(cedula);
    if (!resultado) return null;
    const { trabajador: t, roles } = resultado;
    return {
        cedula:           t.Cedula,
        nombre:           t.Nombre,
        celular:          t.Celular,
        telefono:         t.Telefono,
        correo:           t.CorreoElectronico,
        direccion:        t.Direccion,
        codigoTrabajador: t.CodigoTrabajador,
        activo:           !!t.Activo,
        roles,
    };
}

async function obtenerParametrosBeneficio() {
    return beneficio.obtenerParametros();
}

async function actualizarParametrosBeneficio(valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx = {}) {
    return beneficio.actualizarParametros(valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx);
}

module.exports = {
    listar, listarRoles, listarAuditoria, crear, actualizar, cambiarEstado, obtenerUno,
    obtenerParametrosBeneficio, actualizarParametrosBeneficio,
    ValidationError, ConflictError,
};
