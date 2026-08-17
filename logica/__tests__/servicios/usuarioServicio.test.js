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

describe('usuarioServicio.crear — casos base', () => {

  test('lanza error si falta un campo requerido (Contrasena)', async () => {
    const datosIncompletos = { ...datosValidos, Contrasena: undefined };
    await expect(crear(datosIncompletos, [1])).rejects.toThrow(/son requeridos/);
    expect(trabajador.existeCedula).not.toHaveBeenCalled();
  });

  test('lanza error si no se asigna ningún rol', async () => {
    await expect(crear(datosValidos, [])).rejects.toThrow('Debes asignar al menos un rol al trabajador.');
  });

  test('lanza error si la contraseña tiene menos de 6 caracteres', async () => {
    await expect(crear({ ...datosValidos, Contrasena: '123' }, [1])).rejects.toThrow(/al menos 6 caracteres/);
  });

  test('lanza error si el nombre contiene dígitos (nueva validación de formato)', async () => {
    await expect(crear({ ...datosValidos, Nombre: 'Juan123' }, [1])).rejects.toThrow(/solo puede contener letras/);
  });

  test('lanza error si la cédula tiene menos de 6 dígitos (nueva validación de longitud)', async () => {
    await expect(crear({ ...datosValidos, Cedula: '123' }, [1])).rejects.toThrow(/entre 6 y 15 dígitos/);
  });

  test('lanza error si la cédula ya está registrada', async () => {
    trabajador.existeCedula.mockResolvedValue(true);
    await expect(crear(datosValidos, [1])).rejects.toThrow('La cédula 300111222 ya está registrada.');
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'CREAR', resultado: 'FALLIDO' })
    );
  });

  test('lanza error si el correo ya está en uso', async () => {
    trabajador.existeCedula.mockResolvedValue(false);
    trabajador.existeCorreo.mockResolvedValue(true);
    await expect(crear(datosValidos, [1])).rejects.toThrow(/ya está en uso/);
  });

  test('lanza error si el código de trabajador ya está en uso', async () => {
    trabajador.existeCedula.mockResolvedValue(false);
    trabajador.existeCorreo.mockResolvedValue(false);
    trabajador.existeCodigoTrabajador.mockResolvedValue(true);
    await expect(crear(datosValidos, [1])).rejects.toThrow(/ya está en uso/);
  });

  test('crea el trabajador correctamente cuando los datos son válidos', async () => {
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '300111222', Nombre: 'Nuevo Trabajador' });

    const resultado = await crear(datosValidos, [1, 2]);

    expect(trabajador.crearTrabajador).toHaveBeenCalledWith(datosValidos, [1, 2]);
    expect(resultado).toEqual({ Cedula: '300111222', Nombre: 'Nuevo Trabajador' });
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'CREAR', resultado: 'EXITOSO' })
    );
  });

});

describe('usuarioServicio.crear — robustez ante inyección (hallazgo de HU-02 resuelto)', () => {

  test('nombre con inyección tipo SQL ahora es rechazado por la validación de formato', async () => {
    await expect(crear({ ...datosValidos, Nombre: "Robert'; DROP TABLE trabajador;--" }, [1]))
      .rejects.toThrow(/solo puede contener letras/);
  });

  test('nombre con script/HTML ahora es rechazado por la validación de formato', async () => {
    await expect(crear({ ...datosValidos, Nombre: '<script>alert(1)</script>' }, [1]))
      .rejects.toThrow(/solo puede contener letras/);
  });

  test('nombre extremadamente largo ahora es rechazado (máximo 100 caracteres)', async () => {
    const nombreGigante = 'A'.repeat(5000);
    await expect(crear({ ...datosValidos, Nombre: nombreGigante }, [1]))
      .rejects.toThrow(/entre 3 y 100 caracteres/);
  });

});

describe('usuarioServicio.crear — concurrencia', () => {

  test('dos intentos simultáneos de crear la misma cédula no rompen el servicio', async () => {
    mockValidacionesLimpias();
    trabajador.crearTrabajador.mockResolvedValue({ Cedula: '300111222', Nombre: 'Concurrente' });

    const [r1, r2] = await Promise.allSettled([crear(datosValidos, [1]), crear(datosValidos, [1])]);

    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');
  });

});