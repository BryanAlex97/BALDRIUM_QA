// __tests__/servicios/compraServicio.referidos.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  compra: {
    crearCompra: jest.fn(),
  },
}));

const { compra } = require('../../src/infraestructura/persistenciaCliente');
const { crearCompra } = require('../../src/servicios/Telemercadeo/AsesorComercial/compraServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('compraServicio.crearCompra — Escenarios 1 y 2 (registrar referidos)', () => {

  const actor = { cedula: '3001', nombre: 'Asesor' };
  const items = [{ inventarioId: 1, cantidad: 1, valorUnitario: 50000 }];

  test('registra la compra con uno o más referidos (Escenario 1)', async () => {
    const referidos = [
      { nombre: 'Referido A', celular: '3001112233' },
      { nombre: 'Referido B', celular: '3004445566' },
    ];
    compra.crearCompra.mockResolvedValue({ compraId: 50, referidosCreados: 2 });

    const resultado = await crearCompra('2001', actor, 'Efectivo', '', items, referidos, {});

    expect(compra.crearCompra).toHaveBeenCalledWith('2001', actor, 'Efectivo', '', items, referidos, {});
    expect(resultado.referidosCreados).toBe(2);
  });

  test('permite registrar la compra sin ningún referido (opcional)', async () => {
    compra.crearCompra.mockResolvedValue({ compraId: 51 });

    await crearCompra('2001', actor, 'Efectivo', '', items, [], {});

    expect(compra.crearCompra).toHaveBeenCalledWith('2001', actor, 'Efectivo', '', items, [], {});
  });

  test('un solo referido también se acepta correctamente', async () => {
    const unReferido = [{ nombre: 'Referido Único', celular: '3009998877' }];
    compra.crearCompra.mockResolvedValue({ compraId: 52 });

    await crearCompra('2001', actor, 'Efectivo', '', items, unReferido, {});

    expect(compra.crearCompra).toHaveBeenCalledWith('2001', actor, 'Efectivo', '', items, unReferido, {});
  });

});

describe('telemercaderServicio.listarReferidosDeCompraBeneficio — Escenario 3 (gestión posterior)', () => {

  beforeEach(() => {
    jest.resetModules();
  });

  test('los referidos quedan disponibles para consulta posterior por Telemercadeo', async () => {
    jest.doMock('../../src/infraestructura/persistenciaCliente', () => ({
      beneficio: {
        listarReferidosDeCompra: jest.fn().mockResolvedValue([
          { nombre: 'Referido A', celular: '3001112233', estado: 'pendiente' },
        ]),
      },
      prospecto: {}, visita: {}, trabajador: {},
    }));

    const { listarReferidosDeCompraBeneficio } = require('../../src/servicios/Telemercadeo/Telemercader/telemercaderServicio');
    const resultado = await listarReferidosDeCompraBeneficio(50);

    expect(resultado.length).toBe(1);
    expect(resultado[0]).toHaveProperty('estado');
  });

});