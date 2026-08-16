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
        Cedula: '2001', CodigoTrabajador: 'T-01', Nombre: 'Fer',
        Celular: '3000000000', Telefono: null, CorreoElectronico: 'fer@baldrium.com',
        Direccion: 'CL 1',
      },
      roles: ['Director'],
    });

    const perfil = await obtenerPerfil('2001');
    expect(perfil.cedula).toBe('2001');
    expect(perfil.roles).toEqual(['Director']);
  });

});

describe('perfilServicio.actualizarPerfil', () => {

  const datosValidos = { Nombre: 'Fer Actualizada', Celular: '3001112233', CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2' };

  test('lanza error si falta un campo requerido', async () => {
    await expect(actualizarPerfil('2001', { Nombre: 'Fer', Celular: '300' }))
      .rejects.toThrow('Nombre, celular, correo y dirección son requeridos.');
  });

  test('actualiza correctamente y audita el cambio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '2001', Nombre: 'Fer', Celular: '3000000000', CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1' },
      roles: ['Director'],
    });
    trabajador.actualizarPerfil.mockResolvedValue();

    await actualizarPerfil('2001', datosValidos, { actor: { nombre: 'Fer' } });

    expect(trabajador.actualizarPerfil).toHaveBeenCalledWith('2001', datosValidos);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'EDITAR', resultado: 'EXITOSO' })
    );
  });

});

describe('perfilServicio.actualizarPerfil — Escenario 2 (campos protegidos)', () => {

  test('ignora intentos de modificar roles o estado aunque vengan en el payload', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '2001', Nombre: 'Fer', Celular: '3000000000', CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1' },
      roles: ['Director'],
    });
    trabajador.actualizarPerfil.mockResolvedValue();

    const payloadConCamposProhibidos = {
      Nombre: 'Fer Actualizada', Celular: '3001112233', CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2',
      roles: ['Asesor Comercial'], Activo: false,
    };

    await actualizarPerfil('2001', payloadConCamposProhibidos);

    expect(trabajador.actualizarPerfil).toHaveBeenCalledWith('2001', {
      Nombre: 'Fer Actualizada', Celular: '3001112233', CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2',
    });
  });

});

describe('perfilServicio.cambiarContrasena', () => {

  test('lanza error si faltan la contraseña actual o la nueva', async () => {
    await expect(cambiarContrasena('2001', '', 'nueva123')).rejects.toThrow('La contraseña actual y la nueva son requeridas.');
  });

  test('lanza error si el usuario no existe', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);
    await expect(cambiarContrasena('9999999', 'actual', 'nueva')).rejects.toThrow('Usuario no encontrado.');
  });

  test('lanza error y audita fallo si la contraseña actual es incorrecta', async () => {
    const bcrypt = require('bcrypt');
    trabajador.buscarPorCedula.mockResolvedValue({ trabajador: { Cedula: '2001', Contrasena: 'hashReal' }, roles: [] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(cambiarContrasena('2001', 'mala', 'nueva123')).rejects.toThrow('La contraseña actual es incorrecta.');
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'FALLIDO' }));
  });

  test('cambia la contraseña correctamente y audita el éxito', async () => {
    const bcrypt = require('bcrypt');
    trabajador.buscarPorCedula.mockResolvedValue({ trabajador: { Cedula: '2001', Contrasena: 'hashReal' }, roles: [] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    trabajador.actualizarContrasena.mockResolvedValue();

    await cambiarContrasena('2001', 'actual123', 'nueva456', { actor: { nombre: 'Fer' } });

    expect(trabajador.actualizarContrasena).toHaveBeenCalledWith('2001', 'nueva456');
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'EXITOSO' }));
  });

});