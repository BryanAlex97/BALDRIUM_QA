// __tests__/rutas/usuarioRutas.listar.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    listarTodosConRoles: jest.fn(),
  },
}));

const { trabajador } = require('../../src/infraestructura/persistenciaCliente');
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

describe('GET /api/Usuario', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/Usuario');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Director', async () => {
    const token = generarToken(['Asesor Comercial']);

    const res = await request(app)
      .get('/api/Usuario')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test('responde 200 con la lista de usuarios (siendo Director)', async () => {
    const token = generarToken(['Director']);
    trabajador.listarTodosConRoles.mockResolvedValue([
      { Cedula: '2001', Nombre: 'Fer', roles: [{ tipoRol: 'Director' }] },
    ]);

    const res = await request(app)
      .get('/api/Usuario')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

});