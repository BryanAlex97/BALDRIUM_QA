// __tests__/servicios/visitaServicio.cambiarEstado.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  visita: {
    cambiarEstado: jest.fn(),
    guardarSuplemento: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
  },
}));

const { visita, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { cambiarEstado } = require('../../src/servicios/Telemercadeo/AsesorComercial/visitaServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('visitaServicio.cambiarEstado — Escenarios 1, 2 y 3', () => {

  test('cambia el estado correctamente (Escenario 1)', async () => {
    visita.cambiarEstado.mockResolvedValue();
    auditoria.registrarSistema.mockResolvedValue();

    await cambiarEstado(15, 'Pendiente', [], {}, null);

    expect(visita.cambiarEstado).toHaveBeenCalledWith(15, 'Pendiente', null);
  });

  test('registra auditoría con usuario responsable (Escenario 2)', async () => {
    visita.cambiarEstado.mockResolvedValue();
    auditoria.registrarSistema.mockResolvedValue();

    await cambiarEstado(15, 'Visitado', [], { actor: { cedula: '3001', nombre: 'Asesor' } });

    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({
        cedulaTrabajador: '3001',
        nombreTrabajador: 'Asesor',
        tipoAccion: 'EDITAR',
        registroAfectadoID: 15,
        valorNuevo: 'Visitado',
      })
    );
  });

  test('acepta notas opcionales asociadas al cambio de estado', async () => {
    visita.cambiarEstado.mockResolvedValue();
    auditoria.registrarSistema.mockResolvedValue();

    await cambiarEstado(15, 'Rechaza', [], {}, 'Cliente no quiso recibir la visita');

    expect(visita.cambiarEstado).toHaveBeenCalledWith(15, 'Rechaza', 'Cliente no quiso recibir la visita');
  });

});

describe('visitaServicio.cambiarEstado — Escenarios 4 y 5 (suplementos/alimentos en estado Visitado)', () => {

  test('Escenario 4 y 5: guarda los suplementos cuando el estado es "Visitado" y hay suplementos', async () => {
    visita.cambiarEstado.mockResolvedValue();
    visita.guardarSuplemento.mockResolvedValue();
    auditoria.registrarSistema.mockResolvedValue();

    const suplementos = [{ inventarioId: 1, cantidad: 2 }, { inventarioId: 3, cantidad: 1 }];

    await cambiarEstado(15, 'Visitado', suplementos, { actor: { cedula: '3001', nombre: 'Asesor' } });

    expect(visita.guardarSuplemento).toHaveBeenCalledWith(15, suplementos, { cedula: '3001', nombre: 'Asesor' });
  });

  test('NO intenta guardar suplementos si el estado es distinto de "Visitado" (aunque se envíen)', async () => {
    visita.cambiarEstado.mockResolvedValue();
    auditoria.registrarSistema.mockResolvedValue();

    await cambiarEstado(15, 'Pendiente', [{ inventarioId: 1, cantidad: 2 }], {});

    expect(visita.guardarSuplemento).not.toHaveBeenCalled();
  });

  test('NO intenta guardar suplementos si el arreglo está vacío, aunque el estado sea "Visitado" (uso condicional, no obligatorio)', async () => {
    visita.cambiarEstado.mockResolvedValue();
    auditoria.registrarSistema.mockResolvedValue();

    await cambiarEstado(15, 'Visitado', [], {});

    expect(visita.guardarSuplemento).not.toHaveBeenCalled();
  });

  test('HALLAZGO (Escenario 5 no se cumple si falla el guardado): si guardarSuplemento falla, cambiarEstado NO lanza error — la visita queda "Visitado" pero los suplementos no se registraron en la BD', async () => {
    visita.cambiarEstado.mockResolvedValue();
    visita.guardarSuplemento.mockRejectedValue(new Error('Fallo de conexión al guardar suplementos'));
    auditoria.registrarSistema.mockResolvedValue();

    const suplementos = [{ inventarioId: 1, cantidad: 2 }];

    // No debería lanzar error hacia arriba, a pesar de que el guardado de suplementos falló
    await expect(cambiarEstado(15, 'Visitado', suplementos, {})).resolves.toBeUndefined();

    // El estado SÍ se marcó como Visitado, a pesar de que los suplementos no se guardaron
    expect(visita.cambiarEstado).toHaveBeenCalledWith(15, 'Visitado', null);
  });

});