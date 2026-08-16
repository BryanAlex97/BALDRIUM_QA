// __tests__/rutas/perfilRutas.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCedula: jest.fn(),
    actualizarPerfil: jest.fn(),
    actualizarContrasena: jest.fn(),
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

function generarToken() {
  return jwt.sign(
    { cedula: '2001', nombre: 'Fer', roles: ['Director'] },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('GET /api/perfil', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/perfil');
    expect(res.status).toBe(401);
  });

  test('responde 200 con el perfil del usuario autenticado', async () => {
    const token = generarToken();
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '2001', Nombre: 'Fer', Celular: '3000000000', CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1' },
      roles: ['Director'],
    });

    const res = await request(app).get('/api/perfil').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.cedula).toBe('2001');
  });

});

describe('PUT /api/perfil', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).put('/api/perfil').send({ Nombre: 'X' });
    expect(res.status).toBe(401);
  });

  test('responde 400 si faltan campos requeridos', async () => {
    const token = generarToken();
    const res = await request(app).put('/api/perfil').set('Authorization', `Bearer ${token}`).send({ Nombre: 'Fer' });
    expect(res.status).toBe(400);
  });

  test('responde 200 si el perfil se actualiza correctamente', async () => {
    const token = generarToken();
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '2001', Nombre: 'Fer', Celular: '3000000000', CorreoElectronico: 'fer@baldrium.com', Direccion: 'CL 1' },
      roles: ['Director'],
    });
    trabajador.actualizarPerfil.mockResolvedValue();

    const res = await request(app)
      .put('/api/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ Nombre: 'Fer Actualizada', Celular: '3001112233', CorreoElectronico: 'fer.nueva@baldrium.com', Direccion: 'CL 2' });

    expect(res.status).toBe(200);
  });

});

describe('PATCH /api/perfil/contrasena', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).patch('/api/perfil/contrasena').send({});
    expect(res.status).toBe(401);
  });

  test('responde 400 si la contraseña actual es incorrecta', async () => {
    const token = generarToken();
    trabajador.buscarPorCedula.mockResolvedValue({ trabajador: { Cedula: '2001', Contrasena: 'hashReal' }, roles: [] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const res = await request(app)
      .patch('/api/perfil/contrasena')
      .set('Authorization', `Bearer ${token}`)
      .send({ contrasenaActual: 'mala', nuevaContrasena: 'nueva123' });

    expect(res.status).toBe(400);
  });

  test('responde 200 si la contraseña se cambia correctamente', async () => {
    const token = generarToken();
    trabajador.buscarPorCedula.mockResolvedValue({ trabajador: { Cedula: '2001', Contrasena: 'hashReal' }, roles: [] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    trabajador.actualizarContrasena.mockResolvedValue();

    const res = await request(app)
      .patch('/api/perfil/contrasena')
      .set('Authorization', `Bearer ${token}`)
      .send({ contrasenaActual: 'actual123', nuevaContrasena: 'nueva456' });

    expect(res.status).toBe(200);
  });

});