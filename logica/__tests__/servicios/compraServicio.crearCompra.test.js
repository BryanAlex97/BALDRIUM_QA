// __tests__/servicios/compraServicio.crearCompra.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  compra: {
    crearCompra: jest.fn(),
    listarComprasTrabajador: jest.fn(),
  },
}));

const { compra } = require('../../src/infraestructura/persistenciaCliente');
const { crearCompra, listarComprasTrabajador } = require('../../src/servicios/Telemercadeo/AsesorComercial/compraServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('compraServicio.crearCompra — Escenarios 1 y 2', () => {

  const actor = { cedula: '3001', nombre: 'Asesor' };
  const items = [
    { inventarioId: 1, cantidad: 2, valorUnitario: 50000 },
    { inventarioId: 2, cantidad: 1, valorUnitario: 30000 },
  ];

  test('registra la compra con cliente, forma de pago, notas y múltiples productos (Escenarios 1 y 2)', async () => {
    compra.crearCompra.mockResolvedValue({ compraId: 50 });

    const resultado = await crearCompra('2001', actor, 'Efectivo', 'Entrega inmediata', items, [], {});

    expect(compra.crearCompra).toHaveBeenCalledWith('2001', actor, 'Efectivo', 'Entrega inmediata', items, [], {});
    expect(resultado.compraId).toBe(50);
  });

  test('permite registrar la compra con lista de referidos asociados', async () => {
    compra.crearCompra.mockResolvedValue({ compraId: 51 });
    const referidos = [{ nombre: 'Referido A', celular: '3001112233' }];

    await crearCompra('2001', actor, 'Tarjeta', '', items, referidos, {});

    expect(compra.crearCompra).toHaveBeenCalledWith('2001', actor, 'Tarjeta', '', items, referidos, {});
  });

  test('propaga el error si persistencia falla (ej. cliente no existe)', async () => {
    compra.crearCompra.mockRejectedValue(new Error('Cliente no encontrado.'));
    await expect(crearCompra('9999999', actor, 'Efectivo', '', items, [], {})).rejects.toThrow('Cliente no encontrado.');
  });

});

describe('compraServicio.listarComprasTrabajador — Escenario 3 (visible en historial)', () => {

  test('lista las compras del asesor específico, con la cédula convertida a número', async () => {
    compra.listarComprasTrabajador.mockResolvedValue([{ id: 50, cliente: 'Cliente A' }]);

    const resultado = await listarComprasTrabajador('3001');

    expect(compra.listarComprasTrabajador).toHaveBeenCalledWith(3001);
    expect(resultado.length).toBe(1);
  });

});