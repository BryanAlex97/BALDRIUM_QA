// __tests__/servicios/usuarioServicio.parametrosBeneficio.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  beneficio: {
    obtenerParametros: jest.fn(),
    actualizarParametros: jest.fn(),
  },
}));

const { beneficio } = require('../../src/infraestructura/persistenciaCliente');
const { obtenerParametrosBeneficio, actualizarParametrosBeneficio } = require('../../src/servicios/Usuario/usuarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('usuarioServicio — Escenario 1 (parametrizar reglas de beneficio)', () => {

  test('obtiene los parámetros actuales configurados', async () => {
    beneficio.obtenerParametros.mockResolvedValue({
      valorMinimoCompra: 500000,
      minimoReferidosVisitados: 10,
      valorMinimoCompraReferido: 200000,
    });

    const resultado = await obtenerParametrosBeneficio();

    expect(resultado.minimoReferidosVisitados).toBe(10);
  });

  test('actualiza los 3 parámetros correctamente (Escenario 2: se aplicarán en validaciones futuras)', async () => {
    beneficio.actualizarParametros.mockResolvedValue({ ok: true });

    await actualizarParametrosBeneficio(600000, 15, 250000, { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(beneficio.actualizarParametros).toHaveBeenCalledWith(600000, 15, 250000, { actor: { cedula: '2001', nombre: 'Fer' } });
  });

  test('hallazgo: no valida que los valores sean positivos antes de delegar', async () => {
    beneficio.actualizarParametros.mockResolvedValue({ ok: true });

    // No debería aceptar valores negativos, pero el código actual no los valida
    await actualizarParametrosBeneficio(-100, -5, -50, {});

    expect(beneficio.actualizarParametros).toHaveBeenCalledWith(-100, -5, -50, {});
  });

  test('propaga el error si persistencia falla', async () => {
    beneficio.actualizarParametros.mockRejectedValue(new Error('Error al guardar parámetros.'));
    await expect(actualizarParametrosBeneficio(600000, 15, 250000, {})).rejects.toThrow('Error al guardar parámetros.');
  });

});