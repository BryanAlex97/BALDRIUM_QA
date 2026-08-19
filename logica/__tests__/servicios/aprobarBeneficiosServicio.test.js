// __tests__/servicios/aprobarBeneficiosServicio.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  beneficio: {
    listarEnRevision: jest.fn(),
    listarProductosDisponibles: jest.fn(),
    cambiarEstado: jest.fn(),
  },
}));

const { beneficio } = require('../../src/infraestructura/persistenciaCliente');
const {
  listarEnRevision, listarProductosDisponibles, cambiarEstado,
} = require('../../src/servicios/AuxiliarAdministrativo/aprobarBeneficiosServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('aprobarBeneficiosServicio — Escenario 1 (aprobar considerando inventario)', () => {

  test('lista los beneficios en revisión', async () => {
    beneficio.listarEnRevision.mockResolvedValue([
      { ID: 1, NombreCliente: 'Auronplay', EstadoBeneficio: 'Revision' },
    ]);

    const resultado = await listarEnRevision();
    expect(resultado[0].EstadoBeneficio).toBe('Revision');
  });

  test('lista solo productos disponibles (tipo Beneficio, con stock) para elegir al aprobar', async () => {
    beneficio.listarProductosDisponibles.mockResolvedValue([
      { ID: 5, Nombre: 'Kit de cocina', Cantidad: 3 },
    ]);

    const resultado = await listarProductosDisponibles();
    expect(resultado[0].Cantidad).toBeGreaterThan(0);
  });

  test('aprueba el beneficio (Aceptado) con producto e inventario indicados', async () => {
    beneficio.cambiarEstado.mockResolvedValue();

    await cambiarEstado(1, 'Aceptado', 5, 'Cumple todos los requisitos', { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(beneficio.cambiarEstado).toHaveBeenCalledWith(1, 'Aceptado', 5, 'Cumple todos los requisitos', { actor: { cedula: '2001', nombre: 'Fer' } });
  });

});

describe('aprobarBeneficiosServicio — Escenario 2 (actualización de estado, robustez)', () => {

  test('rechaza el beneficio (Rechazado) sin necesitar inventario', async () => {
    beneficio.cambiarEstado.mockResolvedValue();

    await cambiarEstado(2, 'Rechazado', null, 'No cumple el mínimo de referidos', {});

    expect(beneficio.cambiarEstado).toHaveBeenCalledWith(2, 'Rechazado', null, 'No cumple el mínimo de referidos', {});
  });

  test('propaga el error si persistencia rechaza la operación (ej. producto sin stock)', async () => {
    beneficio.cambiarEstado.mockRejectedValue(new Error('"Kit de cocina" no tiene existencias disponibles'));

    await expect(cambiarEstado(1, 'Aceptado', 5, 'Aprobado', {})).rejects.toThrow('no tiene existencias disponibles');
  });

  test('propaga el error si el motivo no se envía (validación de negocio en persistencia)', async () => {
    beneficio.cambiarEstado.mockRejectedValue(new Error('El motivo de la aprobación o el rechazo es obligatorio'));

    await expect(cambiarEstado(1, 'Aceptado', 5, '', {})).rejects.toThrow('El motivo');
  });

});