// __tests__/rutas/authRutas.test.js
const request = require('supertest');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: { buscarPorCedula: jest.fn() },
  auditoria: { registrarSistema: jest.fn() },
}));

const { trabajador } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/login — casos base', () => {

  test('responde 400 si falta la cédula o la contraseña', async () => {
    const res = await request(app).post('/api/auth/login').send({ cedula: '2001' });
    expect(res.status).toBe(400);
  });

  test('responde 401 si las credenciales son inválidas', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '9999999', contrasena: 'x' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('responde 200 y un token si las credenciales son correctas', async () => {
    const bcrypt = require('bcrypt');
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: {
        Cedula: '2001', Nombre: 'Fer', Activo: true,
        Contrasena: await bcrypt.hash('123456', 10),
        Celular: '', Telefono: '', CorreoElectronico: '', Direccion: '', CodigoTrabajador: '',
      },
      roles: ['Director'],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '2001', contrasena: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

});

describe('POST /api/auth/login — robustez ante datos maliciosos/raros (NUEVO)', () => {

  test('cédula con inyección tipo SQL no rompe el servidor (responde 401, no 500)', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: "2001' OR '1'='1", contrasena: 'x' });

    // Lo crítico aquí NO es que "detecte" el ataque (eso lo protege persistencia
    // con prepared statements), sino que la ruta lo maneje sin explotar en un 500.
    expect(res.status).toBe(401);
  });

  test('cédula con script/HTML no rompe el servidor', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '<script>alert(1)</script>', contrasena: 'x' });

    expect(res.status).toBe(401);
  });

  test('cédula extremadamente larga (10.000 caracteres) no rompe el servidor', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);
    const cedulaGigante = '1'.repeat(10000);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: cedulaGigante, contrasena: 'x' });

    expect(res.status).toBe(401);
  });

  test('contraseña vacía (solo espacios) responde 400, no se procesa como válida', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ cedula: '2001', contrasena: '   ' });

    // Documenta el comportamiento real: ¿el backend trata "solo espacios"
    // como una contraseña "presente" (pasa el 400) o la rechaza igual?
    // Este test describe lo que pasa hoy, útil para detectar cambios futuros.
    expect([400, 401]).toContain(res.status);
  });

});

describe('POST /api/auth/login — concurrencia (NUEVO)', () => {

  test('dos peticiones de login simultáneas (doble clic) responden correctamente sin interferir', async () => {
    const bcrypt = require('bcrypt');
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: {
        Cedula: '2001', Nombre: 'Fer', Activo: true,
        Contrasena: await bcrypt.hash('123456', 10),
        Celular: '', Telefono: '', CorreoElectronico: '', Direccion: '', CodigoTrabajador: '',
      },
      roles: ['Director'],
    });

    const [res1, res2] = await Promise.all([
      request(app).post('/api/auth/login').send({ cedula: '2001', contrasena: '123456' }),
      request(app).post('/api/auth/login').send({ cedula: '2001', contrasena: '123456' }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.token).toBeDefined();
    expect(res2.body.token).toBeDefined();
  });

});