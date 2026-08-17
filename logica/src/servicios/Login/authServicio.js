const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { trabajador, auditoria } = require('../../infraestructura/persistenciaCliente');

async function login(cedula, contrasena, auditCtx = {}) {
    const resultado = await trabajador.buscarPorCedula(cedula);

    if (!resultado) {
        auditoria.registrarSistema({
            cedulaTrabajador: cedula,
            nombreTrabajador: 'No identificado',
            tipoAccion: 'LOGIN_FALLIDO',
            direccionIP: auditCtx.ip || null,
            dispositivo: auditCtx.device || null,
            resultado: 'FALLIDO',
            descripcion: 'Credenciales inválidas',
        });
        throw new Error('Credenciales inválidas');
    }

    const { trabajador: t, roles } = resultado;

    if (!t.Activo) {
        auditoria.registrarSistema({
            cedulaTrabajador: t.Cedula,
            nombreTrabajador: t.Nombre,
            tipoAccion: 'LOGIN_FALLIDO',
            direccionIP: auditCtx.ip || null,
            dispositivo: auditCtx.device || null,
            resultado: 'FALLIDO',
            descripcion: 'Cuenta desactivada',
        });
        throw new Error('Tu cuenta está desactivada. Contacta a tu administrador.');
    }

    const contrasenaValida = await bcrypt.compare(contrasena, t.Contrasena);
    if (!contrasenaValida) {
        auditoria.registrarSistema({
            cedulaTrabajador: cedula,
            nombreTrabajador: 'No identificado',
            tipoAccion: 'LOGIN_FALLIDO',
            direccionIP: auditCtx.ip || null,
            dispositivo: auditCtx.device || null,
            resultado: 'FALLIDO',
            descripcion: 'Credenciales inválidas',
        });
        throw new Error('Credenciales inválidas');
    }

    const debeCambiarContrasena = !!t.RequiereCambioContrasena;

    const token = jwt.sign(
        { cedula: t.Cedula, nombre: t.Nombre, roles, debeCambiarContrasena },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    auditoria.registrarSistema({
        cedulaTrabajador: t.Cedula,
        nombreTrabajador: t.Nombre,
        tipoAccion: 'LOGIN',
        direccionIP: auditCtx.ip || null,
        dispositivo: auditCtx.device || null,
        resultado: 'EXITOSO',
        descripcion: 'Inicio de sesión exitoso',
    });

    return {
        token,
        usuario: {
            cedula:           t.Cedula,
            nombre:           t.Nombre,
            celular:          t.Celular,
            telefono:         t.Telefono,
            correo:           t.CorreoElectronico,
            direccion:        t.Direccion,
            codigoTrabajador: t.CodigoTrabajador,
            roles,
            debeCambiarContrasena
        }
    };
}

module.exports = { login };
