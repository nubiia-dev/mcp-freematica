/**
 * Tests for pcrm schema builders — specifically to cover optional branches
 * (ID_CASO, ID_OPORTUNIDAD, camposAdicionales, COVR_* fields) that the tool
 * integration tests don't reach because they only pass a minimal subset of args.
 */
import { describe, it, expect } from 'vitest';
import {
  buildActividadBody,
  buildCasoBody,
  buildOportunidadBody,
  buildDatosAmpladosBody,
} from '../../src/schemas/pcrm.js';

describe('buildActividadBody — optional branches', () => {
  it('incluye ID_CASO cuando se pasa', () => {
    const body = buildActividadBody({ ID_CASO: 42 });
    expect(body['ID_CASO']).toBe(42);
  });

  it('incluye ID_OPORTUNIDAD cuando se pasa', () => {
    const body = buildActividadBody({ ID_OPORTUNIDAD: 99 });
    expect(body['ID_OPORTUNIDAD']).toBe(99);
  });

  it('fusiona camposAdicionales en el body', () => {
    const body = buildActividadBody({ ASUNTO: 'Cita', camposAdicionales: { CUSTOM: 'valor', NUM: 1 } });
    expect(body['ASUNTO']).toBe('Cita');
    expect(body['CUSTOM']).toBe('valor');
    expect(body['NUM']).toBe(1);
  });

  it('ignora camposAdicionales cuando no se pasa', () => {
    const body = buildActividadBody({ ASUNTO: 'Cita' });
    expect(Object.keys(body)).toEqual(['ASUNTO']);
  });
});

describe('buildCasoBody — optional branches', () => {
  it('fusiona camposAdicionales en el body', () => {
    const body = buildCasoBody({ ASUNTO: 'Caso test', camposAdicionales: { EXTRA: 'X' } });
    expect(body['EXTRA']).toBe('X');
  });

  it('no incluye camposAdicionales cuando está ausente', () => {
    const body = buildCasoBody({ ASUNTO: 'Solo asunto' });
    expect(body['camposAdicionales']).toBeUndefined();
  });
});

describe('buildOportunidadBody — optional branches', () => {
  it('fusiona camposAdicionales en el body', () => {
    const body = buildOportunidadBody({ NOMBRE: 'Opor test', camposAdicionales: { CAMPO_X: 'x' } });
    expect(body['CAMPO_X']).toBe('x');
  });

  it('no incluye camposAdicionales cuando está ausente', () => {
    const body = buildOportunidadBody({ NOMBRE: 'Sin extras' });
    expect(body['camposAdicionales']).toBeUndefined();
  });
});

describe('buildDatosAmpladosBody — optional branches', () => {
  it('incluye todos los campos opcionales cuando se pasan', () => {
    const body = buildDatosAmpladosBody({
      idReg: 'opor-01',
      COVR_COD_EMPRESA: '02',
      COVR_ID_OPORTUNIDAD: 200,
      COVR_AGRUP: 'AGR01',
      COVR_ID_VAL: 5,
      COVR_TIPO_LOC: 'S',
      COVR_TIPO_RESP: 3,
      COVR_VALORES_RESPUESTA: 'base64str==',
      COVR_FICHERO_B64: 'pdfBase64==',
      COVR_VALOR_NUM: 42,
      COVR_VALOR_FCH: '2026-08-01',
    });
    expect(body['COVR_COD_EMPRESA']).toBe('02');
    expect(body['COVR_ID_OPORTUNIDAD']).toBe(200);
    expect(body['COVR_AGRUP']).toBe('AGR01');
    expect(body['COVR_ID_VAL']).toBe(5);
    expect(body['COVR_TIPO_LOC']).toBe('S');
    expect(body['COVR_TIPO_RESP']).toBe(3);
    expect(body['COVR_VALORES_RESPUESTA']).toBe('base64str==');
    expect(body['COVR_FICHERO_B64']).toBe('pdfBase64==');
    expect(body['COVR_VALOR_NUM']).toBe(42);
    expect(body['COVR_VALOR_FCH']).toBe('2026-08-01');
  });

  it('omite campos opcionales que no se pasan', () => {
    const body = buildDatosAmpladosBody({ idReg: 'opor-01', COVR_TIPO_RESP: 0 });
    expect(body['COVR_COD_EMPRESA']).toBeUndefined();
    expect(body['COVR_AGRUP']).toBeUndefined();
    expect(body['COVR_TIPO_RESP']).toBe(0);
  });
});
