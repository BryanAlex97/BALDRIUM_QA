// __tests__/rutas/usuarioRutas.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    existeCedula: jest.fn(),
    existeCorreo: jest.fn(),
    existeCodigoTrabajador: jest.fn(),
    crearTrabajador: jest.fn(),
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

const datosValidos = {
  Cedula: '300111222',
  Contrasena: 'claveSegura123',
  Nombre: 'Nuevo Trabajador',
  Celular: '3001112233',
  CorreoElectronico: 'nuevo@baldrium.com',
  Direccion: 'CL 10 # 5-20',
  CodigoTrabajador: 'T-100',
};

function mockValidacionesLimpias() {
  trabajador.existeCedula.mockResolvedValue(false);
  trabajador.existeCorreo.mockResolvedValue(false);
  trabajador.existeCodigoTrabajador.mockResolvedValue(false);
}

describe('POST /api/Usuario — casos base', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).post('/api/Usuario').send(datosValidos);
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Director', async () => {
    const token = generarToken(['Asesor Comercial']);
    const res = await request(app).post('/api/Usuario').set('Authorization', `Bearer ${token}`).send(datosValidos);
    expect(res.status).toBe(403);
  });

  test('responde 400 si faltan campos requeridos (siendo Director)', async () => {
    const token = generarToken(['Director']);
    const res = await request(app).post('/api/Usuario').set('Authorization', `Bearer ${token}`).send({ Cedula: '300111222' });
    expect(res.status).toBe(400);
  });

  test('responde 400 si el nombre tiene formato inválido (nueva validación)', async () => {
    const token = generarToken(['Director']);
    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Nombre: 'Juan123', roles: [1] });
    expect(res.status).toBe(400);
  });

  test('responde 409 si la cédula ya está registrada', async () => {
    const token = generarToken(['Director']);
    trabajador.existeCedula.mockResolvedValue(true);
    const res = await request(app).post('/api/Usuario').set('Authorization', `Bearer ${token}`).send({ ...datosValidos, roles: [1] });
    expect(res.status).toBe(409);
  });

  test('responde 409 si el código de trabajador ya está en uso', async () => {
    const token = generarToken(['Director']);
    trabajador.existeCedula.mockResolvedValue(false);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(true);
    const res = await request(app).post('/api/Usuario').set('Authorization', `Bearer ${token}`).send({ ...datosValidos, roles: [1] });
    expect(res.status).toBe(409);
  });

  test('responde 201 y crea el usuario si los datos son correctos', async () => {
    const token = generarToken(['Director']);
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '300111222', Nombre: 'Nuevo Trabajador' });

    const res = await request(app).post('/api/Usuario').set('Authorization', `Bearer ${token}`).send({ ...datosValidos, roles: [1] });

    expect(res.status).toBe(201);
    expect(res.body.trabajador.Cedula).toBe('300111222');
  });

});

describe('POST /api/Usuario — robustez (hallazgos de HU-02 resueltos)', () => {

  test('nombre con inyección SQL ahora es rechazado con 400 (antes: aceptado)', async () => {
    const token = generarToken(['Director']);
    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Nombre: "Robert'; DROP TABLE trabajador;--", roles: [1] });
    expect(res.status).toBe(400);
  });

  test('cédula con letras ahora es rechazada con 400 (antes: aceptada)', async () => {
    const token = generarToken(['Director']);
    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Cedula: 'abc123456', roles: [1] });
    expect(res.status).toBe(400);
  });

  test('sin ningún rol responde 400 (antes: aceptado)', async () => {
    const token = generarToken(['Director']);
    mockValidacionesLimpias();
    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, roles: [] });
    expect(res.status).toBe(400);
  });

});