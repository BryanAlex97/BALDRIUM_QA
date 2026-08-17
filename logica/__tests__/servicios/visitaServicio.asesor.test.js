// __tests__/servicios/visitaServicio.asesor.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    listarSemana: jest.fn(),
    cambiarEstado: jest.fn(),
    guardarSuplemento: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
  },
}));

const { visita, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { listarSemana, cambiarEstado } = require('../../src/servicios/Telemercadeo/AsesorComercial/visitaServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('visitaServicio.listarSemana — Escenario 3 de HU-25', () => {

  test('lista solo las visitas asignadas al asesor específico (por cédula)', async () => {
    visita.listarSemana.mockResolvedValue([{ id: 15, prospecto: 'Cliente A' }]);

    const resultado = await listarSemana('3001');

    expect(visita.listarSemana).toHaveBeenCalledWith('3001', expect.any(String), expect.any(String));
    expect(resultado.length).toBe(1);
  });

  test('devuelve lista vacía si el asesor no tiene visitas esa semana', async () => {
    visita.listarSemana.mockResolvedValue([]);
    const resultado = await listarSemana('3001');
    expect(resultado).toEqual([]);
  });

});

describe('visitaServicio.cambiarEstado — robustez (observación de manejo de errores)', () => {

  test('cambia el estado exitosamente y registra auditoría', async () => {
    visita.cambiarEstado.mockResolvedValue();
    auditoria.registrarSistema.mockResolvedValue();

    await cambiarEstado(15, 'Visitado', [], { actor: { cedula: '3001', nombre: 'Asesor' } });

    expect(visita.cambiarEstado).toHaveBeenCalledWith(15, 'Visitado', null);
    expect(auditoria.registrarSistema).toHaveBeenCalled();
  });

  test('observación: si registrar auditoría falla, el cambio de estado NO se revierte (error silencioso)', async () => {
    visita.cambiarEstado.mockResolvedValue();
    auditoria.registrarSistema.mockRejectedValue(new Error('Fallo de conexión al auditar'));

    // No debería lanzar error hacia arriba, a pesar de que la auditoría falló internamente
    await expect(cambiarEstado(15, 'Visitado', [], {})).resolves.toBeUndefined();
    expect(visita.cambiarEstado).toHaveBeenCalled();
  });

});