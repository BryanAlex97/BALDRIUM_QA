// __tests__/servicios/telemercaderServicio.contactosReferidos.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  prospecto: {
    listarPendientes: jest.fn(),
    listarEnGestion: jest.fn(),
    cambiarEstado: jest.fn(),
  },
  beneficio: {
    listarReferidosDeCompra: jest.fn(),
  },
  visita: {},
  trabajador: {},
}));

const { prospecto, beneficio } = require('../../src/infraestructura/persistenciaCliente');
const {
  listarPendientes, listarEnGestion, cambiarEstadoProspecto, listarReferidosDeCompraBeneficio,
} = require('../../src/servicios/Telemercadeo/Telemercader/telemercaderServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('telemercaderServicio — Escenario 1 (listado de contactos y referidos)', () => {

  test('lista contactos pendientes con su información de contacto y estado', async () => {
    prospecto.listarPendientes.mockResolvedValue([
      { id: 1, nombre: 'Cliente A', celular: '3001234567', estado: 'pendiente' },
    ]);

    const resultado = await listarPendientes();

    expect(resultado[0]).toHaveProperty('celular');
    expect(resultado[0]).toHaveProperty('estado');
  });

  test('lista contactos en gestión (seguimiento)', async () => {
    prospecto.listarEnGestion.mockResolvedValue([
      { id: 2, nombre: 'Cliente B', estado: 'contactado' },
    ]);

    const resultado = await listarEnGestion();
    expect(resultado.length).toBe(1);
  });

  test('lista referidos de una compra específica', async () => {
    beneficio.listarReferidosDeCompra.mockResolvedValue([
      { nombre: 'Referido A', celular: '3009998877', estado: 'pendiente' },
    ]);

    const resultado = await listarReferidosDeCompraBeneficio(50);
    expect(resultado[0]).toHaveProperty('estado');
  });

});

describe('telemercaderServicio.cambiarEstadoProspecto — Escenario 2 (actualizar estado y seguimiento)', () => {

  test('actualiza el estado del contacto correctamente', async () => {
    prospecto.cambiarEstado.mockResolvedValue({ ok: true });

    await cambiarEstadoProspecto(1, 'contactado', { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(prospecto.cambiarEstado).toHaveBeenCalledWith(1, 'contactado', { actor: { cedula: '2001', nombre: 'Fer' } });
  });

});

describe('telemercaderServicio — Escenario 3 (exportar) — GAP CONFIRMADO', () => {

  test('documenta que no existe ninguna función de exportación en el backend', () => {
    // Búsqueda exhaustiva confirmó ausencia total de funcionalidad de exportación
    // (CSV, Excel, PDF) en servicios y rutas de todo el backend.
    expect(true).toBe(true); // placeholder — ver nota de QA en Jira
  });

});