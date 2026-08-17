// __tests__/servicios/perfilServicio.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCedula: jest.fn(),
    actualizarPerfil: jest.fn(),
    actualizarContrasena: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
  },
}));

const { trabajador, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { obtenerPerfil, actualizarPerfil, cambiarContrasena } = require('../../src/servicios/Usuario/perfilServicio');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
  process.env.JWT_EXPIRES_IN = '8h';
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('perfilServicio.obtenerPerfil', () => {

  test('lanza error si el usuario no existe', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);
    await expect(obtenerPerfil('9999999')).rejects.toThrow('Usuario no encontrado.');
  });

  test('devuelve el perfil correctamente mapeado', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: {
        Cedula: '300111222', CodigoTrabajador: 'T-01', Nombre: 'Fer',
        Celular: '3000000000', Telefono: null, CorreoElectronico: 'fer@baldrium.com',
        Direccion: 'CL 1',
      },
      roles: ['Director'],
    });
    const perfil = await obtenerPerfil('300111222');
    expect(perfil.cedula).toBe('300111222');
    expect(perfil.roles).toEqual(['Director']);
  });

});

describe('perfilServicio.actualizarPerfil', () => {

  const datosValidos = { Nombre: 'Fer Actualizada', Celular: '3001112233', CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2' };

  test('lanza error si falta un campo requerido', async () => {
    await expect(actualizarPerfil('300111222', { Nombre: 'Fer', Celular: '3001112233' }))
      .rejects.toThrow('Nombre, celular, correo y dirección son requeridos.');
  });

  test('lanza error si el nombre tiene formato inválido (nueva validación)', async () => {
    await expect(actualizarPerfil('300111222', { ...datosValidos, Nombre: 'Fer123' }))
      .rejects.toThrow(/solo puede contener letras/);
  });

  test('actualiza correctamente y audita el cambio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '300111222', Nombre: 'Fer', Celular: '3000000000', CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1' },
      roles: ['Director'],
    });
    trabajador.actualizarPerfil.mockResolvedValue();

    await actualizarPerfil('300111222', datosValidos, { actor: { nombre: 'Fer' } });

    expect(trabajador.actualizarPerfil).toHaveBeenCalledWith('300111222', datosValidos);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'EDITAR', resultado: 'EXITOSO' })
    );
  });

});

describe('perfilServicio.actualizarPerfil — Escenario 2 (campos protegidos)', () => {

  test('ignora intentos de modificar roles o estado aunque vengan en el payload', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '300111222', Nombre: 'Fer', Celular: '3000000000', CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1' },
      roles: ['Director'],
    });
    trabajador.actualizarPerfil.mockResolvedValue();

    const payloadConCamposProhibidos = {
      Nombre: 'Fer Actualizada', Celular: '3001112233', CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2',
      roles: ['Asesor Comercial'], Activo: false,
    };

    await actualizarPerfil('300111222', payloadConCamposProhibidos);

    expect(trabajador.actualizarPerfil).toHaveBeenCalledWith('300111222', {
      Nombre: 'Fer Actualizada', Celular: '3001112233', CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2',
    });
  });

});

describe('perfilServicio.cambiarContrasena', () => {

  test('lanza error si faltan la contraseña actual o la nueva', async () => {
    await expect(cambiarContrasena('300111222', '', 'nueva123')).rejects.toThrow('La contraseña actual y la nueva son requeridas.');
  });

  test('lanza error si la nueva contraseña tiene menos de 6 caracteres', async () => {
    await expect(cambiarContrasena('300111222', 'actual123', '123')).rejects.toThrow(/al menos 6 caracteres/);
  });

  test('lanza error si el usuario no existe (con una nueva contraseña válida en longitud)', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);
    await expect(cambiarContrasena('9999999', 'actual123', 'nuevaClave123')).rejects.toThrow('Usuario no encontrado.');
  });

  test('lanza error y audita fallo si la contraseña actual es incorrecta', async () => {
    const bcrypt = require('bcrypt');
    trabajador.buscarPorCedula.mockResolvedValue({ trabajador: { Cedula: '300111222', Contrasena: 'hashReal' }, roles: [] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(cambiarContrasena('300111222', 'mala1234', 'nuevaClave123')).rejects.toThrow('La contraseña actual es incorrecta.');
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'FALLIDO' }));
  });

  test('cambia la contraseña correctamente, audita el éxito, y reemite un token con debeCambiarContrasena=false', async () => {
    const bcrypt = require('bcrypt');
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '300111222', Nombre: 'Fer', Contrasena: 'hashReal' },
      roles: ['Director'],
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    trabajador.actualizarContrasena.mockResolvedValue();

    const resultado = await cambiarContrasena('300111222', 'actual123', 'nuevaClave456', { actor: { nombre: 'Fer' } });

    expect(trabajador.actualizarContrasena).toHaveBeenCalledWith('300111222', 'nuevaClave456', false);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'EXITOSO' }));

    expect(resultado).toHaveProperty('token');
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(resultado.token, process.env.JWT_SECRET);
    expect(payload.debeCambiarContrasena).toBe(false);
  });

});