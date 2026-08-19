// __tests__/servicios/telemercaderServicio.elegibilidad.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  beneficio: {
    listarComprasElegibles: jest.fn(),
    listarReferidosDeCompraBeneficio: jest.fn(),
  },
  prospecto: {}, visita: {}, trabajador: {},
}));

const { beneficio } = require('../../src/infraestructura/persistenciaCliente');
const { listarComprasElegiblesBeneficio } = require('../../src/servicios/Telemercadeo/Telemercader/telemercaderServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('telemercaderServicio.listarComprasElegiblesBeneficio — Escenarios 1 y 2', () => {

  test('devuelve solo los clientes que YA cumplen las condiciones de elegibilidad (Escenario 1: validación automática)', async () => {
    beneficio.listarComprasElegibles.mockResolvedValue([
      { cliente: 'Auronplay', totalCompra: 500000, referidosVisitados: 2, elegible: true },
    ]);

    const resultado = await listarComprasElegiblesBeneficio();

    expect(resultado.length).toBe(1);
    expect(resultado[0].elegible).toBe(true);
  });

  test('la lista incluye información del cliente y su estado (Escenario 2)', async () => {
    beneficio.listarComprasElegibles.mockResolvedValue([
      { cliente: 'Cliente A', cedula: '2001', totalCompra: 600000, estado: 'pendiente' },
    ]);

    const resultado = await listarComprasElegiblesBeneficio();

    expect(resultado[0]).toHaveProperty('cliente');
    expect(resultado[0]).toHaveProperty('estado');
  });

  test('devuelve lista vacía si ningún cliente cumple las condiciones actuales', async () => {
    beneficio.listarComprasElegibles.mockResolvedValue([]);
    const resultado = await listarComprasElegiblesBeneficio();
    expect(resultado).toEqual([]);
  });

});