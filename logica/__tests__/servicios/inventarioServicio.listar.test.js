// __tests__/servicios/inventarioServicio.listar.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  inventario: {
    listarTodos: jest.fn(),
  },
}));

const { inventario } = require('../../src/infraestructura/persistenciaCliente');
const { listar } = require('../../src/servicios/Inventario/inventarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('inventarioServicio.listar', () => {

  test('devuelve la lista de productos con los campos disponibles', async () => {
    const listaSimulada = [
      { ID: 1, Nombre: 'Olla', Descripcion: 'Acero', Tipo: 'Inventario de cocina', Valor: 100, Cantidad: 5, FechaVencimiento: null, FechaActualizacion: '2026-08-17' },
    ];
    inventario.listarTodos.mockResolvedValue(listaSimulada);

    const resultado = await listar();

    expect(inventario.listarTodos).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual(listaSimulada);
  });

  test('devuelve lista vacía si no hay productos', async () => {
    inventario.listarTodos.mockResolvedValue([]);
    const resultado = await listar();
    expect(resultado).toEqual([]);
  });

  test('hallazgo: los registros no incluyen campo de Estado ni umbral de Stock mínimo', async () => {
    inventario.listarTodos.mockResolvedValue([
      { ID: 1, Nombre: 'Olla', Tipo: 'Inventario de cocina', Cantidad: 5 },
    ]);

    const resultado = await listar();

    expect(resultado[0]).not.toHaveProperty('Estado');
    expect(resultado[0]).not.toHaveProperty('StockMinimo');
  });

});