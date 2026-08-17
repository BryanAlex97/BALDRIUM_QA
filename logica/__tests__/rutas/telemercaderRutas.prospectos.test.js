// __tests__/rutas/telemercaderRutas.prospectos.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  prospecto: {
    listarPendientes: jest.fn(),
    listarEnGestion: jest.fn(),
    buscarPendientes: jest.fn(),
    buscarEnGestion: jest.fn(),
    agendarVisita: jest.fn(),
    cambiarEstado: jest.fn(),
    crearYAgendar: jest.fn(),
  },
  visita: {},
  trabajador: {},
  beneficio: {},
}));

const { prospecto } = require('../../src/infraestructura/persistenciaCliente');
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

describe('GET /api/telemercadeo/prospectos/pendientes — Escenario 1', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/prospectos/pendientes');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Telemercaderista', async () => {
    const token = generarToken(['Coordinador']);
    const res = await request(app).get('/api/telemercadeo/prospectos/pendientes').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con la lista de prospectos pendientes (siendo Telemercaderista)', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.listarPendientes.mockResolvedValue([{ id: 1, nombre: 'Cliente A' }]);

    const res = await request(app).get('/api/telemercadeo/prospectos/pendientes').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

});

describe('GET /api/telemercadeo/prospectos/en-gestion — Escenario 1', () => {

  test('responde 403 si no tiene el rol correcto', async () => {
    const token = generarToken(['Director']);
    const res = await request(app).get('/api/telemercadeo/prospectos/en-gestion').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('responde 200 con la lista en gestión', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.listarEnGestion.mockResolvedValue([]);

    const res = await request(app).get('/api/telemercadeo/prospectos/en-gestion').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

});

describe('GET /api/telemercadeo/prospectos/pendientes/buscar', () => {

  test('pasa el término de búsqueda al servicio', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.buscarPendientes.mockResolvedValue([]);

    await request(app)
      .get('/api/telemercadeo/prospectos/pendientes/buscar?q=Juan')
      .set('Authorization', `Bearer ${token}`);

    expect(prospecto.buscarPendientes).toHaveBeenCalledWith('Juan');
  });

});

describe('POST /api/telemercadeo/prospectos/:id/estado — Escenario 2', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).post('/api/telemercadeo/prospectos/5/estado').send({ estado: 'interesado' });
    expect(res.status).toBe(401);
  });

  test('responde 403 si no tiene el rol Telemercaderista', async () => {
    const token = generarToken(['Coordinador']);
    const res = await request(app)
      .post('/api/telemercadeo/prospectos/5/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'interesado' });
    expect(res.status).toBe(403);
  });

  test('responde 200 al cambiar el estado correctamente', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.cambiarEstado.mockResolvedValue();

    const res = await request(app)
      .post('/api/telemercadeo/prospectos/5/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'interesado' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('hallazgo: acepta un valor de estado no reconocido sin validación (200 OK)', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.cambiarEstado.mockResolvedValue();

    const res = await request(app)
      .post('/api/telemercadeo/prospectos/5/estado')
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'estado-que-no-deberia-existir' });

    // Documenta el comportamiento actual: no hay validación de valores permitidos
    expect(res.status).toBe(200);
  });

});

describe('POST /api/telemercadeo/prospectos/:id/agendar-visita', () => {

  test('responde 200 al agendar correctamente', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.agendarVisita.mockResolvedValue({ visitaId: 10 });

    const res = await request(app)
      .post('/api/telemercadeo/prospectos/5/agendar-visita')
      .set('Authorization', `Bearer ${token}`)
      .send({ fecha: '2026-08-20', direccion: 'CL 1' });

    expect(res.status).toBe(200);
  });

  test('responde 400 si el servicio lanza un error', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.agendarVisita.mockRejectedValue(new Error('Datos inválidos'));

    const res = await request(app)
      .post('/api/telemercadeo/prospectos/5/agendar-visita')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

});

describe('POST /api/telemercadeo/prospectos/nueva-agenda — Escenario 2/3', () => {

  test('responde 200 y crea el prospecto con agenda', async () => {
    const token = generarToken(['Telemercaderista']);
    prospecto.crearYAgendar.mockResolvedValue({ id: 99 });

    const res = await request(app)
      .post('/api/telemercadeo/prospectos/nueva-agenda')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nuevo Prospecto', celular: '3001234567' });

    expect(res.status).toBe(200);
  });

});