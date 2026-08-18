// __tests__/rutas/asesorComercialRutas.listar.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    listarMes: jest.fn(),
    buscar: jest.fn(),
  },
  auditoria: {},
}));

const { visita } = require('../../src/infraestructura/persistenciaCliente');
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

describe('GET /api/telemercadeo/visitas/mes — Escenario 1 y 2', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/visitas/mes');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app).get('/api/telemercadeo/visitas/mes').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con las visitas del mes, filtradas por la cédula del token', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    visita.listarMes.mockResolvedValue([{ id: 1, cliente: 'Cliente A' }]);

    const res = await request(app).get('/api/telemercadeo/visitas/mes').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(visita.listarMes).toHaveBeenCalledWith('3001', expect.any(Number), expect.any(Number));
    expect(res.body.length).toBe(1);
  });

});

describe('GET /api/telemercadeo/visitas/buscar — Escenario 2 (filtrar)', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/visitas/buscar?q=Juan');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app).get('/api/telemercadeo/visitas/buscar?q=Juan').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 y pasa el término de búsqueda junto con la cédula del token', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    visita.buscar.mockResolvedValue([{ id: 2, cliente: 'Cliente B' }]);

    const res = await request(app).get('/api/telemercadeo/visitas/buscar?q=Juan').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(visita.buscar).toHaveBeenCalledWith('3001', 'Juan');
  });

  test('responde 200 con lista vacía si no se envía término de búsqueda (q por defecto vacío)', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    visita.buscar.mockResolvedValue([]);

    const res = await request(app).get('/api/telemercadeo/visitas/buscar').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(visita.buscar).toHaveBeenCalledWith('3001', '');
  });

});