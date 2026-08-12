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
  Cedula: '3001',
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

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send(datosValidos);

    expect(res.status).toBe(403);
  });

  test('responde 400 si faltan campos requeridos (siendo Director)', async () => {
    const token = generarToken(['Director']);

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ Cedula: '3001' });

    expect(res.status).toBe(400);
  });

  test('responde 409 si la cédula ya está registrada', async () => {
    const token = generarToken(['Director']);
    trabajador.existeCedula.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send(datosValidos);

    expect(res.status).toBe(409);
  });

  test('responde 409 si el código de trabajador ya está en uso (NUEVO)', async () => {
    const token = generarToken(['Director']);
    trabajador.existeCedula.mockResolvedValue(false);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send(datosValidos);

    expect(res.status).toBe(409);
  });

  test('responde 201 y crea el producto si los datos son correctos', async () => {
    const token = generarToken(['Director']);
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3001', Nombre: 'Nuevo Trabajador' });

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, roles: [1] });

    expect(res.status).toBe(201);
    expect(res.body.trabajador.Cedula).toBe('3001');
  });

});

describe('POST /api/Usuario — robustez ante datos maliciosos/raros (NUEVO)', () => {

  test('nombre con inyección tipo SQL no rompe el servidor (no 500)', async () => {
    const token = generarToken(['Director']);
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3002', Nombre: "Robert'; DROP TABLE trabajador;--" });

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Cedula: '3002', Nombre: "Robert'; DROP TABLE trabajador;--" });

    expect(res.status).toBe(201);
  });

  test('cédula con formato inválido (letras) no rompe el servidor', async () => {
    const token = generarToken(['Director']);
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: 'abc123', Nombre: 'Test' });

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Cedula: 'abc123' });

    // Documenta el comportamiento real: ¿el backend valida formato de cédula
    // o solo verifica que no esté vacía? Este test describe lo que pasa hoy.
    expect([201, 400]).toContain(res.status);
  });

  test('roles con valores no numéricos no rompe el servidor', async () => {
    const token = generarToken(['Director']);
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3003', Nombre: 'Test Roles' });

    const res = await request(app)
      .post('/api/Usuario')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Cedula: '3003', roles: ['no-es-un-numero'] });

    expect(res.status).not.toBe(500);
  });

});

describe('POST /api/Usuario — concurrencia (NUEVO)', () => {

  test('dos peticiones simultáneas creando la misma cédula responden sin romper el servidor', async () => {
    const token = generarToken(['Director']);
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3004', Nombre: 'Concurrente' });

    const [res1, res2] = await Promise.all([
      request(app).post('/api/Usuario').set('Authorization', `Bearer ${token}`).send({ ...datosValidos, Cedula: '3004' }),
      request(app).post('/api/Usuario').set('Authorization', `Bearer ${token}`).send({ ...datosValidos, Cedula: '3004' }),
    ]);

    expect(res1.status).not.toBe(500);
    expect(res2.status).not.toBe(500);
  });

});