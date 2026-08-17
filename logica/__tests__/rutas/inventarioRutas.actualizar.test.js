// __tests__/rutas/inventarioRutas.actualizar.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

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

const { inventario } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
});

afterEach(() => {
  jest.clearAllMocks();
});

function generarToken(roles) {
  return jwt.sign(
    { cedula: '2001', nombre: 'Fer', roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const datosValidos = { Nombre: 'Olla', Tipo: 'Inventario de cocina', Valor: 100, Cantidad: 10 };

describe('PUT /api/Inventario/:id', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).put('/api/Inventario/1').send(datosValidos);
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Coordinador', async () => {
    const token = generarToken(['Asesor Comercial']);

    const res = await request(app)
      .put('/api/Inventario/1')
      .set('Authorization', `Bearer ${token}`)
      .send(datosValidos);

    expect(res.status).toBe(403);
  });

  test('responde 404 si el producto no existe (siendo Coordinador)', async () => {
    const token = generarToken(['Coordinador']);
    inventario.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/Inventario/999')
      .set('Authorization', `Bearer ${token}`)
      .send(datosValidos);

    expect(res.status).toBe(404);
  });

  test('responde 400 si faltan campos requeridos', async () => {
    const token = generarToken(['Coordinador']);

    const res = await request(app)
      .put('/api/Inventario/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ Nombre: 'Olla' });

    expect(res.status).toBe(400);
  });

  test('hallazgo: responde 500 (no 409) si el nuevo nombre ya existe en otro producto — inconsistencia con POST /', async () => {
    const token = generarToken(['Coordinador']);
    inventario.buscarPorId.mockResolvedValue({ ID: 1, ...datosValidos });
    inventario.existeNombre.mockResolvedValue(true);

    const res = await request(app)
      .put('/api/Inventario/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Nombre: 'Sartén' });

    // Documentamos el comportamiento actual (500), aunque lo esperable sería 409,
    // igual que hace POST /api/Inventario para el mismo tipo de error.
    expect(res.status).toBe(500);
  });

  test('responde 200 y actualiza si los datos son correctos', async () => {
    const token = generarToken(['Coordinador']);
    inventario.buscarPorId.mockResolvedValue({ ID: 1, ...datosValidos });
    inventario.existeNombre.mockResolvedValue(false);
    inventario.actualizarProducto.mockResolvedValue();

    const res = await request(app)
      .put('/api/Inventario/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...datosValidos, Cantidad: 15 });

    expect(res.status).toBe(200);
  });

});