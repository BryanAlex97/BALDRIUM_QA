// __tests__/rutas/usuarioRutas.parametrosBeneficio.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  beneficio: {
    obtenerParametros: jest.fn(),
    actualizarParametros: jest.fn(),
  },
  trabajador: {},
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

describe('GET /api/Usuario/parametros-beneficio — Escenario 1', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/Usuario/parametros-beneficio');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Director', async () => {
    const token = generarToken(['Coordinador']);
    const res = await request(app).get('/api/Usuario/parametros-beneficio').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con los parámetros actuales (siendo Director)', async () => {
    const token = generarToken(['Director']);
    beneficio.obtenerParametros.mockResolvedValue({
      valorMinimoCompra: 500000, minimoReferidosVisitados: 10, valorMinimoCompraReferido: 200000,
    });

    const res = await request(app).get('/api/Usuario/parametros-beneficio').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.minimoReferidosVisitados).toBe(10);
  });

});

describe('PUT /api/Usuario/parametros-beneficio — Escenario 2', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).put('/api/Usuario/parametros-beneficio').send({});
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Director', async () => {
    const token = generarToken(['Coordinador']);
    const res = await request(app)
      .put('/api/Usuario/parametros-beneficio')
      .set('Authorization', `Bearer ${token}`)
      .send({ valorMinimoCompra: 600000, minimoReferidosVisitados: 15, valorMinimoCompraReferido: 250000 });
    expect(res.status).toBe(403);
  });

  test('responde 200 al actualizar correctamente (siendo Director)', async () => {
    const token = generarToken(['Director']);
    beneficio.actualizarParametros.mockResolvedValue({ ok: true });

    const res = await request(app)
      .put('/api/Usuario/parametros-beneficio')
      .set('Authorization', `Bearer ${token}`)
      .send({ valorMinimoCompra: 600000, minimoReferidosVisitados: 15, valorMinimoCompraReferido: 250000 });

    expect(res.status).toBe(200);
  });

  test('responde 400 si el servicio lanza un error', async () => {
    const token = generarToken(['Director']);
    beneficio.actualizarParametros.mockRejectedValue(new Error('Error al guardar parámetros.'));

    const res = await request(app)
      .put('/api/Usuario/parametros-beneficio')
      .set('Authorization', `Bearer ${token}`)
      .send({ valorMinimoCompra: -100, minimoReferidosVisitados: -5, valorMinimoCompraReferido: -50 });

    expect(res.status).toBe(400);
  });

});