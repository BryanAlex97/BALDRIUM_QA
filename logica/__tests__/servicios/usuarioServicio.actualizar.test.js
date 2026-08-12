// __tests__/servicios/usuarioServicio.actualizar.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCedula: jest.fn(),
    existeCorreo: jest.fn(),
    existeCodigoTrabajador: jest.fn(),
    actualizarTrabajador: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
  },
}));

const { trabajador, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { actualizar } = require('../../src/servicios/Usuario/usuarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

const trabajadorExistente = {
  trabajador: {
    Cedula: '2001', Nombre: 'Fer', Celular: '3000000000',
    CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1',
    CodigoTrabajador: 'T-01', Activo: true,
  },
  roles: ['Director'],
};

describe('usuarioServicio.actualizar — casos base', () => {

  test('lanza error si el trabajador no existe', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    await expect(actualizar('9999999', { Nombre: 'X' }, [1])).rejects.toThrow('Trabajador no encontrado.');
    expect(trabajador.actualizarTrabajador).not.toHaveBeenCalled();
  });

  test('lanza error si el nuevo correo ya está en uso por OTRO trabajador', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(true);

    await expect(actualizar('2001', { CorreoElectronico: 'otro@baldrium.com' }, [1]))
      .rejects.toThrow(/ya está en uso/);
    // Confirma que se excluye la propia cédula al verificar duplicados
    expect(trabajador.existeCorreo).toHaveBeenCalledWith('otro@baldrium.com', '2001');
  });

  test('lanza error si el nuevo código de trabajador ya está en uso por OTRO trabajador', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(true);

    await expect(actualizar('2001', { CodigoTrabajador: 'T-99' }, [1]))
      .rejects.toThrow(/ya está en uso/);
    expect(trabajador.existeCodigoTrabajador).toHaveBeenCalledWith('T-99', '2001');
  });

  test('NO valida duplicado de correo/código si no se envían esos campos (permite editar solo otros datos)', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.actualizarTrabajador.mockResolvedValue();

    await actualizar('2001', { Nombre: 'Fer Actualizada' }, [1]);

    expect(trabajador.existeCorreo).not.toHaveBeenCalled();
    expect(trabajador.existeCodigoTrabajador).not.toHaveBeenCalled();
    expect(trabajador.actualizarTrabajador).toHaveBeenCalled();
  });

  test('actualiza correctamente y audita valor anterior vs. nuevo, incluyendo roles', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.actualizarTrabajador.mockResolvedValue();

    await actualizar('2001', {
      Nombre: 'Fer Actualizada', Celular: '3001112233',
      CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2',
    }, [2], { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(trabajador.actualizarTrabajador).toHaveBeenCalledWith('2001', expect.objectContaining({
      Nombre: 'Fer Actualizada',
    }), [2]);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoAccion: 'EDITAR',
        resultado: 'EXITOSO',
        valorAnterior: expect.objectContaining({ Nombre: 'Fer', roles: ['Director'] }),
        valorNuevo: expect.objectContaining({ Nombre: 'Fer Actualizada', roles: [2] }),
      })
    );
  });

});

describe('usuarioServicio.actualizar — Escenario 3 HU-03 (roles se reflejan en el acceso) (NUEVO)', () => {

  test('actualiza correctamente removiendo todos los roles (array vacío)', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.actualizarTrabajador.mockResolvedValue();

    await actualizar('2001', { Nombre: 'Fer' }, []);

    expect(trabajador.actualizarTrabajador).toHaveBeenCalledWith('2001', expect.anything(), []);
  });

});

describe('usuarioServicio.actualizar — caracteres especiales y concurrencia (NUEVO)', () => {

  test('nombre con inyección tipo SQL no rompe el servicio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.actualizarTrabajador.mockResolvedValue();

    await expect(actualizar('2001', { Nombre: "Fer'; DROP TABLE trabajador;--" }, [1]))
      .resolves.toBeUndefined();
  });

  test('dos ediciones simultáneas al mismo trabajador no rompen el servicio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.actualizarTrabajador.mockResolvedValue();

    const [r1, r2] = await Promise.allSettled([
      actualizar('2001', { Nombre: 'Edicion A' }, [1]),
      actualizar('2001', { Nombre: 'Edicion B' }, [1]),
    ]);

    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');
  });

});