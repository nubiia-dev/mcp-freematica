import { describe, it, expect } from 'vitest';
import {
  buildPpreContratoBody,
  buildOrdenTrabajoBody,
  buildMarcajeBody,
} from '../../src/schemas/ppre.js';

// ---------------------------------------------------------------------------
// buildPpreContratoBody
// ---------------------------------------------------------------------------

describe('buildPpreContratoBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildPpreContratoBody({})).toEqual({});
  });

  it('maps all string fields when supplied', () => {
    const body = buildPpreContratoBody({
      CON_CODEMP: '02',
      CON_DELEG: '08',
      CON_TIPOCONT: 'MA',
      CON_CODCLI: '1234',
      CON_NOM_INSTALACION: 'Instalación A',
      CON_ABONADO: 'AB001',
      CON_CLAVEFAC: 'CF01',
      CON_CONTACTO: 'Juan García',
      CON_TELEFONO: '612345678',
      CON_TELEFONO2: '912345678',
      CON_TELEFONO3: '932345678',
      CON_FCHCONT: '2026-01-15T10:00:00.000Z',
      CON_ULTFCH_INTERV: '2026-03-01T10:00:00.000Z',
      CON_PROXFCH_INTERV: '2026-09-01T10:00:00.000Z',
      CON_ULTFCH_FAC: '2026-06-01T10:00:00.000Z',
      CON_PROXFCH_FAC: '2026-12-01T10:00:00.000Z',
      CON_OBSERVACIONES: 'Sin observaciones',
      CON_TIPO_MANT: 'TM01',
      CON_TIPO_MANT_DESC: 'Mantenimiento preventivo',
      DESC_MANT: 'Descripción del mantenedor',
      CON_MANTENEDOR: 'M01',
      NOM_MANTENEDOR: 'Empresa Mantenedora S.L.',
      CON_TIPOCONT_DESC: 'Mantenimiento Anual',
      NOMBRE_CLI: 'Cliente S.A.',
      CON_FCH_INI_SERVICIO: '2026-01-01T00:00:00.000Z',
      CON_TIPO_NEGOCIO: 'TN01',
      CON_TIPO_NEGOCIO_DESC: 'Seguridad',
    });

    expect(body).toMatchObject({
      CON_CODEMP: '02',
      CON_DELEG: '08',
      CON_TIPOCONT: 'MA',
      CON_CODCLI: '1234',
      CON_NOM_INSTALACION: 'Instalación A',
      CON_ABONADO: 'AB001',
      CON_CLAVEFAC: 'CF01',
      CON_CONTACTO: 'Juan García',
      CON_TELEFONO: '612345678',
      CON_TELEFONO2: '912345678',
      CON_TELEFONO3: '932345678',
      CON_FCHCONT: '2026-01-15T10:00:00.000Z',
      CON_ULTFCH_INTERV: '2026-03-01T10:00:00.000Z',
      CON_PROXFCH_INTERV: '2026-09-01T10:00:00.000Z',
      CON_ULTFCH_FAC: '2026-06-01T10:00:00.000Z',
      CON_PROXFCH_FAC: '2026-12-01T10:00:00.000Z',
      CON_OBSERVACIONES: 'Sin observaciones',
      CON_TIPO_MANT: 'TM01',
      CON_TIPO_MANT_DESC: 'Mantenimiento preventivo',
      DESC_MANT: 'Descripción del mantenedor',
      CON_MANTENEDOR: 'M01',
      NOM_MANTENEDOR: 'Empresa Mantenedora S.L.',
      CON_TIPOCONT_DESC: 'Mantenimiento Anual',
      NOMBRE_CLI: 'Cliente S.A.',
      CON_FCH_INI_SERVICIO: '2026-01-01T00:00:00.000Z',
      CON_TIPO_NEGOCIO: 'TN01',
      CON_TIPO_NEGOCIO_DESC: 'Seguridad',
    });
  });

  it('maps nullable numeric fields when non-null', () => {
    const body = buildPpreContratoBody({
      CON_NUMCONT: 42,
      CON_INSTALACION: 7,
      CON_IMP_CUOTA_ANY: 1200.5,
      CON_PERIOD_INTERV: 12,
      CON_LOC_COBRO: 3,
    });

    expect(body).toEqual({
      CON_NUMCONT: 42,
      CON_INSTALACION: 7,
      CON_IMP_CUOTA_ANY: 1200.5,
      CON_PERIOD_INTERV: 12,
      CON_LOC_COBRO: 3,
    });
  });

  it('maps nullable numeric fields as null', () => {
    const body = buildPpreContratoBody({
      CON_NUMCONT: null,
      CON_INSTALACION: null,
      CON_IMP_CUOTA_ANY: null,
      CON_PERIOD_INTERV: null,
      CON_LOC_COBRO: null,
    });

    expect(body).toEqual({
      CON_NUMCONT: null,
      CON_INSTALACION: null,
      CON_IMP_CUOTA_ANY: null,
      CON_PERIOD_INTERV: null,
      CON_LOC_COBRO: null,
    });
  });

  it('merges camposAdicionales into body', () => {
    const body = buildPpreContratoBody({
      CON_CODEMP: '02',
      camposAdicionales: { CON_CAMPO_EXTRA: 'extra' },
    });

    expect(body).toEqual({ CON_CODEMP: '02', CON_CAMPO_EXTRA: 'extra' });
  });

  it('does not add camposAdicionales key when undefined', () => {
    const body = buildPpreContratoBody({ CON_CODEMP: '02' });
    expect(Object.keys(body)).not.toContain('camposAdicionales');
  });
});

