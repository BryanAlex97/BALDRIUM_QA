// __tests__/servicios/compraServicio.historial.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  compra: {
    listarComprasTrabajadorSemana: jest.fn(),
    listarComprasTrabajadorMes: jest.fn(),
    buscarComprasTrabajador: jest.fn(),
    kpiComprasMes: jest.fn(),
  },
}));

const { compra } = require('../../src/infraestructura/persistenciaCliente');
const {
  listarComprasTrabajadorSemana, listarComprasTrabajadorMes,
  buscarComprasTrabajador, kpiComprasMes,
} = require('../../src/servicios/Telemercadeo/AsesorComercial/compraServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('compraServicio — Escenario 1 (listado de compras)', () => {

  test('lista las compras de la semana actual', async () => {
    compra.listarComprasTrabajadorSemana.mockResolvedValue([
      { id: 50, cliente: 'Cliente A', valorTotal: 150000, estado: 'Completada' },
    ]);

    const resultado = await listarComprasTrabajadorSemana('3001');

    expect(compra.listarComprasTrabajadorSemana).toHaveBeenCalledWith(3001, expect.any(String), expect.any(String));
    expect(resultado[0]).toHaveProperty('valorTotal');
    expect(resultado[0]).toHaveProperty('estado');
  });

  test('lista las compras del mes actual', async () => {
    compra.listarComprasTrabajadorMes.mockResolvedValue([{ id: 51, cliente: 'Cliente B' }]);

    const resultado = await listarComprasTrabajadorMes('3001');

    expect(compra.listarComprasTrabajadorMes).toHaveBeenCalledWith(3001, expect.any(Number), expect.any(Number));
    expect(resultado.length).toBe(1);
  });

  test('devuelve indicadores de compras del mes', async () => {
    compra.kpiComprasMes.mockResolvedValue({ totalCompras: 5, montoTotal: 750000 });

    const resultado = await kpiComprasMes('3001');

    expect(resultado.totalCompras).toBe(5);
  });

});

describe('compraServicio.buscarComprasTrabajador — Escenario 3 (filtrar)', () => {

  test('filtra por término de búsqueda (cliente)', async () => {
    compra.buscarComprasTrabajador.mockResolvedValue([{ id: 52, cliente: 'Juan Pérez' }]);

    const resultado = await buscarComprasTrabajador('3001', 'Juan');

    expect(compra.buscarComprasTrabajador).toHaveBeenCalledWith(3001, 'Juan');
    expect(resultado.length).toBe(1);
  });

  test('sin coincidencias devuelve lista vacía', async () => {
    compra.buscarComprasTrabajador.mockResolvedValue([]);
    const resultado = await buscarComprasTrabajador('3001', 'NoExiste');
    expect(resultado).toEqual([]);
  });

});