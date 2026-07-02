import { describe, it, expect } from 'vitest';
import {
  buildContratoBody,
  buildServicioBody,
  buildHistoricoPreciosBody,
  buildFacturacionTxtBody,
  buildServicioFacturacionBody,
  buildContratoOpcionalesBody,
} from '../../src/schemas/contratos.js';

const CONTRATO_PARTS = { empresa: '02', delegacion: '08', codContrato: '2304' };
const SERVICIO_PARTS = { ...CONTRATO_PARTS, codServicio: '1' };

describe('buildContratoBody', () => {
  it('mapea todos los campos amigables a CTRT_*', () => {
    const body = buildContratoBody({
      empresa: '02',
      delegacion: '08',
      codContrato: '9001',
      descripcion: 'DESC',
      fecha: '2026-07-01',
      codCliente: '1174',
      pais: 56,
      provincia: '8',
      codPostal: '08739',
      poblacion: 'SUBIRATS',
      tipoVia: 'CL',
      nombreVia: 'CAN BOSC',
      ubicacionVia: 'NAVE 2',
      abierto: true,
      localizacionServicio: 6,
      estadistico: '01',
    });
    expect(body).toEqual({
      CTRT_EMP: '02',
      CTRT_DELEG: '08',
      CTRT_COD: '9001',
      CTRT_DES: 'DESC',
      CTRT_FECHA: '2026-07-01',
      CTRT_COD_CLI: '1174',
      CTRT_PAIS: 56,
      CTRT_PROV: '8',
      CTRT_CPOSTAL: '08739',
      CTRT_POB: 'SUBIRATS',
      CTRT_TVIA: 'CL',
      CTRT_NOMVIA: 'CAN BOSC',
      CTRT_UBIVIA: 'NAVE 2',
      CTRT_ABIERTO: '1',
      CTRT_LOC_SERV: 6,
      CTRT_ESTADISTICO: '01',
    });
  });

  it('convierte abierto=false a "0"', () => {
    expect(buildContratoBody({ abierto: false })).toEqual({ CTRT_ABIERTO: '0' });
  });

  it('devuelve body vacío sin campos definidos', () => {
    expect(buildContratoBody({})).toEqual({});
  });
});

describe('buildServicioBody', () => {
  it('incluye siempre las claves derivadas y mapea todos los campos', () => {
    const body = buildServicioBody(CONTRATO_PARTS, {
      codServicio: '9',
      descripcion: 'LIMPIEZA',
      inspector: '11',
      tipo: '2',
      fechaAlta: '2026-07-01',
      fechaFin: '2026-12-31',
      precioEspecial: '2',
      nombreResponsable: 'RESP',
      situacion: 'SIT',
      calendarioFestivo: '08739',
      secuencial: '0',
      clase: '201',
      mesIncremento: 1,
      observacionesPuesto: 'OBS',
    });
    expect(body).toEqual({
      CTRTS_EMP: '02',
      CTRTS_DELEG: '08',
      CTRTS_CTRT: '2304',
      CTRTS_COD: '9',
      CTRTS_DES: 'LIMPIEZA',
      CTRTS_INSP: '11',
      CTRTS_TIPO: '2',
      CTRTS_FECALTA: '2026-07-01',
      CTRTS_FECFIN: '2026-12-31',
      CTRTS_PRECIO_ESP: '2',
      CTRTS_NOMPROD: 'RESP',
      CTRTS_SITUACION: 'SIT',
      CTRTS_CALFEST: '08739',
      CTRTS_SECUENCIAL: '0',
      CTRTS_CLASE: '201',
      CTRTS_MES_INCRE: 1,
      CTRTS_OBS_PUESTO: 'OBS',
    });
  });

  it('sin campos opcionales solo lleva las claves derivadas', () => {
    expect(buildServicioBody(CONTRATO_PARTS, {})).toEqual({
      CTRTS_EMP: '02',
      CTRTS_DELEG: '08',
      CTRTS_CTRT: '2304',
    });
  });
});

