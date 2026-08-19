// __tests__/rutas/telemercaderRutas.elegibilidad.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  beneficio: {
    listarComprasElegibles: jest.fn(),
  },
  prospecto: {}, visita: {}, trabajador: {},
}));

const { beneficio } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
});

afterEach(() => {
  jest.clearAllMocks();
});

function generarToken(roles) {
  return jwt.sign(
    { cedula: '2001', nombre: 'Fer', roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('GET /api/telemercadeo/beneficios/compras-elegibles — Escenarios 1 y 2', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/beneficios/compras-elegibles');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Telemercaderista', async () => {
    const token = generarToken(['Asesor comercial']);
    const res = await request(app).get('/api/telemercadeo/beneficios/compras-elegibles').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con los clientes elegibles (validación automática, Escenarios 1 y 2)', async () => {
    const token = generarToken(['Telemercaderista']);
    beneficio.listarComprasElegibles.mockResolvedValue([
      { cliente: 'Auronplay', totalCompra: 500000, referidosVisitados: 2, estado: 'pendiente' },
    ]);

    const res = await request(app).get('/api/telemercadeo/beneficios/compras-elegibles').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].cliente).toBe('Auronplay');
  });

  test('responde 200 con lista vacía si nadie cumple las condiciones', async () => {
    const token = generarToken(['Telemercaderista']);
    beneficio.listarComprasElegibles.mockResolvedValue([]);

    const res = await request(app).get('/api/telemercadeo/beneficios/compras-elegibles').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

});