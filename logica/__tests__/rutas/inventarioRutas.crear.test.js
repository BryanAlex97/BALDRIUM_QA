// __tests__/rutas/inventarioRutas.crear.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

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

const productoValido = { Nombre: 'Olla', Tipo: 'Inventario de cocina', Valor: 100, Cantidad: 5 };

describe('POST /api/Inventario', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).post('/api/Inventario').send(productoValido);
    expect(res.status).toBe(401);
  });

  test('responde 403 si el usuario no tiene el rol Coordinador', async () => {
    const token = generarToken(['Asesor Comercial']);

    const res = await request(app)
      .post('/api/Inventario')
      .set('Authorization', `Bearer ${token}`)
      .send(productoValido);

    expect(res.status).toBe(403);
  });

  test('responde 400 si faltan campos requeridos (siendo Coordinador)', async () => {
    const token = generarToken(['Coordinador']);

    const res = await request(app)
      .post('/api/Inventario')
      .set('Authorization', `Bearer ${token}`)
      .send({ Nombre: 'Olla' });

    expect(res.status).toBe(400);
  });

  test('responde 409 si el producto ya existe', async () => {
    const token = generarToken(['Coordinador']);
    inventario.existeNombre.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/Inventario')
      .set('Authorization', `Bearer ${token}`)
      .send(productoValido);

    expect(res.status).toBe(409);
  });

  test('responde 201 y crea el producto si los datos son correctos', async () => {
    const token = generarToken(['Coordinador']);
    inventario.existeNombre.mockResolvedValue(false);
    inventario.crearProducto.mockResolvedValue(1);
    inventario.buscarPorId.mockResolvedValue({ ID: 1, ...productoValido });

    const res = await request(app)
      .post('/api/Inventario')
      .set('Authorization', `Bearer ${token}`)
      .send(productoValido);

    expect(res.status).toBe(201);
    expect(res.body.producto.ID).toBe(1);
  });

});