describe('buildHistoricoPreciosBody', () => {
  it('mapea todos los precios y convierte noAplicado', () => {
    const body = buildHistoricoPreciosBody(SERVICIO_PARTS, {
      fecha: '2026-07-01',
      porcentajeIncremento: 3.5,
      precioHoraGlobal: 18.5,
      precioHoraGlobalAnterior: 17.9,
      precioHoraDiurna: 18,
      precioHoraDiurnaAnterior: 17.5,
      precioHoraNocturna: 21,
      precioHoraNocturnaAnterior: 20.5,
      precioHoraFestiva: 25,
      precioHoraFestivaAnterior: 24,
      precioHoraNocturnaFestiva: 28,
      precioHoraNocturnaFestivaAnterior: 27,
      importeFijo: 1200,
      importeFijoAnterior: 1150,
      fechaIncremento: '2027-01-01',
      tipoRevision: 1,
      noAplicado: true,
      origen: 'M',
    });
    expect(body).toEqual({
      SERVHPR_EMP: '02',
      SERVHPR_DELEG: '08',
      SERVHPR_CTRT: '2304',
      SERVHPR_SERV: '1',
      SERVHPR_FCH: '2026-07-01',
      SERVHPR_PORC_INCR: 3.5,
      SERVHPR_PR_H_GLOBAL: 18.5,
      SERVHPR_PR_H_GLOBAL_ANT: 17.9,
      SERVHPR_PR_H_DIUR: 18,
      SERVHPR_PR_H_DIUR_ANT: 17.5,
      SERVHPR_PR_H_NOCT: 21,
      SERVHPR_PR_H_NOCT_ANT: 20.5,
      SERVHPR_PR_H_FEST: 25,
      SERVHPR_PR_H_FEST_ANT: 24,
      SERVHPR_PR_H_NOCFEST: 28,
      SERVHPR_PR_H_NOCFEST_ANT: 27,
      SERVHPR_IMP_FIJO: 1200,
      SERVHPR_IMP_FIJO_ANT: 1150,
      SERVHPR_FCH_INCR: '2027-01-01',
      SERVHPR_TIPO_REV: 1,
      SERVHPR_NO_APLICADO: '1',
      SERVHPR_ORIGEN: 'M',
    });
  });

  it('noAplicado=false se convierte a "0"; sin campos solo claves', () => {
    expect(buildHistoricoPreciosBody(SERVICIO_PARTS, { noAplicado: false })).toEqual({
      SERVHPR_EMP: '02',
      SERVHPR_DELEG: '08',
      SERVHPR_CTRT: '2304',
      SERVHPR_SERV: '1',
      SERVHPR_NO_APLICADO: '0',
    });
    expect(buildHistoricoPreciosBody(SERVICIO_PARTS, {})).toEqual({
      SERVHPR_EMP: '02',
      SERVHPR_DELEG: '08',
      SERVHPR_CTRT: '2304',
      SERVHPR_SERV: '1',
    });
  });
});

describe('buildFacturacionTxtBody', () => {
  it('incluye las 5 claves requeridas y los textos opcionales', () => {
    expect(
      buildFacturacionTxtBody(SERVICIO_PARTS, {
        linea: '1',
        texto: 'TXT',
        textoAmpliado: 'TXT LARGO',
      }),
    ).toEqual({
      CTRTFL_EMP: '02',
      CTRTFL_DELEG: '08',
      CTRTFL_CTRT: '2304',
      CTRTFL_SERV: '1',
      CTRTFL_LIN: '1',
      CTRTFL_TXT: 'TXT',
      CTRTFL_TXT_AMPLIADO: 'TXT LARGO',
    });
  });

  it('sin textos solo lleva las claves + línea', () => {
    expect(buildFacturacionTxtBody(SERVICIO_PARTS, { linea: '2' })).toEqual({
      CTRTFL_EMP: '02',
      CTRTFL_DELEG: '08',
      CTRTFL_CTRT: '2304',
      CTRTFL_SERV: '1',
      CTRTFL_LIN: '2',
    });
  });
});

