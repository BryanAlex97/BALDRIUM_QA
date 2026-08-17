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
    Cedula: '300111222', Nombre: 'Fer', Celular: '3000000000',
    CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1',
    CodigoTrabajador: 'T-01', Activo: true,
  },
  roles: ['Director'],
};

const datosCompletos = {
  Nombre: 'Fer Actualizada', Celular: '3001112233',
  CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2', CodigoTrabajador: 'T-01',
};

describe('usuarioServicio.actualizar — casos base', () => {

  test('lanza error si el trabajador no existe', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);
    await expect(actualizar('9999999', datosCompletos, [1])).rejects.toThrow('Trabajador no encontrado.');
    expect(trabajador.actualizarTrabajador).not.toHaveBeenCalled();
  });

  test('lanza error si falta un campo requerido (ahora se exige el formulario completo)', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    await expect(actualizar('300111222', { Nombre: 'Fer' }, [1])).rejects.toThrow(/son requeridos/);
  });

  test('lanza error si no se asigna ningún rol', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    await expect(actualizar('300111222', datosCompletos, [])).rejects.toThrow(/al menos un rol/);
  });

  test('lanza error si el nuevo correo ya está en uso por OTRO trabajador', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(true);

    await expect(actualizar('300111222', datosCompletos, [1])).rejects.toThrow(/ya está en uso/);
    expect(trabajador.existeCorreo).toHaveBeenCalledWith('fer.nueva@baldrium.com', '300111222');
  });

  test('lanza error si el nuevo código de trabajador ya está en uso por OTRO trabajador', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(true);

    await expect(actualizar('300111222', { ...datosCompletos, CodigoTrabajador: 'T-99' }, [1])).rejects.toThrow(/ya está en uso/);
    expect(trabajador.existeCodigoTrabajador).toHaveBeenCalledWith('T-99', '300111222');
  });

  test('actualiza correctamente y audita valor anterior vs. nuevo, incluyendo roles', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(false);
    trabajador.actualizarTrabajador.mockResolvedValue();

    await actualizar('300111222', datosCompletos, [2], { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(trabajador.actualizarTrabajador).toHaveBeenCalledWith('300111222', datosCompletos, [2]);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'EDITAR', resultado: 'EXITOSO' })
    );
  });

});

describe('usuarioServicio.actualizar — robustez ante inyección (hallazgo de HU-03 resuelto)', () => {

  test('nombre con inyección tipo SQL ahora es rechazado por la validación de formato', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    await expect(actualizar('300111222', { ...datosCompletos, Nombre: "Fer'; DROP TABLE trabajador;--" }, [1]))
      .rejects.toThrow(/solo puede contener letras/);
  });

});

describe('usuarioServicio.actualizar — concurrencia', () => {

  test('dos ediciones simultáneas al mismo trabajador no rompen el servicio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(false);
    trabajador.actualizarTrabajador.mockResolvedValue();

    const [r1, r2] = await Promise.allSettled([
      actualizar('300111222', { ...datosCompletos, Nombre: 'Edicion A' }, [1]),
      actualizar('300111222', { ...datosCompletos, Nombre: 'Edicion B' }, [1]),
    ]);

    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');
  });

});