// __tests__/servicios/inventarioServicio.crear.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  inventario: {
    existeNombre: jest.fn(),
    crearProducto: jest.fn(),
    buscarPorId: jest.fn(),
  },
  auditoria: {
    registrarSistema: jest.fn(),
    registrarInventario: jest.fn(),
  },
}));

const { inventario, auditoria } = require('../../src/infraestructura/persistenciaCliente');
const { crear } = require('../../src/servicios/Inventario/inventarioServicio');

afterEach(() => {
  jest.clearAllMocks();
});

const datosValidos = { Nombre: 'Olla', Tipo: 'Inventario de cocina', Valor: 100, Cantidad: 5 };

describe('inventarioServicio.crear — validaciones', () => {

  test('lanza error si falta un campo requerido', async () => {
    await expect(crear({ Nombre: 'Olla' })).rejects.toThrow('Nombre, tipo, valor y cantidad son requeridos.');
  });

  test('lanza error si el tipo no es válido', async () => {
    await expect(crear({ ...datosValidos, Tipo: 'Electrodomestico' })).rejects.toThrow(/Tipo inválido/);
  });

  test('lanza error si la cantidad es negativa', async () => {
    await expect(crear({ ...datosValidos, Cantidad: -1 })).rejects.toThrow('La cantidad no puede ser negativa.');
  });

  test('lanza error si el valor es negativo', async () => {
    await expect(crear({ ...datosValidos, Valor: -50 })).rejects.toThrow('El valor no puede ser negativo.');
  });

  test('lanza error si el producto ya existe', async () => {
    inventario.existeNombre.mockResolvedValue(true);
    await expect(crear(datosValidos)).rejects.toThrow(/ya está registrado/);
  });

});

describe('inventarioServicio.crear — flujo exitoso (Escenarios 1, 2, 3)', () => {

  test('Escenario 1 y 3: crea el producto, audita en sistema y registra movimiento de entrada (cantidad > 0)', async () => {
    inventario.existeNombre.mockResolvedValue(false);
    inventario.crearProducto.mockResolvedValue(1);
    inventario.buscarPorId.mockResolvedValue({ ID: 1, ...datosValidos });

    const resultado = await crear(datosValidos, { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(resultado.ID).toBe(1);
    expect(auditoria.registrarSistema).toHaveBeenCalledWith(
      expect.objectContaining({ tipoAccion: 'CREAR', tablaAfectada: 'inventario', resultado: 'EXITOSO' })
    );
    expect(auditoria.registrarInventario).toHaveBeenCalledWith(
      expect.objectContaining({ tipoMovimiento: 'ENTRADA', cantidadAnterior: 0, cantidadPosterior: 5 })
    );
  });

  test('Escenario 2: asigna un ID único al producto (buscarPorId con el id devuelto por crearProducto)', async () => {
    inventario.existeNombre.mockResolvedValue(false);
    inventario.crearProducto.mockResolvedValue(42);
    inventario.buscarPorId.mockResolvedValue({ ID: 42, ...datosValidos });

    const resultado = await crear(datosValidos);

    expect(inventario.buscarPorId).toHaveBeenCalledWith(42);
    expect(resultado.ID).toBe(42);
  });

  test('crea el producto pero NO registra movimiento si la cantidad inicial es 0', async () => {
    const datosSinCantidad = { ...datosValidos, Cantidad: 0 };
    inventario.existeNombre.mockResolvedValue(false);
    inventario.crearProducto.mockResolvedValue(2);
    inventario.buscarPorId.mockResolvedValue({ ID: 2, ...datosSinCantidad });

    await crear(datosSinCantidad);

    expect(auditoria.registrarSistema).toHaveBeenCalled();
    expect(auditoria.registrarInventario).not.toHaveBeenCalled();
  });

  test('recorta espacios en blanco del nombre antes de guardar', async () => {
    inventario.existeNombre.mockResolvedValue(false);
    inventario.crearProducto.mockResolvedValue(3);
    inventario.buscarPorId.mockResolvedValue({ ID: 3, ...datosValidos });

    await crear({ ...datosValidos, Nombre: '  Olla  ' });

    expect(inventario.crearProducto).toHaveBeenCalledWith(expect.objectContaining({ Nombre: 'Olla' }));
  });

  test('hallazgo (Escenario 1): el campo Descripcion no se persiste aunque se envíe', async () => {
    inventario.existeNombre.mockResolvedValue(false);
    inventario.crearProducto.mockResolvedValue(4);
    inventario.buscarPorId.mockResolvedValue({ ID: 4, ...datosValidos });

    await crear({ ...datosValidos, Descripcion: 'Olla de acero inoxidable 5L' });

    // El dato se envía desde logica...
    expect(inventario.crearProducto).toHaveBeenCalledWith(expect.objectContaining({ Descripcion: 'Olla de acero inoxidable 5L' }));
    // ...pero no hay ningún manejo explícito ni columna confirmada en persistencia (ver nota de QA).
  });

});