import { describe, it, expect } from 'vitest';
import {
  buildPemfMarcajeBody,
  buildPemfMarcajeFechaPersonaBody,
  buildPemfDeviceBody,
  buildPemfRondaBody,
  buildPemfRutaBody,
} from '../../src/schemas/pemf.js';

// ---------------------------------------------------------------------------
// buildPemfMarcajeBody
// ---------------------------------------------------------------------------

describe('buildPemfMarcajeBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildPemfMarcajeBody({})).toEqual({});
  });

  it('maps all supplied fields', () => {
    const body = buildPemfMarcajeBody({
      idReg: 'marc-01',
      date: '2026-08-13T08:00:00Z',
      trackType: 'ENT',
      serviceTag: 'SVC001',
      device: 'DEV001',
      latitude: 41.3851,
      longitude: 2.1734,
      incidenceDescription: 'Alarma activada',
      incidence: 'INC01',
      personTag: 'OP001',
      positionOrigin: 'gps',
      positionPrecision: 5,
      photo: 'base64...',
      appVersion: '2.0.0',
      deviceVersion: 'Android 14',
      deviceLang: 'es',
      noRestriction: true,
    });

    expect(body).toMatchObject({
      idReg: 'marc-01',
      date: '2026-08-13T08:00:00Z',
      trackType: 'ENT',
      serviceTag: 'SVC001',
      device: 'DEV001',
      latitude: 41.3851,
      longitude: 2.1734,
      incidenceDescription: 'Alarma activada',
      incidence: 'INC01',
      personTag: 'OP001',
      positionOrigin: 'gps',
      positionPrecision: 5,
      photo: 'base64...',
      appVersion: '2.0.0',
      deviceVersion: 'Android 14',
      deviceLang: 'es',
      noRestriction: true,
    });
  });

  it('skips undefined fields', () => {
    const body = buildPemfMarcajeBody({ trackType: 'SAL' });
    expect(body).toEqual({ trackType: 'SAL' });
    expect(body).not.toHaveProperty('date');
  });

  it('merges camposAdicionales when provided', () => {
    const body = buildPemfMarcajeBody({
      trackType: 'ENT',
      camposAdicionales: { MOV_CAMPO1: 'extra', MOV_NUM: 42 },
    });
    expect(body['trackType']).toBe('ENT');
    expect(body['MOV_CAMPO1']).toBe('extra');
    expect(body['MOV_NUM']).toBe(42);
  });

  it('does NOT add camposAdicionales key when undefined', () => {
    const body = buildPemfMarcajeBody({ trackType: 'ENT' });
    expect(body).not.toHaveProperty('camposAdicionales');
  });
});

// ---------------------------------------------------------------------------
// buildPemfMarcajeFechaPersonaBody
// ---------------------------------------------------------------------------

describe('buildPemfMarcajeFechaPersonaBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildPemfMarcajeFechaPersonaBody({})).toEqual({});
  });

  it('maps all supplied fields', () => {
    const body = buildPemfMarcajeFechaPersonaBody({
      date: '2026-08-13T09:00:00Z',
      personTag: 'OP002',
      serviceTag: 'SVC001',
      trackType: 'SAL',
    });
    expect(body).toEqual({
      date: '2026-08-13T09:00:00Z',
      personTag: 'OP002',
      serviceTag: 'SVC001',
      trackType: 'SAL',
    });
  });

  it('merges camposAdicionales when provided', () => {
    const body = buildPemfMarcajeFechaPersonaBody({
      personTag: 'OP002',
      camposAdicionales: { MOV_EXTRA: 'val' },
    });
    expect(body['personTag']).toBe('OP002');
    expect(body['MOV_EXTRA']).toBe('val');
  });
});

// ---------------------------------------------------------------------------
// buildPemfDeviceBody
// ---------------------------------------------------------------------------

