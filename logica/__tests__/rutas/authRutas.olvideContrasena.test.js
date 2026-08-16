// __tests__/rutas/authRutas.olvideContrasena.test.js
const request = require('supertest');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCorreo: jest.fn(),
    actualizarContrasena: jest.fn(),
  },
}));

jest.mock('../../src/infraestructura/emailCliente', () => ({
  enviarContrasenaTemp: jest.fn(),
}));

const { trabajador } = require('../../src/infraestructura/persistenciaCliente');
const { enviarContrasenaTemp } = require('../../src/infraestructura/emailCliente');
const app = require('../../src/app');

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/olvide-contrasena', () => {

  test('responde 400 si el correo no tiene formato válido', async () => {
    const res = await request(app).post('/api/auth/olvide-contrasena').send({ correo: 'noesuncorreo' });
    expect(res.status).toBe(400);
  });

  test('responde 400 si no se envía correo', async () => {
    const res = await request(app).post('/api/auth/olvide-contrasena').send({});
    expect(res.status).toBe(400);
  });

  test('Escenario 1: responde 200 y envía el correo si existe', async () => {
    trabajador.buscarPorCorreo.mockResolvedValue({ Cedula: '2001', Nombre: 'Fer', CorreoElectronico: 'fer@baldrium.com' });
    trabajador.actualizarContrasena.mockResolvedValue();
    enviarContrasenaTemp.mockResolvedValue();

    const res = await request(app).post('/api/auth/olvide-contrasena').send({ correo: 'fer@baldrium.com' });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/recibirás las instrucciones/);
    expect(enviarContrasenaTemp).toHaveBeenCalled();
  });

  test('Escenario 2: responde 200 (NO 404 ni 400) aunque el correo no exista, con el mismo mensaje genérico', async () => {
    trabajador.buscarPorCorreo.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/olvide-contrasena').send({ correo: 'noexiste@baldrium.com' });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/recibirás las instrucciones/);
  });

  test('Escenario 2 (verificación de seguridad): la respuesta es indistinguible entre correo existente y no existente', async () => {
    trabajador.buscarPorCorreo.mockResolvedValueOnce({ Cedula: '2001', Nombre: 'Fer', CorreoElectronico: 'fer@baldrium.com' });
    trabajador.actualizarContrasena.mockResolvedValue();
    enviarContrasenaTemp.mockResolvedValue();
    const resExiste = await request(app).post('/api/auth/olvide-contrasena').send({ correo: 'fer@baldrium.com' });

    trabajador.buscarPorCorreo.mockResolvedValueOnce(null);
    const resNoExiste = await request(app).post('/api/auth/olvide-contrasena').send({ correo: 'noexiste@baldrium.com' });

    expect(resExiste.status).toBe(resNoExiste.status);
    expect(resExiste.body.mensaje).toBe(resNoExiste.body.mensaje);
  });

});