// ---------------------------------------------------------------------------
// buildOrdenTrabajoBody
// ---------------------------------------------------------------------------

describe('buildOrdenTrabajoBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildOrdenTrabajoBody({})).toEqual({});
  });

  it('maps all AVI_* and PPC_* string fields', () => {
    const body = buildOrdenTrabajoBody({
      AVI_CODEMP: '02',
      AVI_DELEG: '08',
      AVI_FECHA: '2026-08-01T09:00:00.000Z',
      AVI_COD_CLIENTE: 'CLI001',
      AVI_NOM_CLIENTE: 'Cliente Test S.A.',
      AVI_NOM_COMERCIAL: 'Cliente Test',
      AVI_TIPO_CONTRATO: 'MA',
      AVI_FCH_CONTRATO: '2026-01-01T00:00:00.000Z',
      AVI_ABONADO: 'AB001',
      AVI_NOMBRE_INS: 'Edificio Central',
      AVI_PROVINCIA_INSTAL: '08',
      AVI_CPOSTAL_INSTAL: '08001',
      AVI_POBLACION_INSTAL: 'Barcelona',
      AVI_DIRECCION_INSTAL: 'Calle Mayor 1',
      AVI_ZONA_INSTAL: 'Z01',
      AVI_TELEFONO: '612345678',
      AVI_TELEFONO2_INS: '932345678',
      AVI_TELEFONO3_INS: '932345679',
      AVI_CONTACTO: 'José López',
      AVI_MANTENEDOR: 'M01',
      AVI_TIPO_INCIDENCIA: 'TI01',
      AVI_TEXTO_TRAB_SOLICITADO: 'Revisión anual',
      AVI_ORIGEN_ORD_TRABAJO: 'MANUAL',
      AVI_TIPO_MANT: 'TM01',
      AVI_TEXTO_TRAB_REALIZADO: 'Revisión completada',
      PPC_STATUS_COMENTARIOS: 'Sin incidencias',
      PPC_HORA_AVISO_ACU: '09:00',
      PPC_HORA_RECOGIDA_ACU: '09:30',
      PPC_HORA_LLEGADA_ACU: '10:00',
      PPC_HORA_SALIDA_ACU: '12:00',
      AVI_TIPO_INSTALACION: 'ASCENSOR',
      AVI_TIPO_PROCESO: 'PREVENTIVO',
      AVI_PARTE_OPERARIO: 'OP001',
    });

    expect(body).toMatchObject({
      AVI_CODEMP: '02',
      AVI_DELEG: '08',
      AVI_FECHA: '2026-08-01T09:00:00.000Z',
      AVI_COD_CLIENTE: 'CLI001',
      AVI_NOM_CLIENTE: 'Cliente Test S.A.',
      AVI_TEXTO_TRAB_SOLICITADO: 'Revisión anual',
      AVI_TEXTO_TRAB_REALIZADO: 'Revisión completada',
      PPC_HORA_AVISO_ACU: '09:00',
      PPC_HORA_SALIDA_ACU: '12:00',
    });
  });

  it('maps numeric fields (AVI_GRUPO_CLI, AVI_NUM_CONTRATO, AVI_INSTALACION, AVI_PAIS_INSTAL, PPC_GENERAR_PARTES, PPL_*)', () => {
    const body = buildOrdenTrabajoBody({
      AVI_GRUPO_CLI: 1,
      AVI_NUM_CONTRATO: 101,
      AVI_INSTALACION: 5,
      AVI_PAIS_INSTAL: 724,
      PPC_GENERAR_PARTES: 1,
      PPL_IMP_LIN_OPC1_CTTO: 150.0,
      PPL_CANT_LIN_IMPUT: 2,
    });

    expect(body).toEqual({
      AVI_GRUPO_CLI: 1,
      AVI_NUM_CONTRATO: 101,
      AVI_INSTALACION: 5,
      AVI_PAIS_INSTAL: 724,
      PPC_GENERAR_PARTES: 1,
      PPL_IMP_LIN_OPC1_CTTO: 150.0,
      PPL_CANT_LIN_IMPUT: 2,
    });
  });

  it('merges camposAdicionales into body', () => {
    const body = buildOrdenTrabajoBody({
      AVI_CODEMP: '02',
      camposAdicionales: { AVI_CAMPO_EXTRA: 999 },
    });

    expect(body).toEqual({ AVI_CODEMP: '02', AVI_CAMPO_EXTRA: 999 });
  });

  it('does not add camposAdicionales key when undefined', () => {
    const body = buildOrdenTrabajoBody({ AVI_CODEMP: '02' });
    expect(Object.keys(body)).not.toContain('camposAdicionales');
  });
});

