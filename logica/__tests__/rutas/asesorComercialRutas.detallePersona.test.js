// __tests__/rutas/asesorComercialRutas.detallePersona.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    detallePersona: jest.fn(),
    historialCompras: jest.fn(),
    historialVisitas: jest.fn(),
  },
}));

const { visita } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
});

afterEach(() => {
  jest.clearAllMocks();
});

function generarToken(roles) {
  return jwt.sign(
    { cedula: '3001', nombre: 'Asesor', roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('GET /api/telemercadeo/persona/detalle — Escenario 1', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/persona/detalle?personaId=10');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app).get('/api/telemercadeo/persona/detalle?personaId=10').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con el detalle de la persona', async () => {
    const token = generarToken(['Asesor comercial']);
    visita.detallePersona.mockResolvedValue({ nombre: 'Auronplay', cedula: '1019108074' });

    const res = await request(app).get('/api/telemercadeo/persona/detalle?personaId=10').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Auronplay');
  });

  test('responde 404 si la persona no existe', async () => {
    const token = generarToken(['Asesor comercial']);
    visita.detallePersona.mockResolvedValue(null);

    const res = await request(app).get('/api/telemercadeo/persona/detalle?personaId=999').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

});

describe('GET /api/telemercadeo/persona/compras — historial de compras', () => {

  test('responde 200 con el historial de compras', async () => {
    const token = generarToken(['Asesor comercial']);
    visita.historialCompras.mockResolvedValue([{ id: 50, total: 1578000 }]);

    const res = await request(app).get('/api/telemercadeo/persona/compras?personaId=10').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

});

describe('GET /api/telemercadeo/persona/visitas — historial de visitas', () => {

  test('responde 200 con el historial de visitas', async () => {
    const token = generarToken(['Asesor comercial']);
    visita.historialVisitas.mockResolvedValue([{ id: 15, estado: 'Visitado' }]);

    const res = await request(app).get('/api/telemercadeo/persona/visitas?personaId=10').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body[0].estado).toBe('Visitado');
  });

});