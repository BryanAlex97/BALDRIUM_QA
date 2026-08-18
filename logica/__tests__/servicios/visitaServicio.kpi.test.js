// __tests__/servicios/visitaServicio.kpi.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    kpiSemana: jest.fn(),
  },
  auditoria: {},
}));

const { visita } = require('../../src/infraestructura/persistenciaCliente');
const { kpiSemana } = require('../../src/servicios/Telemercadeo/AsesorComercial/visitaServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('visitaServicio.kpiSemana — Escenario 1 (indicadores de gestión)', () => {

  test('devuelve los indicadores del asesor para la semana actual', async () => {
    const kpiSimulado = { visitadas: 5, pendientes: 3, fallidas: 1, total: 9 };
    visita.kpiSemana.mockResolvedValue(kpiSimulado);

    const resultado = await kpiSemana('3001');

    expect(resultado).toEqual(kpiSimulado);
  });

  test('se calcula sobre el rango de la semana actual (lunes a domingo)', async () => {
    visita.kpiSemana.mockResolvedValue({ visitadas: 0, pendientes: 0, fallidas: 0 });

    await kpiSemana('3001');

    // Confirma que se pasa cédula + 2 fechas (inicio y fin de semana)
    expect(visita.kpiSemana).toHaveBeenCalledWith('3001', expect.any(String), expect.any(String));
  });

  test('devuelve indicadores en cero si el asesor no tiene actividad esta semana', async () => {
    visita.kpiSemana.mockResolvedValue({ visitadas: 0, pendientes: 0, fallidas: 0, total: 0 });

    const resultado = await kpiSemana('3001');

    expect(resultado.total).toBe(0);
  });

});

describe('visitaServicio.kpiSemana — Escenario 2 (aislamiento por asesor)', () => {

  test('cada llamada usa exclusivamente la cédula recibida como parámetro, sin mezclar datos de otros asesores', async () => {
    visita.kpiSemana.mockResolvedValue({ visitadas: 2 });

    await kpiSemana('3001');
    await kpiSemana('3002');

    expect(visita.kpiSemana).toHaveBeenNthCalledWith(1, '3001', expect.any(String), expect.any(String));
    expect(visita.kpiSemana).toHaveBeenNthCalledWith(2, '3002', expect.any(String), expect.any(String));
  });

});