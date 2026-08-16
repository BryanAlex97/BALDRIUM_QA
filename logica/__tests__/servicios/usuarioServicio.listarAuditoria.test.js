// __tests__/servicios/usuarioServicio.listarAuditoria.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  auditoria: {
    listarSistema: jest.fn(),
  },
}));

const { auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { listarAuditoria } = require('../../src/servicios/Usuario/usuarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('usuarioServicio.listarAuditoria', () => {

  test('devuelve el historial con el límite por defecto (400)', async () => {
    auditoria.listarSistema.mockResolvedValue([{ id: 1, tipoAccion: 'LOGIN' }]);

    const resultado = await listarAuditoria();

    expect(auditoria.listarSistema).toHaveBeenCalledWith(400);
    expect(resultado.length).toBe(1);
  });

  test('respeta un límite personalizado', async () => {
    auditoria.listarSistema.mockResolvedValue([]);
    await listarAuditoria(50);
    expect(auditoria.listarSistema).toHaveBeenCalledWith(50);
  });

});