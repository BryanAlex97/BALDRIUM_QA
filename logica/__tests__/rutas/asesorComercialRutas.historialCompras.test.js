// __tests__/rutas/asesorComercialRutas.historialCompras.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  compra: {
    listarComprasTrabajadorSemana: jest.fn(),
    listarComprasTrabajadorMes: jest.fn(),
    buscarComprasTrabajador: jest.fn(),
    kpiComprasMes: jest.fn(),
  },
}));

const { compra } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
});

afterEach(() => {
  jest.clearAllMocks();
});

function generarToken(roles, cedula = '3001') {
  return jwt.sign(
    { cedula, nombre: 'Asesor', roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('GET /api/telemercadeo/compras/mis-compras/semana — Escenario 1', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/compras/mis-compras/semana');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app).get('/api/telemercadeo/compras/mis-compras/semana').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con las compras de la semana', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    compra.listarComprasTrabajadorSemana.mockResolvedValue([{ id: 50, cliente: 'Cliente A' }]);

    const res = await request(app).get('/api/telemercadeo/compras/mis-compras/semana').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

});

describe('GET /api/telemercadeo/compras/mis-compras/mes — Escenario 1', () => {

  test('responde 200 con las compras del mes', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    compra.listarComprasTrabajadorMes.mockResolvedValue([{ id: 51 }]);

    const res = await request(app).get('/api/telemercadeo/compras/mis-compras/mes').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

});

describe('GET /api/telemercadeo/compras/mis-compras/buscar — Escenario 3', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/compras/mis-compras/buscar?q=Juan');
    expect(res.status).toBe(401);
  });

    test('responde 200 y filtra por el término de búsqueda', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    compra.buscarComprasTrabajador.mockResolvedValue([{ id: 52, cliente: 'Juan Pérez' }]);

    const res = await request(app).get('/api/telemercadeo/compras/mis-compras/buscar?q=Juan').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // La cédula se convierte a número antes de consultar persistencia
    expect(compra.buscarComprasTrabajador).toHaveBeenCalledWith(3001, 'Juan');
  });

});

describe('GET /api/telemercadeo/compras/mis-compras/kpi-mes', () => {

  test('responde 200 con los indicadores del mes', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    compra.kpiComprasMes.mockResolvedValue({ totalCompras: 5 });

    const res = await request(app).get('/api/telemercadeo/compras/mis-compras/kpi-mes').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalCompras).toBe(5);
  });

});