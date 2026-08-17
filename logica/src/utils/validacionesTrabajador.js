// Validación de formato/longitud compartida entre la creación/edición de
// usuarios (Director) y la edición de perfil propio (autoservicio), para no
// duplicar las mismas reglas en dos servicios — ver hallazgos de QA sobre
// falta de validación antes de tocar la base de datos (HU-02, HU-04, HU-05).
class ValidationError extends Error {}

const REGEX_SOLO_DIGITOS = /^\d+$/;
const REGEX_NOMBRE       = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s'.-]+$/;

// Valida los campos compartidos entre crear/actualizar trabajador y
// actualizar perfil propio, ANTES de tocar la base de datos, para nunca
// dejar que un tipo incorrecto (letras en un campo numérico, texto
// demasiado largo) llegue a un 500 de MySQL.
function validarCamposTrabajador({ Nombre, Cedula, Celular, Telefono, CorreoElectronico, Direccion, CodigoTrabajador }) {
    if (Nombre !== undefined) {
        if (Nombre.trim().length < 3 || Nombre.length > 100) {
            throw new ValidationError('El nombre debe tener entre 3 y 100 caracteres.');
        }
        if (!REGEX_NOMBRE.test(Nombre)) {
            throw new ValidationError('El nombre solo puede contener letras y espacios.');
        }
    }

    if (Cedula !== undefined) {
        if (!REGEX_SOLO_DIGITOS.test(Cedula)) {
            throw new ValidationError('La cédula solo puede contener números.');
        }
        if (Cedula.length < 6 || Cedula.length > 15) {
            throw new ValidationError('La cédula debe tener entre 6 y 15 dígitos.');
        }
    }

    if (Celular !== undefined) {
        if (!REGEX_SOLO_DIGITOS.test(String(Celular))) {
            throw new ValidationError('El celular solo puede contener números.');
        }
        if (String(Celular).length < 7 || String(Celular).length > 15) {
            throw new ValidationError('El celular debe tener entre 7 y 15 dígitos.');
        }
    }

    if (Telefono) {
        if (!REGEX_SOLO_DIGITOS.test(String(Telefono))) {
            throw new ValidationError('El teléfono solo puede contener números.');
        }
        if (String(Telefono).length > 15) {
            throw new ValidationError('El teléfono debe tener máximo 15 dígitos.');
        }
    }

    if (CorreoElectronico !== undefined && CorreoElectronico.length > 100) {
        throw new ValidationError('El correo debe tener máximo 100 caracteres.');
    }

    if (Direccion && Direccion.length > 200) {
        throw new ValidationError('La dirección debe tener máximo 200 caracteres.');
    }

    if (CodigoTrabajador && CodigoTrabajador.length > 50) {
        throw new ValidationError('El código de trabajador debe tener máximo 50 caracteres.');
    }
}

module.exports = { ValidationError, validarCamposTrabajador, REGEX_SOLO_DIGITOS, REGEX_NOMBRE };
