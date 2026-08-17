// __tests__/servicios/telemercaderServicio.agendarVisita.test.js

jest.mock('../../src/infraestructura/persistenciaCliente', () => ({
  prospecto: {
    agendarVisita: jest.fn(),
    crearYAgendar: jest.fn(),
  },
  visita: {},
  trabajador: {},
  beneficio: {},
}));

const { prospecto } = require('../../src/infraestructura/persistenciaCliente');
const { agendarVisita, crearProspectoYAgendar } = require('../../src/servicios/Telemercadeo/Telemercader/telemercaderServicio');

afterEach(() => {
  jest.clearAllMocks();
});

describe('telemercaderServicio.agendarVisita — Escenarios 1 y 2 de HU-25', () => {

  const datosVisita = {
    fecha: '2026-08-25',
    hora: '10:00',
    asesorCedula: '3001',
    observaciones: 'Cliente interesado en kit de cocina completo',
  };

  test('agenda la visita con fecha, hora, asesor y observaciones correctamente', async () => {
    prospecto.agendarVisita.mockResolvedValue({ visitaId: 15 });

    const resultado = await agendarVisita(5, datosVisita, { actor: { cedula: '2001', nombre: 'Fer' } });

    expect(prospecto.agendarVisita).toHaveBeenCalledWith(5, datosVisita, { actor: { cedula: '2001', nombre: 'Fer' } });
    expect(resultado.visitaId).toBe(15);
  });

  test('propaga el error si persistencia falla al agendar', async () => {
    prospecto.agendarVisita.mockRejectedValue(new Error('El asesor seleccionado no está disponible.'));
    await expect(agendarVisita(5, datosVisita, {})).rejects.toThrow('no está disponible');
  });

  test('crearProspectoYAgendar registra prospecto nuevo con visita en un solo paso', async () => {
    const datosCompletos = { nombre: 'Nuevo Prospecto', celular: '3009998877', ...datosVisita };
    prospecto.crearYAgendar.mockResolvedValue({ id: 99, visitaId: 16 });

    const resultado = await crearProspectoYAgendar(datosCompletos, {});

    expect(prospecto.crearYAgendar).toHaveBeenCalledWith(datosCompletos, {});
    expect(resultado.visitaId).toBe(16);
  });

});