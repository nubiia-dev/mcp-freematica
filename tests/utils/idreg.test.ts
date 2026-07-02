import { describe, it, expect } from 'vitest';
import { decodeContratoIdReg, decodeServicioIdReg } from '../../src/utils/idreg.js';

describe('decodeContratoIdReg', () => {
  it('decodifica un idReg real de contrato', () => {
    // Base64("02__08__2304") — contrato verificado contra el API real
    expect(decodeContratoIdReg('MDJfXzA4X18yMzA0')).toEqual({
      empresa: '02',
      delegacion: '08',
      codContrato: '2304',
    });
  });

  it('lanza si el contenido no tiene 3 partes', () => {
    const invalido = Buffer.from('02__08').toString('base64');
    expect(() => decodeContratoIdReg(invalido)).toThrow(/idReg de contrato inválido/);
  });

  it('lanza si alguna parte está vacía', () => {
    const invalido = Buffer.from('02____2304').toString('base64');
    expect(() => decodeContratoIdReg(invalido)).toThrow(/idReg de contrato inválido/);
  });
});

describe('decodeServicioIdReg', () => {
  it('decodifica un idReg real de servicio', () => {
    // Base64("02__08__2304__1") — servicio verificado contra el API real
    expect(decodeServicioIdReg('MDJfXzA4X18yMzA0X18x')).toEqual({
      empresa: '02',
      delegacion: '08',
      codContrato: '2304',
      codServicio: '1',
    });
  });

  it('decodifica códigos de servicio compuestos (ej. 8683_1)', () => {
    // Base64("02__08__2304__8683_1") — caso real: SUB. CONTENEDORES HIGIENICOS
    expect(decodeServicioIdReg('MDJfXzA4X18yMzA0X184NjgzXzE=')).toEqual({
      empresa: '02',
      delegacion: '08',
      codContrato: '2304',
      codServicio: '8683_1',
    });
  });

  it('lanza si el contenido no tiene 4 partes', () => {
    expect(() => decodeServicioIdReg('MDJfXzA4X18yMzA0')).toThrow(/idReg de servicio inválido/);
  });
});
