// __tests__/rutas/usuarioRutas.cambiarEstado.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCedula: jest.fn(),
    cambiarEstado: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
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

const trabajadorExistente = {
  trabajador: { Cedula: '2001', Nombre: 'Fer', Activo: true },
  roles: ['Director'],
};

describe('PATCH /api/Usuario/:cedula/estado', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).patch('/api/Usuario/2001/estado').send({ activo: false });
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Director', async () => {
    const token = generarToken(['Asesor Comercial']);

    const res = await request(app)
      .patch('/api/Usuario/2001/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false });

    expect(res.status).toBe(403);
  });

  test('responde 404 si la cédula no existe (siendo Director)', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/Usuario/9999999/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false });

    expect(res.status).toBe(404);
  });

  test('responde 200 al desactivar correctamente', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.cambiarEstado.mockResolvedValue();

    const res = await request(app)
      .patch('/api/Usuario/2001/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/desactivado/);
  });

  test('responde 200 al activar correctamente', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.cambiarEstado.mockResolvedValue();

    const res = await request(app)
      .patch('/api/Usuario/2001/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: true });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/activado/);
  });

});