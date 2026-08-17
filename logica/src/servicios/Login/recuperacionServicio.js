const { trabajador } = require('../../infraestructura/persistenciaCliente');
const { enviarContrasenaTemp } = require('../../infraestructura/emailCliente');

function generarContrasenaTemp() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
}

async function olvideMiContrasena(correo) {
    const t = await trabajador.buscarPorCorreo(correo.trim().toLowerCase());
    if (!t) {
        throw new Error('Si el correo existe en el sistema, recibirás las instrucciones en breve.');
    }

    const contrasenaTemp = generarContrasenaTemp();
    await trabajador.actualizarContrasena(t.Cedula, contrasenaTemp, true);
    await enviarContrasenaTemp(t.CorreoElectronico, t.Nombre, contrasenaTemp);

    return { mensaje: 'Si el correo existe en el sistema, recibirás las instrucciones en breve.' };
}

module.exports = { olvideMiContrasena };
