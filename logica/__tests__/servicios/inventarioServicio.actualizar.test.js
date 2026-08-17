// __tests__/servicios/inventarioServicio.actualizar.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  inventario: {
    buscarPorId: jest.fn(),
    existeNombre: jest.fn(),
    actualizarProducto: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
    registrarInventario: jest.fn(),
  },
}));

const { inventario, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { actualizar } = require('../../src/servicios/Inventario/inventarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

const productoAnterior = { ID: 1, Nombre: 'Olla', Tipo: 'Inventario de cocina', Valor: 100, Cantidad: 10 };
const datosValidos = { Nombre: 'Olla', Tipo: 'Inventario de cocina', Valor: 100, Cantidad: 10 };

describe('inventarioServicio.actualizar — validaciones', () => {

  test('lanza error si falta un campo requerido', async () => {
    await expect(actualizar(1, { Nombre: 'Olla' })).rejects.toThrow('Nombre, tipo, valor y cantidad son requeridos.');
  });

  test('lanza error si el producto no existe', async () => {
    inventario.buscarPorId.mockResolvedValue(null);
    await expect(actualizar(999, datosValidos)).rejects.toThrow('Producto no encontrado.');
  });

  test('lanza error si el nuevo nombre ya lo tiene otro producto', async () => {
    inventario.buscarPorId.mockResolvedValue(productoAnterior);
    inventario.existeNombre.mockResolvedValue(true);
    await expect(actualizar(1, { ...datosValidos, Nombre: 'Sartén' })).rejects.toThrow(/Ya existe otro producto/);
  });

});

describe('inventarioServicio.actualizar — Escenarios 1, 2 y 3', () => {

  test('Escenario 1 y 2: actualiza sin cambio de cantidad, audita en sistema pero NO registra movimiento', async () => {
    inventario.buscarPorId.mockResolvedValue(productoAnterior);
    inventario.existeNombre.mockResolvedValue(false);

    await actualizar(1, { ...datosValidos, Cantidad: 10 }, { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(inventario.actualizarProducto).toHaveBeenCalledWith(1, expect.objectContaining({ Nombre: 'Olla' }));
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'EDITAR', tablaAfectada: 'inventario', resultado: 'EXITOSO' })
    );
    expect(auditoria.registrarInventario).not.toHaveBeenCalled();
  });

  test('Escenario 3: la auditoría incluye la cédula y nombre del usuario responsable', async () => {
    inventario.buscarPorId.mockResolvedValue(productoAnterior);
    inventario.existeNombre.mockResolvedValue(false);

    await actualizar(1, { ...datosValidos, Cantidad: 10 }, { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ cedulaTrabajador: '2001', nombreTrabajador: 'Fer' })
    );
  });

  test('actualiza con aumento de cantidad: registra movimiento tipo ENTRADA', async () => {
    inventario.buscarPorId.mockResolvedValue(productoAnterior);
    inventario.existeNombre.mockResolvedValue(false);

    await actualizar(1, { ...datosValidos, Cantidad: 15 });

    expect(auditoria.registrarInventario).toHaveBeenCalledWith(
      expect.objectContaining({ tipoMovimiento: 'ENTRADA', cantidadAnterior: 10, cantidadPosterior: 15 })
    );
  });

  test('actualiza con disminución de cantidad: registra movimiento tipo SALIDA', async () => {
    inventario.buscarPorId.mockResolvedValue(productoAnterior);
    inventario.existeNombre.mockResolvedValue(false);

    await actualizar(1, { ...datosValidos, Cantidad: 4 });

    expect(auditoria.registrarInventario).toHaveBeenCalledWith(
      expect.objectContaining({ tipoMovimiento: 'SALIDA', cantidadAnterior: 10, cantidadPosterior: 4 })
    );
  });

});