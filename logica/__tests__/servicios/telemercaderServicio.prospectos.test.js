// __tests__/servicios/telemercaderServicio.prospectos.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  prospecto: {
    listarPendientes: jest.fn(),
    listarEnGestion: jest.fn(),
    buscarPendientes: jest.fn(),
    buscarEnGestion: jest.fn(),
    agendarVisita: jest.fn(),
    cambiarEstado: jest.fn(),
    crearYAgendar: jest.fn(),
  },
  visita: {},
  trabajador: {},
  beneficio: {},
}));

const { prospecto } = require('../../src/infraestructura/persistenciaCliente');
const {
  listarPendientes, listarEnGestion, buscarPendientes, buscarEnGestion,
  agendarVisita, cambiarEstadoProspecto, crearProspectoYAgendar,
} = require('../../src/servicios/Telemercadeo/Telemercader/telemercaderServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('telemercaderServicio — Escenario 1 (consultar prospectos)', () => {

  test('listarPendientes delega correctamente y retorna los datos', async () => {
    const datos = [{ id: 1, nombre: 'Cliente A', estado: 'pendiente' }];
    prospecto.listarPendientes.mockResolvedValue(datos);

    const resultado = await listarPendientes();

    expect(prospecto.listarPendientes).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual(datos);
  });

  test('listarPendientes devuelve lista vacía sin error si no hay prospectos', async () => {
    prospecto.listarPendientes.mockResolvedValue([]);
    const resultado = await listarPendientes();
    expect(resultado).toEqual([]);
  });

  test('listarEnGestion delega correctamente', async () => {
    prospecto.listarEnGestion.mockResolvedValue([{ id: 2, estado: 'en_gestion' }]);
    const resultado = await listarEnGestion();
    expect(prospecto.listarEnGestion).toHaveBeenCalledTimes(1);
    expect(resultado.length).toBe(1);
  });

  test('buscarPendientes pasa el término de búsqueda correctamente', async () => {
    prospecto.buscarPendientes.mockResolvedValue([]);
    await buscarPendientes('Juan');
    expect(prospecto.buscarPendientes).toHaveBeenCalledWith('Juan');
  });

  test('buscarEnGestion pasa el término de búsqueda correctamente', async () => {
    prospecto.buscarEnGestion.mockResolvedValue([]);
    await buscarEnGestion('Maria');
    expect(prospecto.buscarEnGestion).toHaveBeenCalledWith('Maria');
  });

});

describe('telemercaderServicio — Escenario 2 (registrar/actualizar gestión)', () => {

  test('cambiarEstadoProspecto delega con el ID, estado y contexto de auditoría correctos', async () => {
    prospecto.cambiarEstado.mockResolvedValue({ ok: true });
    const auditCtx = { actor: { cedula: '2001', nombre: 'Fer' } };

    await cambiarEstadoProspecto(5, 'interesado', auditCtx);

    expect(prospecto.cambiarEstado).toHaveBeenCalledWith(5, 'interesado', auditCtx);
  });

  test('hallazgo: no valida que "estado" sea uno de los valores permitidos antes de delegar', async () => {
    prospecto.cambiarEstado.mockResolvedValue({ ok: true });

    // No debería aceptar esto sin validación, pero el código actual lo deja pasar tal cual
    await cambiarEstadoProspecto(5, 'estado-inventado-random', {});

    expect(prospecto.cambiarEstado).toHaveBeenCalledWith(5, 'estado-inventado-random', {});
  });

  test('agendarVisita delega con los datos correctos', async () => {
    const datosVisita = { fecha: '2026-08-20', direccion: 'CL 1' };
    prospecto.agendarVisita.mockResolvedValue({ visitaId: 10 });

    const resultado = await agendarVisita(5, datosVisita, {});

    expect(prospecto.agendarVisita).toHaveBeenCalledWith(5, datosVisita, {});
    expect(resultado.visitaId).toBe(10);
  });

  test('crearProspectoYAgendar delega correctamente', async () => {
    const datos = { nombre: 'Nuevo Prospecto', celular: '3001234567' };
    prospecto.crearYAgendar.mockResolvedValue({ id: 99 });

    const resultado = await crearProspectoYAgendar(datos, {});

    expect(prospecto.crearYAgendar).toHaveBeenCalledWith(datos, {});
    expect(resultado.id).toBe(99);
  });

});