// ---------------------------------------------------------------------------
// buildMarcajeBody
// ---------------------------------------------------------------------------

describe('buildMarcajeBody', () => {
  it('returns empty object when no fields supplied', () => {
    expect(buildMarcajeBody({})).toEqual({});
  });

  it('maps all marcaje string fields', () => {
    const body = buildMarcajeBody({
      idReg: 'abc123==',
      date: '2026-08-01T09:00:00.000Z',
      trackType: 'ENT',
      serviceTag: 'SVC001',
      device: 'DEV001',
      incidenceDescription: 'Incidencia en puerta',
      incidence: 'INC01',
      personTag: 'PER001',
      photo: 'base64encodedstring',
      appVersion: '2.5.0',
      deviceVersion: 'Android 13',
      deviceLang: 'es',
    });

    expect(body).toMatchObject({
      idReg: 'abc123==',
      date: '2026-08-01T09:00:00.000Z',
      trackType: 'ENT',
      serviceTag: 'SVC001',
      device: 'DEV001',
      incidenceDescription: 'Incidencia en puerta',
      incidence: 'INC01',
      personTag: 'PER001',
      photo: 'base64encodedstring',
      appVersion: '2.5.0',
      deviceVersion: 'Android 13',
      deviceLang: 'es',
    });
  });

  it('maps numeric fields (latitude, longitude, positionPrecision)', () => {
    const body = buildMarcajeBody({
      latitude: 41.3851,
      longitude: 2.1734,
      positionPrecision: 10.5,
    });

    expect(body).toEqual({
      latitude: 41.3851,
      longitude: 2.1734,
      positionPrecision: 10.5,
    });
  });

  it('maps positionOrigin and noRestriction fields', () => {
    const body = buildMarcajeBody({
      positionOrigin: 'gps',
      noRestriction: true,
    });

    expect(body).toEqual({
      positionOrigin: 'gps',
      noRestriction: true,
    });
  });

  it('maps noRestriction=false', () => {
    const body = buildMarcajeBody({ noRestriction: false });
    expect(body).toEqual({ noRestriction: false });
  });

  it('maps all trackType values', () => {
    const trackTypes = ['ENT', 'NOV', 'SAL', 'I', 'A', 'POS'] as const;
    for (const trackType of trackTypes) {
      const body = buildMarcajeBody({ trackType });
      expect(body).toEqual({ trackType });
    }
  });

  it('maps all positionOrigin values', () => {
    const origins = ['network', 'gps', 'fixed'] as const;
    for (const positionOrigin of origins) {
      const body = buildMarcajeBody({ positionOrigin });
      expect(body).toEqual({ positionOrigin });
    }
  });

  it('merges camposAdicionales into body', () => {
    const body = buildMarcajeBody({
      trackType: 'ENT',
      camposAdicionales: { CAMPO_EXTRA: 'extra_val' },
    });

    expect(body).toEqual({ trackType: 'ENT', CAMPO_EXTRA: 'extra_val' });
  });

  it('does not add camposAdicionales key when undefined', () => {
    const body = buildMarcajeBody({ trackType: 'SAL' });
    expect(Object.keys(body)).not.toContain('camposAdicionales');
  });
});
