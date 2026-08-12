// __tests__/rutas/usuarioRutas.actualizar.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCedula: jest.fn(),
    existeCorreo: jest.fn(),
    existeCodigoTrabajador: jest.fn(),
    actualizarTrabajador: jest.fn(),
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
  trabajador: {
    Cedula: '2001', Nombre: 'Fer', Celular: '3000000000',
    CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1',
    CodigoTrabajador: 'T-01', Activo: true,
  },
  roles: ['Director'],
};

describe('PUT /api/Usuario/:cedula — casos base', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).put('/api/Usuario/2001').send({ Nombre: 'X' });
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Director', async () => {
    const token = generarToken(['Asesor Comercial']);

    const res = await request(app)
      .put('/api/Usuario/2001')
      .set('Authorization', `Bearer ${token}`)
      .send({ Nombre: 'X' });

    expect(res.status).toBe(403);
  });

  test('responde 404 si el trabajador no existe (siendo Director)', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/Usuario/9999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ Nombre: 'X' });

    expect(res.status).toBe(404);
  });

  test('responde 409 si el nuevo correo ya está en uso', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(true);

    const res = await request(app)
      .put('/api/Usuario/2001')
      .set('Authorization', `Bearer ${token}`)
      .send({ CorreoElectronico: 'otro@baldrium.com' });

    expect(res.status).toBe(409);
  });

  test('responde 200 y actualiza si los datos son correctos', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.actualizarTrabajador.mockResolvedValue();

    const res = await request(app)
      .put('/api/Usuario/2001')
      .set('Authorization', `Bearer ${token}`)
      .send({ Nombre: 'Fer Actualizada', roles: [2] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('mensaje');
  });

});

describe('PUT /api/Usuario/:cedula — robustez y concurrencia (NUEVO)', () => {

  test('nombre con inyección tipo SQL no rompe el servidor (no 500)', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.actualizarTrabajador.mockResolvedValue();

    const res = await request(app)
      .put('/api/Usuario/2001')
      .set('Authorization', `Bearer ${token}`)
      .send({ Nombre: "Fer'; DROP TABLE trabajador;--" });

    expect(res.status).toBe(200);
  });

  test('dos ediciones simultáneas al mismo trabajador responden sin romper el servidor', async () => {
    const token = generarToken(['Director']);
    trabajador.buscarPorCedula.mockResolvedValue(trabajadorExistente);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.actualizarTrabajador.mockResolvedValue();

    const [res1, res2] = await Promise.all([
      request(app).put('/api/Usuario/2001').set('Authorization', `Bearer ${token}`).send({ Nombre: 'Edicion A' }),
      request(app).put('/api/Usuario/2001').set('Authorization', `Bearer ${token}`).send({ Nombre: 'Edicion B' }),
    ]);

    expect(res1.status).not.toBe(500);
    expect(res2.status).not.toBe(500);
  });

});