describe('buildServicioFacturacionBody', () => {
  it('mapea todos los campos amigables, ivaIncluido y camposAdicionales', () => {
    const body = buildServicioFacturacionBody(SERVICIO_PARTS, {
      tipoCobro: 'M',
      horasContrato: 160,
      precioHora: 19.75,
      importeFacturacion: 3200,
      claveFacturacion: 'CLV1',
      referencia: 'REF',
      formaPago: '001',
      descuentoEspecial: 5,
      precioHoraDiurna: 18,
      precioHoraNocturna: 21,
      precioHoraFestiva: 25,
      precioHoraNocturnaFestiva: 28,
      ivaIncluido: true,
      camposAdicionales: { CTRTF_PORCFAC: 100, CTRTF_SERVFAC: '1' },
    });
    expect(body).toEqual({
      CTRTF_EMP: '02',
      CTRTF_DELEG: '08',
      CTRTF_CTRT: '2304',
      CTRTF_SERV: '1',
      CTRTF_TIPCOB: 'M',
      CTRTF_HHCTRT: 160,
      CTRTF_PRECIOH: 19.75,
      CTRTF_IMPFACF: 3200,
      CTRTF_CLAVEF: 'CLV1',
      CTRTF_REF: 'REF',
      CTRTF_FPAGO: '001',
      CTRTF_DTO_ESP: 5,
      CTRTF_PRECIOH_D: 18,
      CTRTF_PRECIOH_N: 21,
      CTRTF_PRECIOH_F: 25,
      CTRTF_PRECIOH_NF: 28,
      CTRTF_IVA_INC: '1',
      CTRTF_PORCFAC: 100,
      CTRTF_SERVFAC: '1',
    });
  });

  it('ivaIncluido=false → "0"; sin campos solo claves derivadas', () => {
    expect(buildServicioFacturacionBody(SERVICIO_PARTS, { ivaIncluido: false })).toEqual({
      CTRTF_EMP: '02',
      CTRTF_DELEG: '08',
      CTRTF_CTRT: '2304',
      CTRTF_SERV: '1',
      CTRTF_IVA_INC: '0',
    });
    expect(buildServicioFacturacionBody(SERVICIO_PARTS, {})).toEqual({
      CTRTF_EMP: '02',
      CTRTF_DELEG: '08',
      CTRTF_CTRT: '2304',
      CTRTF_SERV: '1',
    });
  });
});

describe('buildContratoOpcionalesBody', () => {
  it('mapea todos los campos y fusiona camposAdicionales', () => {
    const body = buildContratoOpcionalesBody({
      empresa: '02',
      delegacion: '08',
      tipoContrato: 'MANT',
      numContrato: 2304,
      fechaContrato: '2023-06-19',
      observaciones1: 'OBS1',
      observaciones2: 'OBS2',
      servicio: 'LIMP',
      categoria: 'CAT1',
      importeFijo: 500,
      camposAdicionales: { CON2_OPC_NUM1: 42, CON2_OPC_ALFA1: 'X' },
    });
    expect(body).toEqual({
      CON2_CODEMP: '02',
      CON2_DELEG: '08',
      CON2_TIPOCONT: 'MANT',
      CON2_NUMCONT: 2304,
      CON2_FCHCONT: '2023-06-19',
      CON2_OBSERV1: 'OBS1',
      CON2_OBSERV2: 'OBS2',
      CON2_SERVICIO: 'LIMP',
      CON2_CATEGORIA: 'CAT1',
      CON2_IMPORTE_FIJO: 500,
      CON2_OPC_NUM1: 42,
      CON2_OPC_ALFA1: 'X',
    });
  });

  it('devuelve body vacío sin campos definidos', () => {
    expect(buildContratoOpcionalesBody({})).toEqual({});
  });
});
