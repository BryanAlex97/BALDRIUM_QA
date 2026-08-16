// __tests__/servicios/usuarioServicio.listar.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  trabajador: {
    listarTodosConRoles: jest.fn(),
  },
}));

const { trabajador } = require('../../src/infraestructura/persistenciaCliente');
const { listar } = require('../../src/servicios/Usuario/usuarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('usuarioServicio.listar', () => {

  test('devuelve la lista de trabajadores con sus roles', async () => {
    const listaSimulada = [
      { Cedula: '2001', Nombre: 'Fer', Activo: true, roles: [{ tipoRol: 'Director' }] },
      { Cedula: '3001', Nombre: 'Nuevo', Activo: true, roles: [{ tipoRol: 'Coordinador' }] },
    ];
    trabajador.listarTodosConRoles.mockResolvedValue(listaSimulada);

    const resultado = await listar();

    expect(trabajador.listarTodosConRoles).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual(listaSimulada);
  });

  test('devuelve lista vacía si no hay trabajadores', async () => {
    trabajador.listarTodosConRoles.mockResolvedValue([]);

    const resultado = await listar();

    expect(resultado).toEqual([]);
  });

});