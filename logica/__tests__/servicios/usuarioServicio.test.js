// __tests__/servicios/usuarioServicio.test.js

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

const { trabajador, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { crear } = require('../../src/servicios/Usuario/usuarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

const datosValidos = {
  Cedula: '3001',
  Contrasena: 'claveSegura123',
  Nombre: 'Nuevo Trabajador',
  Celular: '3001112233',
  CorreoElectronico: 'nuevo@baldrium.com',
  Direccion: 'CL 10 # 5-20',
  CodigoTrabajador: 'T-100',
};

// Helper: deja todas las validaciones de "existe X" en falso por defecto,
// así cada test solo tiene que sobreescribir la que le interesa probar
function mockValidacionesLimpias() {
  trabajador.existeCedula.mockResolvedValue(false);
  trabajador.existeCorreo.mockResolvedValue(false);
  trabajador.existeCodigoTrabajador.mockResolvedValue(false);
}

describe('usuarioServicio.crear — casos base', () => {

  test('lanza error si falta un campo requerido (Contrasena)', async () => {
    const datosIncompletos = { ...datosValidos, Contrasena: undefined };

    await expect(crear(datosIncompletos, [1])).rejects.toThrow(/son requeridos/);
    expect(trabajador.existeCedula).not.toHaveBeenCalled();
  });

  test('lanza error si falta el código de trabajador', async () => {
    const datosIncompletos = { ...datosValidos, CodigoTrabajador: undefined };

    await expect(crear(datosIncompletos, [1])).rejects.toThrow(/son requeridos/);
  });

  test('lanza error si la cédula ya está registrada', async () => {
    trabajador.existeCedula.mockResolvedValue(true);

    await expect(crear(datosValidos, [1])).rejects.toThrow('La cédula 3001 ya está registrada.');
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'CREAR', resultado: 'FALLIDO' })
    );
    expect(trabajador.crearTrabajador).not.toHaveBeenCalled();
  });

  test('lanza error si el correo ya está en uso', async () => {
    trabajador.existeCedula.mockResolvedValue(false);
    trabajador.existeCorreo.mockResolvedValue(true);

    await expect(crear(datosValidos, [1])).rejects.toThrow(/ya está en uso/);
    expect(trabajador.crearTrabajador).not.toHaveBeenCalled();
  });

  test('lanza error si el código de trabajador ya existe (NUEVO)', async () => {
    trabajador.existeCedula.mockResolvedValue(false);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(true);

    await expect(crear(datosValidos, [1])).rejects.toThrow();
    expect(trabajador.crearTrabajador).not.toHaveBeenCalled();
  });

  test('crea el trabajador correctamente cuando los datos son válidos', async () => {
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3001', Nombre: 'Nuevo Trabajador' });

    const resultado = await crear(datosValidos, [1, 2]);

    expect(trabajador.crearTrabajador).toHaveBeenCalledWith(datosValidos, [1, 2]);
    expect(resultado).toEqual({ Cedula: '3001', Nombre: 'Nuevo Trabajador' });
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'CREAR', resultado: 'EXITOSO' })
    );
  });

});

describe('usuarioServicio.crear — Escenario 3 (roles definen funcionalidades) (NUEVO)', () => {

  test('crea correctamente sin ningún rol asignado (array vacío)', async () => {
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3002', Nombre: 'Sin Rol' });

    await crear({ ...datosValidos, Cedula: '3002', CorreoElectronico: 'sinrol@baldrium.com', CodigoTrabajador: 'T-102' }, []);

    expect(trabajador.crearTrabajador).toHaveBeenCalledWith(expect.anything(), []);
  });

  test('crea correctamente con múltiples roles asignados', async () => {
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3003', Nombre: 'Multi Rol' });

    await crear({ ...datosValidos, Cedula: '3003', CorreoElectronico: 'multi@baldrium.com', CodigoTrabajador: 'T-103' }, [1, 2, 3]);

    expect(trabajador.crearTrabajador).toHaveBeenCalledWith(expect.anything(), [1, 2, 3]);
  });

});

describe('usuarioServicio.crear — caracteres especiales e inyección (NUEVO)', () => {

  test('pasa un nombre con inyección tipo SQL tal cual, sin sanitizar en logica', async () => {
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3004', Nombre: "Robert'; DROP TABLE trabajador;--" });

    await crear({
      ...datosValidos, Cedula: '3004', Nombre: "Robert'; DROP TABLE trabajador;--",
      CorreoElectronico: 'robert@baldrium.com', CodigoTrabajador: 'T-104',
    }, [1]);

    expect(trabajador.crearTrabajador).toHaveBeenCalledWith(
      expect.objectContaining({ Nombre: "Robert'; DROP TABLE trabajador;--" }),
      [1]
    );
  });

  test('pasa un nombre con script/HTML tal cual, sin sanitizar en logica', async () => {
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3005', Nombre: '<script>alert(1)</script>' });

    await crear({
      ...datosValidos, Cedula: '3005', Nombre: '<script>alert(1)</script>',
      CorreoElectronico: 'script@baldrium.com', CodigoTrabajador: 'T-105',
    }, [1]);

    expect(trabajador.crearTrabajador).toHaveBeenCalled();
  });

  test('nombre extremadamente largo (5000 caracteres) no rompe el servicio', async () => {
    mockValidacionesLimpias();
    const nombreGigante = 'A'.repeat(5000);
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3006', Nombre: nombreGigante });

    await expect(crear({
      ...datosValidos, Cedula: '3006', Nombre: nombreGigante,
      CorreoElectronico: 'largo@baldrium.com', CodigoTrabajador: 'T-106',
    }, [1])).resolves.toBeDefined();
  });

});

describe('usuarioServicio.crear — concurrencia (NUEVO)', () => {

  test('dos intentos simultáneos de crear la misma cédula: ambos pasan la validación en memoria (limitación del mock)', async () => {
    // Nota de QA: la protección real contra duplicados en concurrencia
    // depende de un UNIQUE constraint en la base de datos, no de este servicio.
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '3007', Nombre: 'Concurrente' });

    const datos = { ...datosValidos, Cedula: '3007', CorreoElectronico: 'con@baldrium.com', CodigoTrabajador: 'T-107' };

    const [r1, r2] = await Promise.all([crear(datos, [1]), crear(datos, [1])]);

    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
  });

});