// __tests__/rutas/asesorComercialRutas.cambiarEstado.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    cambiarEstado: jest.fn(),
    guardarSuplemento: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
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

function generarToken(roles, cedula = '3001') {
  return jwt.sign(
    { cedula, nombre: 'Asesor', roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('POST /api/telemercadeo/visitas/estado — Escenarios 1, 2 y 3', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).post('/api/telemercadeo/visitas/estado').send({ visitaId: 15, estado: 'Pendiente' });
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app)
      .post('/api/telemercadeo/visitas/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ visitaId: 15, estado: 'Pendiente' });
    expect(res.status).toBe(403);
  });

  test('responde 200 al cambiar el estado correctamente (Escenario 1 y 3)', async () => {
    const token = generarToken(['Asesor comercial']);
    visita.cambiarEstado.mockResolvedValue();

    const res = await request(app)
      .post('/api/telemercadeo/visitas/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ visitaId: 15, estado: 'Rechaza', notas: 'Cliente no interesado' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('responde 400 si el servicio lanza un error', async () => {
    const token = generarToken(['Asesor comercial']);
    visita.cambiarEstado.mockRejectedValue(new Error('Visita no encontrada'));

    const res = await request(app)
      .post('/api/telemercadeo/visitas/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ visitaId: 999, estado: 'Visitado' });

    expect(res.status).toBe(400);
  });

});

describe('POST /api/telemercadeo/visitas/estado — Escenarios 4 y 5 (suplementos)', () => {

  test('responde 200 y guarda suplementos cuando el estado es "Visitado" con suplementos', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    visita.cambiarEstado.mockResolvedValue();
    visita.guardarSuplemento.mockResolvedValue();

    const res = await request(app)
      .post('/api/telemercadeo/visitas/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ visitaId: 15, estado: 'Visitado', suplementos: [{ inventarioId: 1, cantidad: 2 }] });

    expect(res.status).toBe(200);
    // El actor viene completo del JWT decodificado (cédula, nombre, roles, etc.),
    // no solo cédula/nombre como en las pruebas unitarias con mock manual.
    expect(visita.guardarSuplemento).toHaveBeenCalledWith(
      15,
      [{ inventarioId: 1, cantidad: 2 }],
      expect.objectContaining({ cedula: '3001', nombre: 'Asesor' })
    );
  });

  test('hallazgo: responde 200 (éxito) aunque falle el guardado de suplementos internamente', async () => {
    const token = generarToken(['Asesor comercial']);
    visita.cambiarEstado.mockResolvedValue();
    visita.guardarSuplemento.mockRejectedValue(new Error('Fallo de conexión'));

    const res = await request(app)
      .post('/api/telemercadeo/visitas/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ visitaId: 15, estado: 'Visitado', suplementos: [{ inventarioId: 1, cantidad: 2 }] });

    // Documenta el comportamiento actual: la ruta responde éxito
    // aunque el registro de suplementos haya fallado silenciosamente
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

});