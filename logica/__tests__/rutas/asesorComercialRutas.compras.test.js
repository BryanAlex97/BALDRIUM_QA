// __tests__/rutas/asesorComercialRutas.compras.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  compra: {
    crearCompra: jest.fn(),
    listarComprasTrabajador: jest.fn(),
  },
  visita: {},
}));

const { compra } = require('../../src/infraestructura/persistenciaCliente');
const app = require('../../src/app');

beforeAll(() => {
  process.env.JWT_SECRET = 'clave-de-prueba';
});

afterEach(() => {
  jest.clearAllMocks();
});

function generarToken(roles, cedula = '3001') {
  return jwt.sign(
    { cedula, nombre: 'Asesor', roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('POST /api/telemercadeo/compras/nueva — Escenarios 1 y 2', () => {

  const items = [
    { inventarioId: 1, cantidad: 2, valorUnitario: 50000 },
    { inventarioId: 2, cantidad: 1, valorUnitario: 30000 },
  ];

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).post('/api/telemercadeo/compras/nueva').send({});
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app)
      .post('/api/telemercadeo/compras/nueva')
      .set('Authorization', `Bearer ${token}`)
      .send({ cedulaCliente: '2001', formaPago: 'Efectivo', items });
    expect(res.status).toBe(403);
  });

  test('responde 200 y registra la compra con múltiples productos (Escenarios 1 y 2)', async () => {
    const token = generarToken(['Asesor comercial']);
    compra.crearCompra.mockResolvedValue({ compraId: 50 });

    const res = await request(app)
      .post('/api/telemercadeo/compras/nueva')
      .set('Authorization', `Bearer ${token}`)
      .send({ cedulaCliente: '2001', formaPago: 'Efectivo', notas: 'Entrega inmediata', items, referidos: [] });

    expect(res.status).toBe(200);
    expect(res.body.compraId).toBe(50);
  });

  test('responde 400 si el servicio lanza un error', async () => {
    const token = generarToken(['Asesor comercial']);
    compra.crearCompra.mockRejectedValue(new Error('Cliente no encontrado.'));

    const res = await request(app)
      .post('/api/telemercadeo/compras/nueva')
      .set('Authorization', `Bearer ${token}`)
      .send({ cedulaCliente: '9999999', formaPago: 'Efectivo', items });

    expect(res.status).toBe(400);
  });

});

describe('GET /api/telemercadeo/compras/mis-compras — Escenario 3 (visible en historial)', () => {

  test('responde 401 si no se envía token', async () => {
    const res = await request(app).get('/api/telemercadeo/compras/mis-compras');
    expect(res.status).toBe(401);
  });

  test('responde 403 si el rol no es Asesor comercial', async () => {
    const token = generarToken(['Telemercaderista']);
    const res = await request(app).get('/api/telemercadeo/compras/mis-compras').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

    test('responde 200 con las compras del asesor autenticado', async () => {
    const token = generarToken(['Asesor comercial'], '3001');
    compra.listarComprasTrabajador.mockResolvedValue([{ id: 50, cliente: 'Cliente A' }]);

    const res = await request(app).get('/api/telemercadeo/compras/mis-compras').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // La cédula se convierte a número antes de consultar persistencia
    expect(compra.listarComprasTrabajador).toHaveBeenCalledWith(3001);
    expect(res.body.length).toBe(1);
  });

});