describe('buildPemfDeviceBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildPemfDeviceBody({})).toEqual({});
  });

  it('maps all supplied fields', () => {
    const body = buildPemfDeviceBody({
      name: 'Lector NFC Puerta A',
      description: 'Lector NFC instalado en puerta principal',
      type: 'NFC',
      status: 'active',
      serialNumber: 'SN-001',
      serviceTag: 'SVC001',
    });
    expect(body).toEqual({
      name: 'Lector NFC Puerta A',
      description: 'Lector NFC instalado en puerta principal',
      type: 'NFC',
      status: 'active',
      serialNumber: 'SN-001',
      serviceTag: 'SVC001',
    });
  });

  it('merges camposAdicionales when provided', () => {
    const body = buildPemfDeviceBody({
      name: 'Dispositivo X',
      camposAdicionales: { DEV_CAMPO: 'extra' },
    });
    expect(body['name']).toBe('Dispositivo X');
    expect(body['DEV_CAMPO']).toBe('extra');
  });
});

// ---------------------------------------------------------------------------
// buildPemfRondaBody
// ---------------------------------------------------------------------------

describe('buildPemfRondaBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildPemfRondaBody({})).toEqual({});
  });

  it('maps all supplied fields', () => {
    const body = buildPemfRondaBody({
      name: 'Ronda Nocturna',
      description: 'Ronda de control nocturno',
      serviceTag: 'SVC001',
      startDate: '2026-08-13T22:00:00Z',
      endDate: '2026-08-14T06:00:00Z',
    });
    expect(body).toEqual({
      name: 'Ronda Nocturna',
      description: 'Ronda de control nocturno',
      serviceTag: 'SVC001',
      startDate: '2026-08-13T22:00:00Z',
      endDate: '2026-08-14T06:00:00Z',
    });
  });

  it('merges camposAdicionales when provided', () => {
    const body = buildPemfRondaBody({
      name: 'Ronda A',
      camposAdicionales: { RON_TIPO: 'T1' },
    });
    expect(body['name']).toBe('Ronda A');
    expect(body['RON_TIPO']).toBe('T1');
  });
});

// ---------------------------------------------------------------------------
// buildPemfRutaBody
// ---------------------------------------------------------------------------

describe('buildPemfRutaBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildPemfRutaBody({})).toEqual({});
  });

  it('maps all supplied fields', () => {
    const body = buildPemfRutaBody({
      empresa: 'EMP1',
      delegacion: 'DEL1',
      claseServicio: 'VS',
      contrato: '1234',
      servicio: 'SVC001',
      turno: 'T1',
      frecuencia: 'D',
      diaDef: 'L',
      hhPpto: 8,
      hhRealizar: 8,
      persona: 'OP001',
      empPerso: 'EMP1',
      delegPerso: 'DEL1',
      tarea: 'TAR01',
      hhIni: '08:00',
      hhFin: '16:00',
      tipoAsign: 'A',
      generarTurnosSQ: true,
      detFrec: 'DETALLE',
      diasNoServ: 'FS',
      hhRealizarDesp: 0.5,
      hhIniDesp: '07:30',
      hhFinDesp: '08:00',
      codTarea: 'CT01',
      fchIni: '2026-01-01',
      tipoAsignDesp: 'B',
      usuarioUpdate: 'admin',
      fechaUpdate: '2026-08-13T00:00:00Z',
      diasDecalaje: 1,
    });

    expect(body).toMatchObject({
      empresa: 'EMP1',
      delegacion: 'DEL1',
      persona: 'OP001',
      hhIni: '08:00',
      hhFin: '16:00',
      generarTurnosSQ: true,
      diasDecalaje: 1,
    });
  });

  it('skips undefined fields', () => {
    const body = buildPemfRutaBody({ empresa: 'EMP1' });
    expect(body).toEqual({ empresa: 'EMP1' });
    expect(body).not.toHaveProperty('delegacion');
  });

  it('merges camposAdicionales when provided', () => {
    const body = buildPemfRutaBody({
      empresa: 'EMP1',
      camposAdicionales: { RUT_EXTRA: 'val', RUT_NUM: 99 },
    });
    expect(body['empresa']).toBe('EMP1');
    expect(body['RUT_EXTRA']).toBe('val');
    expect(body['RUT_NUM']).toBe(99);
  });
});
