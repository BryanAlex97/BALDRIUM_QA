// __tests__/servicios/visitaServicio.detallePersona.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    detallePersona: jest.fn(),
    historialCompras: jest.fn(),
    historialVisitas: jest.fn(),
  },
}));

const { visita } = require('../../src/infraestructura/persistenciaCliente');
const { detallePersona, historialCompras, historialVisitas } = require('../../src/servicios/Telemercadeo/AsesorComercial/visitaServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('visitaServicio — Escenario 1 (información detallada del cliente)', () => {

  test('obtiene el detalle de contacto y dirección de una persona', async () => {
    visita.detallePersona.mockResolvedValue({
      nombre: 'Auronplay', cedula: '1019108074', celular: '3001234567',
      correo: 'auron@mail.com', direccion: 'CL 1', estadoVisita: 'Visitado',
    });

    const resultado = await detallePersona(10);

    expect(resultado.nombre).toBe('Auronplay');
    expect(resultado).toHaveProperty('direccion');
  });

  test('devuelve el historial de compras del cliente', async () => {
    historialCompras.mockResolvedValue ? null : null; // no-op guard
    visita.historialCompras.mockResolvedValue([
      { id: 50, fecha: '2026-08-19', total: 1578000 },
    ]);

    const resultado = await historialCompras(10);
    expect(resultado.length).toBe(1);
  });

  test('devuelve el historial de visitas del cliente', async () => {
    visita.historialVisitas.mockResolvedValue([
      { id: 15, fecha: '2026-08-17', estado: 'Visitado' },
    ]);

    const resultado = await historialVisitas(10);
    expect(resultado[0].estado).toBe('Visitado');
  });

  test('devuelve null si la persona no existe', async () => {
    visita.detallePersona.mockResolvedValue(null);
    const resultado = await detallePersona(999);
    expect(resultado).toBeNull();
  });

});