// __tests__/servicios/visitaServicio.listar.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    listarMes: jest.fn(),
    buscar: jest.fn(),
  },
  auditoria: {},
}));

const { visita } = require('../../src/infraestructura/persistenciaCliente');
const { listarMes, buscar } = require('../../src/servicios/Telemercadeo/AsesorComercial/visitaServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('visitaServicio.listarMes — Escenario 1 y 2 (filtro por mes)', () => {

  test('lista las visitas del mes actual para el asesor específico', async () => {
    visita.listarMes.mockResolvedValue([{ id: 1, cliente: 'Cliente A', estado: 'Pendiente' }]);

    const resultado = await listarMes('3001');

    expect(visita.listarMes).toHaveBeenCalledWith('3001', expect.any(Number), expect.any(Number));
    expect(resultado.length).toBe(1);
  });

  test('devuelve lista vacía si el asesor no tiene visitas ese mes', async () => {
    visita.listarMes.mockResolvedValue([]);
    const resultado = await listarMes('3001');
    expect(resultado).toEqual([]);
  });

});

describe('visitaServicio.buscar — Escenario 2 (filtro por búsqueda)', () => {

  test('pasa la cédula del asesor y el término de búsqueda correctamente', async () => {
    visita.buscar.mockResolvedValue([{ id: 2, cliente: 'Cliente B' }]);

    const resultado = await buscar('3001', 'Cliente B');

    expect(visita.buscar).toHaveBeenCalledWith('3001', 'Cliente B');
    expect(resultado.length).toBe(1);
  });

  test('devuelve lista vacía si no hay coincidencias', async () => {
    visita.buscar.mockResolvedValue([]);
    const resultado = await buscar('3001', 'NoExiste');
    expect(resultado).toEqual([]);
  });

  test('aislamiento: la búsqueda siempre se limita a las visitas del asesor específico', async () => {
    visita.buscar.mockResolvedValue([]);

    await buscar('3001', 'Juan');
    await buscar('3002', 'Juan');

    expect(visita.buscar).toHaveBeenNthCalledWith(1, '3001', 'Juan');
    expect(visita.buscar).toHaveBeenNthCalledWith(2, '3002', 'Juan');
  });

});