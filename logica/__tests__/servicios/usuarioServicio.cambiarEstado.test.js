// __tests__/servicios/usuarioServicio.cambiarEstado.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCedula: jest.fn(),
    cambiarEstado: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
  },
}));

const { trabajador, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { cambiarEstado } = require('../../src/servicios/Usuario/usuarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

const trabajadorExistente = {
  trabajador: {
    Cedula: '2001', Nombre: 'Fer', Celular: '3000000000',
    CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1', Activo: true,
  },
  roles: ['Director'],
};

describe('usuarioServicio.cambiarEstado — casos base', () => {

  test('lanza error si el trabajador no existe (fix BS-69 verificado)', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    await expect(cambiarEstado('9999999', false)).rejects.toThrow('Trabajador no encontrado.');
    expect(trabajador.cambiarEstado).not.toHaveBeenCalled();
    expect(auditoria.registrarSistema).not.toHaveBeenCalled();
  });

  test('activa correctamente y audita el cambio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.cambiarEstado.mockResolvedValue();

    await cambiarEstado('2001', true, { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(trabajador.cambiarEstado).toHaveBeenCalledWith('2001', true);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoAccion: 'CAMBIO_ESTADO', resultado: 'EXITOSO',
        valorAnterior: { Activo: false }, valorNuevo: { Activo: true },
      })
    );
  });

  test('desactiva correctamente y audita el cambio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.cambiarEstado.mockResolvedValue();

    await cambiarEstado('2001', false, { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(trabajador.cambiarEstado).toHaveBeenCalledWith('2001', false);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ valorAnterior: { Activo: true }, valorNuevo: { Activo: false } })
    );
  });

});

describe('usuarioServicio.cambiarEstado — Escenario 1 y 2 de HU-04 (NUEVO)', () => {

  test('Escenario 1: desactivar registra el estado Activo: false, lo que impide el acceso (verificado en authServicio)', async () => {
    // Nota de QA: este test confirma que cambiarEstado(false) efectivamente
    // pone Activo en false. La verificación de que esto BLOQUEA el login
    // ya está cubierta en authServicio.test.js ("lanza error si la cuenta
    // está desactivada") — conecta ambos módulos para cumplir el Escenario 1.
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.cambiarEstado.mockResolvedValue();

    await cambiarEstado('2001', false);

    expect(trabajador.cambiarEstado).toHaveBeenCalledWith('2001', false);
  });

  test('Escenario 2: reactivar registra el estado Activo: true', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      ...trabajadorExistente,
      trabajador: { ...trabajadorExistente.trabajador, Activo: false },
    });
    trabajador.cambiarEstado.mockResolvedValue();

    await cambiarEstado('2001', true);

    expect(trabajador.cambiarEstado).toHaveBeenCalledWith('2001', true);
  });

});

describe('usuarioServicio.cambiarEstado — concurrencia (NUEVO)', () => {

  test('dos cambios de estado simultáneos al mismo trabajador no rompen el servicio', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.cambiarEstado.mockResolvedValue();

    const [r1, r2] = await Promise.allSettled([
      cambiarEstado('2001', false),
      cambiarEstado('2001', true),
    ]);

    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');
  });

});