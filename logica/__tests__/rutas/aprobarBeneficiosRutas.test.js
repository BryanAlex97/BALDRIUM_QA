// __tests__/rutas/aprobarBeneficiosRutas.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  beneficio: {
    listarEnRevision: jest.fn(),
    listarProductosDisponibles: jest.fn(),
    cambiarEstado: jest.fn(),
  },
}));

const { beneficio } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

const BASE = '/api/auxiliar-administrativo/aprobar-beneficios';

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

describe('GET /api/auxiliar-administrativo/aprobar-beneficios — Escenario 1', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Auxiliar Administrativo', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con los beneficios en revisión', async () => {
    const token = generarToken(['Auxiliar Administrativo']);
    beneficio.listarEnRevision.mockResolvedValue([{ ID: 1, NombreCliente: 'Auronplay' }]);

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

});

describe('GET /api/auxiliar-administrativo/aprobar-beneficios/productos', () => {

  test('responde 200 con los productos disponibles', async () => {
    const token = generarToken(['Auxiliar Administrativo']);
    beneficio.listarProductosDisponibles.mockResolvedValue([{ ID: 5, Nombre: 'Kit de cocina', Cantidad: 3 }]);

    const res = await request(app).get(`${BASE}/productos`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

});

describe('POST /api/auxiliar-administrativo/aprobar-beneficios/:id/estado — Escenarios 1 y 2', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).post(`${BASE}/1/estado`).send({});
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Auxiliar Administrativo', async () => {
    const token = generarToken(['Director']);
    const res = await request(app)
      .post(`${BASE}/1/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Aceptado', inventarioId: 5, motivo: 'Cumple requisitos' });
    expect(res.status).toBe(403);
  });

  test('responde 200 al aprobar con producto e inventario (Escenario 1 y 2: descuenta stock)', async () => {
    const token = generarToken(['Auxiliar Administrativo']);
    beneficio.cambiarEstado.mockResolvedValue();

    const res = await request(app)
      .post(`${BASE}/1/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Aceptado', inventarioId: 5, motivo: 'Cumple todos los requisitos' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('responde 400 si el producto no tiene stock disponible', async () => {
    const token = generarToken(['Auxiliar Administrativo']);
    beneficio.cambiarEstado.mockRejectedValue(new Error('"Kit de cocina" no tiene existencias disponibles'));

    const res = await request(app)
      .post(`${BASE}/1/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Aceptado', inventarioId: 5, motivo: 'Aprobado' });

    expect(res.status).toBe(400);
  });

  test('responde 400 si falta el motivo', async () => {
    const token = generarToken(['Auxiliar Administrativo']);
    beneficio.cambiarEstado.mockRejectedValue(new Error('El motivo de la aprobación o el rechazo es obligatorio'));

    const res = await request(app)
      .post(`${BASE}/1/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Aceptado', inventarioId: 5, motivo: '' });

    expect(res.status).toBe(400);
  });

  test('responde 200 al rechazar sin necesitar inventario', async () => {
    const token = generarToken(['Auxiliar Administrativo']);
    beneficio.cambiarEstado.mockResolvedValue();

    const res = await request(app)
      .post(`${BASE}/2/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Rechazado', motivo: 'No cumple el mínimo de referidos' });

    expect(res.status).toBe(200);
  });

});