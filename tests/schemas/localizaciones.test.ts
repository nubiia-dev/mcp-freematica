import { describe, it, expect } from 'vitest';
import {
  buildLocalizacionClienteBody,
  LOC_FIELD_MAP,
  LOC_TIPOS,
} from '../../src/schemas/localizaciones.js';

describe('LOC_FIELD_MAP', () => {
  it('define los 4 tipos con paths v2 coherentes', () => {
    expect(LOC_TIPOS).toEqual(['cobro', 'envio', 'factura', 'servicio']);
    for (const tipo of LOC_TIPOS) {
      expect(LOC_FIELD_MAP[tipo].path).toMatch(/^\/pgrl\/v2\/localizaciones-.*-clientes$/);
    }
    // factura no tiene GET singular v2: el fetch del update usa v1
    expect(LOC_FIELD_MAP.factura.getPath).toBe('/pgrl/v1/localizaciones-factura-clientes');
    expect(LOC_FIELD_MAP.cobro.getPath).toBe('/pgrl/v2/localizaciones-cobro-clientes');
  });
});

describe('buildLocalizacionClienteBody', () => {
  it('tipo cobro: mapea código/nombre/formaPago y campos comunes', () => {
    const body = buildLocalizacionClienteBody('cobro', {
      grupoCliente: 1,
      codCliente: '1174',
      codLocalizacion: 2,
      nombre: 'COBRO SEDE CENTRAL',
      formaPago: '001',
      codPais: 56,
      codProvincia: '8',
      codPoblacion: 'BARCELONA',
      codPostal: '08001',
      domicilio: 'CL MALLORCA 1',
      email: 'cobros@seur.com',
      telefono1: '930000000',
      telefono2: '930000001',
      contacto: 'ADMINISTRACION',
      camposAdicionales: { CMCC_IBAN: 'ES0000000000000000000000' },
    });
    expect(body).toEqual({
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      LOC_CLI_COB: 2,
      NOM_LOC_COB: 'COBRO SEDE CENTRAL',
      COD_FORMA_PAGO: '001',
      COD_PAIS: 56,
      COD_PROVINCIA: '8',
      COD_POBLACION: 'BARCELONA',
      COD_POSTAL: '08001',
      DOMICILIO: 'CL MALLORCA 1',
      E_MAIL: 'cobros@seur.com',
      TELEFONO1: '930000000',
      TELEFONO2: '930000001',
      COB_CONTACTO: 'ADMINISTRACION',
      CMCC_IBAN: 'ES0000000000000000000000',
    });
  });

  it('tipo envio: usa LOC_CLI_ENV, NOM_LOC_ENV y DOMICILIO_ENVIO; ignora formaPago', () => {
    const body = buildLocalizacionClienteBody('envio', {
      grupoCliente: 1,
      codCliente: '1174',
      codLocalizacion: 3,
      nombre: 'ALMACEN NORTE',
      formaPago: '001',
      domicilio: 'POL IND NORTE NAVE 4',
      contacto: 'JEFE ALMACEN',
    });
    expect(body).toEqual({
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      LOC_CLI_ENV: 3,
      NOM_LOC_ENV: 'ALMACEN NORTE',
      DOMICILIO_ENVIO: 'POL IND NORTE NAVE 4',
      ENV_CONTACTO: 'JEFE ALMACEN',
    });
  });

  it('tipo factura: usa LOC_CLI_FAC / NOM_LOC_FAC / FAC_CONTACTO', () => {
    const body = buildLocalizacionClienteBody('factura', {
      codLocalizacion: 1,
      nombre: 'SEDE FISCAL',
      contacto: 'CONTABILIDAD',
    });
    expect(body).toEqual({
      LOC_CLI_FAC: 1,
      NOM_LOC_FAC: 'SEDE FISCAL',
      FAC_CONTACTO: 'CONTABILIDAD',
    });
  });

  it('tipo servicio: usa LOC_CLI_SERV / DESCRIPCION / CONTACTO', () => {
    const body = buildLocalizacionClienteBody('servicio', {
      grupoCliente: 1,
      codCliente: '1174',
      codLocalizacion: 6,
      nombre: 'NAVE SEUR SUBIRATS',
      domicilio: 'CAN BOSC D ANOIA SN',
      camposAdicionales: { CMCS_COD_DLG: '08' },
    });
    expect(body).toEqual({
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      LOC_CLI_SERV: 6,
      DESCRIPCION: 'NAVE SEUR SUBIRATS',
      DOMICILIO: 'CAN BOSC D ANOIA SN',
      CMCS_COD_DLG: '08',
    });
  });

  it('devuelve body vacío sin campos definidos', () => {
    expect(buildLocalizacionClienteBody('servicio', {})).toEqual({});
  });
});
