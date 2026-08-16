// __tests__/rutas/usuarioRutas.listarAuditoria.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  auditoria: {
    listarSistema: jest.fn(),
  },
}));

const { auditoria } = require('../../src/infraestructura/persistenciaCliente');
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

describe('GET /api/Usuario/auditoria', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/Usuario/auditoria');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Director', async () => {
    const token = generarToken(['Asesor Comercial']);
    const res = await request(app).get('/api/Usuario/auditoria').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con el historial (siendo Director)', async () => {
    const token = generarToken(['Director']);
    auditoria.listarSistema.mockResolvedValue([
      { CedulaTrabajador: '2001', NombreTrabajador: 'Fer', TablaAfectada: 'trabajador', FechaHora: '2026-08-04T10:00:00Z' },
    ]);

    const res = await request(app).get('/api/Usuario/auditoria').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

});