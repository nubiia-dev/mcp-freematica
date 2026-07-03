import { describe, it, expect } from 'vitest';
import {
  buildClienteBody,
  buildClienteIdReg,
  buildContactoClienteBody,
  mergeForUpdate,
} from '../../src/schemas/clientes.js';

describe('buildClienteIdReg', () => {
  it('codifica Base64("GRUPO__COD")', () => {
    // Formato verificado: "MV9fMTAwMA==" = "1__1000"
    expect(buildClienteIdReg(1, '1000')).toBe('MV9fMTAwMA==');
  });
});

describe('buildClienteBody', () => {
  it('mapea todos los campos amigables a columnas VoClientes', () => {
    const body = buildClienteBody({
      grupoCliente: 1,
      codCliente: '1174',
      nombre: 'SEUR SUBIRATS',
      nif: 'B12345678',
      tipoImpuesto: 'IVA',
      divisa: 'EUR',
      tipoFacturacion: 'M',
      personaFiscal: 'SEUR GEOSERVICES SA',
      contacto: 'JUAN',
      cargo: 'GERENTE',
      tipoVia: 'CL',
      nombreVia: 'CAN BOSC',
      numero: 'SN',
      codPoblacion: 'SUBIRATS',
      codPostal: '08739',
      codProvincia: '8',
      codPais: '56',
      email: 'x@y.com',
      web: 'https://y.com',
      telefono1: '930000000',
      telefono2: '930000001',
      nombreComercial: 'SEUR',
      representante: '05',
      codTipo: '01',
      comentarios: 'Alta desde MCP',
      camposAdicionales: { COD_TARIFA: 'T1', CREDITO: 5000 },
    });
    expect(body).toEqual({
      COD_GRUPO_CLI: 1,
      COD_CLI: '1174',
      NOMBRE_CLI: 'SEUR SUBIRATS',
      NIF: 'B12345678',
      TIPO_IMPTO: 'IVA',
      COD_DIVISA: 'EUR',
      TIPO_FACT: 'M',
      PERSONA_FISCAL: 'SEUR GEOSERVICES SA',
      CONTACTO: 'JUAN',
      CARGO: 'GERENTE',
      TIPO_VIA: 'CL',
      NOMBRE_VIA: 'CAN BOSC',
      NUMERO: 'SN',
      COD_POBLACION: 'SUBIRATS',
      COD_POSTAL: '08739',
      COD_PROVINCIA: '8',
      COD_PAIS: '56',
      E_MAIL: 'x@y.com',
      WEB: 'https://y.com',
      TELEFONO1: '930000000',
      TELEFONO2: '930000001',
      NOMBRECOMERCIAL: 'SEUR',
      REPRESENTANTE: '05',
      COD_TIPO: '01',
      COMENTARIOS: 'Alta desde MCP',
      COD_TARIFA: 'T1',
      CREDITO: 5000,
    });
  });

  it('devuelve body vacío sin campos definidos', () => {
    expect(buildClienteBody({})).toEqual({});
  });
});

describe('buildContactoClienteBody', () => {
  it('mapea todos los campos y convierte los booleanos a flags', () => {
    const body = buildContactoClienteBody({
      grupoCliente: 1,
      codCliente: '1174',
      nombreApellidos: 'MARIA LOPEZ',
      cargo: 'RESPONSABLE COMPRAS',
      codCargo: 'COMP',
      telefono: '930000000',
      movil: '600000000',
      email: 'maria@seur.com',
      nif: '12345678Z',
      comentarios: 'Contacto principal de facturación',
      contactoPrincipal: true,
      decisor: false,
      inactivo: false,
      localizacion: 6,
      linkedin: 'https://linkedin.com/in/maria',
      camposAdicionales: { CC_SALUDO: 'Sra.' },
    });
    expect(body).toEqual({
      CC_GRUPO_CLI: 1,
      CC_CLI: '1174',
      CC_NOM_APELL: 'MARIA LOPEZ',
      CC_CARGO: 'RESPONSABLE COMPRAS',
      CC_COD_CARGO: 'COMP',
      CC_TELEFONO: '930000000',
      CC_MOBIL: '600000000',
      CC_EMAIL1: 'maria@seur.com',
      CC_NIF: '12345678Z',
      CC_COMENTARIOS: 'Contacto principal de facturación',
      CC_CONTACTO_PRINCIPAL: '1',
      CC_DECISOR: '0',
      CC_INACTIVO: '0',
      CC_LOCALIZ: 6,
      CC_LINKEDIN: 'https://linkedin.com/in/maria',
      CC_SALUDO: 'Sra.',
    });
  });

  it('devuelve body vacío sin campos definidos', () => {
    expect(buildContactoClienteBody({})).toEqual({});
  });
});

describe('mergeForUpdate', () => {
  it('fusiona cambios sobre el estado actual y elimina metadatos', () => {
    const current = {
      CC_GRUPO_CLI: 1,
      CC_CLI: '1174',
      CC_NOM_APELL: 'MARIA LOPEZ',
      CC_EMAIL1: 'vieja@seur.com',
      RowNumber: 3,
      _id: '3',
      _cellSettings: '[]',
      idReg: 'ABC=',
    };
    const merged = mergeForUpdate(current, { CC_EMAIL1: 'nueva@seur.com' });
    expect(merged).toEqual({
      CC_GRUPO_CLI: 1,
      CC_CLI: '1174',
      CC_NOM_APELL: 'MARIA LOPEZ',
      CC_EMAIL1: 'nueva@seur.com',
      idReg: 'ABC=',
    });
  });

  it('no muta el objeto original', () => {
    const current = { A: 1, RowNumber: 1 };
    mergeForUpdate(current, { A: 2 });
    expect(current).toEqual({ A: 1, RowNumber: 1 });
  });
});
