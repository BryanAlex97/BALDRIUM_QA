// __tests__/servicios/recuperacionServicio.test.js

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
const { olvideMiContrasena } = require('../../src/servicios/Login/recuperacionServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('recuperacionServicio.olvideMiContrasena — Escenario 1 (correo existe)', () => {

  test('genera contraseña temporal, la guarda, y envía el correo', async () => {
    trabajador.buscarPorCorreo.mockResolvedValue({ Cedula: '2001', Nombre: 'Fer', CorreoElectronico: 'fer@baldrium.com' });
    trabajador.actualizarContrasena.mockResolvedValue();
    enviarContrasenaTemp.mockResolvedValue();

    const resultado = await olvideMiContrasena('fer@baldrium.com');

    expect(trabajador.actualizarContrasena).toHaveBeenCalledWith('2001', expect.any(String));
    expect(enviarContrasenaTemp).toHaveBeenCalledWith('fer@baldrium.com', 'Fer', expect.any(String));
    expect(resultado.mensaje).toMatch(/recibirás las instrucciones/);
  });

  test('la contraseña temporal generada tiene 10 caracteres', async () => {
    trabajador.buscarPorCorreo.mockResolvedValue({ Cedula: '2001', Nombre: 'Fer', CorreoElectronico: 'fer@baldrium.com' });
    trabajador.actualizarContrasena.mockResolvedValue();
    enviarContrasenaTemp.mockResolvedValue();

    await olvideMiContrasena('fer@baldrium.com');

    const passGenerada = trabajador.actualizarContrasena.mock.calls[0][1];
    expect(passGenerada.length).toBe(10);
  });

  test('normaliza el correo (minúsculas, sin espacios) antes de buscar', async () => {
    trabajador.buscarPorCorreo.mockResolvedValue({ Cedula: '2001', Nombre: 'Fer', CorreoElectronico: 'fer@baldrium.com' });
    trabajador.actualizarContrasena.mockResolvedValue();
    enviarContrasenaTemp.mockResolvedValue();

    await olvideMiContrasena('  FER@Baldrium.com  ');

    expect(trabajador.buscarPorCorreo).toHaveBeenCalledWith('fer@baldrium.com');
  });

});

describe('recuperacionServicio.olvideMiContrasena — Escenario 2 (correo no registrado, sin filtrar info)', () => {

  test('lanza error con el mismo mensaje genérico que el caso exitoso (no revela si el correo existe)', async () => {
    trabajador.buscarPorCorreo.mockResolvedValue(null);

    await expect(olvideMiContrasena('noexiste@baldrium.com')).rejects.toThrow(
      /Si el correo existe en el sistema, recibirás las instrucciones en breve/
    );
    expect(trabajador.actualizarContrasena).not.toHaveBeenCalled();
    expect(enviarContrasenaTemp).not.toHaveBeenCalled();
  });

});

describe('recuperacionServicio — Escenarios 3 y 4 del criterio de aceptación (NO IMPLEMENTADOS)', () => {

  test('documenta que no existe mecanismo para forzar cambio de contraseña en el primer ingreso (Escenario 3)', () => {
    // No hay ningún flag/campo (ej. "requiereCambioContrasena") en el trabajador
    // ni verificación en authServicio.login que fuerce un cambio de contraseña
    // tras usar una contraseña temporal. Este test documenta el gap, no valida código.
    expect(true).toBe(true); // placeholder — ver nota de QA en Jira
  });

  test('documenta que no existe mecanismo de expiración de la contraseña temporal (Escenario 4)', () => {
    // No hay ningún campo de fecha de expiración ni lógica que invalide
    // la contraseña temporal después de un tiempo definido.
    expect(true).toBe(true); // placeholder — ver nota de QA en Jira
  });

});