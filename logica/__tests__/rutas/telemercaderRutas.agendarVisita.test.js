// __tests__/rutas/telemercaderRutas.agendarVisita.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  prospecto: {
    agendarVisita: jest.fn(),
    crearYAgendar: jest.fn(),
  },
  visita: {
    listarSemana: jest.fn(),
    kpiSemana: jest.fn(),
    cambiarEstado: jest.fn(),
  },
  trabajador: {},
  beneficio: {},
}));

const { prospecto, visita } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
});

afterEach(() => {
  jest.clearAllMocks();
});

function generarToken(roles, cedula = '2001') {
  return jwt.sign(
    { cedula, nombre: 'Fer', roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('POST /api/telemercadeo/prospectos/:id/agendar-visita — Escenarios 1 y 2', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).post('/api/telemercadeo/prospectos/5/agendar-visita').send({});
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Telemercaderista', async () => {
    const token = generarToken(['Asesor comercial']);
    const res = await request(app)
      .post('/api/telemercadeo/prospectos/5/agendar-visita')
      .set('Authorization', `Bearer ${token}`)
      .send({ fecha: '2026-08-25', hora: '10:00', asesorCedula: '3001' });
    expect(res.status).toBe(403);
  });

  test('responde 200 al agendar con fecha, hora, asesor y observaciones (Escenarios 1 y 2)', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.agendarVisita.mockResolvedValue({ visitaId: 15 });

    const res = await request(app)
      .post('/api/telemercadeo/prospectos/5/agendar-visita')
      .set('Authorization', `Bearer ${token}`)
      .send({ fecha: '2026-08-25', hora: '10:00', asesorCedula: '3001', observaciones: 'Cliente interesado' });

    expect(res.status).toBe(200);
    expect(res.body.visitaId).toBe(15);
  });

});

describe('GET /api/telemercadeo/visitas/semana — Escenario 3 (visibilidad del asesor)', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/visitas/semana');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app).get('/api/telemercadeo/visitas/semana').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con solo las visitas del asesor autenticado (cédula tomada del token, no de un parámetro)', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    visita.listarSemana.mockResolvedValue([{ id: 15, prospecto: 'Cliente A' }]);
    visita.kpiSemana.mockResolvedValue({ total: 1 });

    const res = await request(app).get('/api/telemercadeo/visitas/semana').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(visita.listarSemana).toHaveBeenCalledWith('3001', expect.any(String), expect.any(String));
    expect(res.body.visitas.length).toBe(1);
  });

  test('un asesor con otra cédula no puede ver visitas de un tercero (aislamiento por token)', async () => {
    const tokenAsesorA = generarToken(['Asesor comercial'], '3001');
    visita.listarSemana.mockResolvedValue([]);
    visita.kpiSemana.mockResolvedValue({ total: 0 });

    await request(app).get('/api/telemercadeo/visitas/semana').set('Authorization', `Bearer ${tokenAsesorA}`);

    const [cedulaUsada] = visita.listarSemana.mock.calls[0];
    expect(cedulaUsada).toBe('3001');
    expect(cedulaUsada).not.toBe('9999999');
  });

});