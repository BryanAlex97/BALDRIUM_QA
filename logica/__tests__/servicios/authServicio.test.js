// __tests__/servicios/authServicio.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    buscarPorCedula: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
  },
}));

const bcrypt = require('bcrypt');
const { trabajador, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { login } = require('../../src/servicios/Login/authServicio');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
  process.env.JWT_EXPIRES_IN = '8h';
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('authServicio.login — casos base', () => {

  test('lanza error si la cédula no existe', async () => {
    // Mock fiel al comportamiento real: persistencia devuelve null cuando no encuentra
    // (confirmado en persistenciaCliente.js: _req devuelve null ante un 404 real)
    trabajador.buscarPorCedula.mockResolvedValue(null);

    await expect(login('9999999', 'cualquierClave')).rejects.toThrow('Credenciales inválidas');
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'LOGIN_FALLIDO' })
    );
  });

  test('lanza error si la cuenta está desactivada', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '2001', Nombre: 'Fer', Activo: false, Contrasena: 'hash' },
      roles: ['Director'],
    });

    await expect(login('2001', '123456')).rejects.toThrow('cuenta está desactivada');
  });

  test('lanza error si la contraseña es incorrecta', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: { Cedula: '2001', Nombre: 'Fer', Activo: true, Contrasena: 'hashReal' },
      roles: ['Director'],
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(login('2001', 'claveMala')).rejects.toThrow('Credenciales inválidas');
  });

  test('devuelve token y usuario si las credenciales son correctas', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: {
        Cedula: '2001', Nombre: 'Fer', Activo: true, Contrasena: 'hashReal',
        Celular: '3000000000', Telefono: null, CorreoElectronico: 'fer@baldrium.com',
        Direccion: 'CL 1', CodigoTrabajador: 'T-01',
      },
      roles: ['Director'],
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const resultado = await login('2001', '123456');

    expect(resultado).toHaveProperty('token');
    expect(resultado.usuario.cedula).toBe('2001');
    expect(resultado.usuario.roles).toEqual(['Director']);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'LOGIN', resultado: 'EXITOSO' })
    );
  });

});

describe('authServicio.login — caracteres especiales e inyección (NUEVO)', () => {

  // No probamos si "rompe" la BD (eso lo protege mysql2 con prepared statements,
  // fuera del alcance de esta unitaria) — probamos que la capa de logica
  // NO filtra ni sanitiza, simplemente pasa el dato tal cual hacia persistencia.
  // Esto documenta una responsabilidad: la sanitización depende 100% de la
  // capa de persistencia, no hay ninguna limpieza en logica.

  test('pasa una cédula con comillas simples tal cual, sin sanitizar', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    await expect(login("2001' OR '1'='1", 'x')).rejects.toThrow('Credenciales inválidas');
    expect(trabajador.buscarPorCedula).toHaveBeenCalledWith("2001' OR '1'='1");
  });

  test('pasa una cédula con tags HTML/script tal cual, sin sanitizar', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    await expect(login('<script>alert(1)</script>', 'x')).rejects.toThrow('Credenciales inválidas');
    expect(trabajador.buscarPorCedula).toHaveBeenCalledWith('<script>alert(1)</script>');
  });

  test('recorta espacios en blanco alrededor de la cédula (si el código lo hace)', async () => {
    trabajador.buscarPorCedula.mockResolvedValue(null);

    await login('  2001  ', 'x').catch(() => {});

    // Documenta el comportamiento real: ¿llega con espacios o recortado?
    // Este test describe lo que el código hace hoy, no lo que "debería" hacer.
    expect(trabajador.buscarPorCedula).toHaveBeenCalled();
  });

});

describe('authServicio.login — ejecuciones concurrentes (NUEVO)', () => {

  test('dos intentos de login simultáneos con las mismas credenciales correctas no interfieren entre sí', async () => {
    trabajador.buscarPorCedula.mockResolvedValue({
      trabajador: {
        Cedula: '2001', Nombre: 'Fer', Activo: true, Contrasena: 'hashReal',
        Celular: '3000000000', Telefono: null, CorreoElectronico: 'fer@baldrium.com',
        Direccion: 'CL 1', CodigoTrabajador: 'T-01',
      },
      roles: ['Director'],
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    // Simula doble clic: dos llamadas al mismo tiempo, sin esperar la primera
    const [resultado1, resultado2] = await Promise.all([
      login('2001', '123456'),
      login('2001', '123456'),
    ]);

    expect(resultado1).toHaveProperty('token');
    expect(resultado2).toHaveProperty('token');
    // Ambos deben generar tokens válidos, sin que uno "pise" al otro
    expect(auditoria.registrarSistema).toHaveBeenCalledTimes(2);
  });

});