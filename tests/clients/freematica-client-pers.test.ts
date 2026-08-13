import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { FreematicaClient } from '../../src/clients/freematica-client.js';

const BASE_URL = 'https://api.example.com/restsat/api';
const AUTH_HEADERS = {
  'x-auth-token': 'tok',
  'x-auth-company': 'co',
  'x-auth-organization': 'org',
  'x-auth-app': 'app',
  'x-auth-session': 'ses',
};

function listEnv<T>(items: T[], total: number) {
  return {
    errorCode: '200',
    errorMessage: '',
    data: { total: String(total), items, rowHeight: -1 },
  };
}

function okEnv<T>(data: T) {
  return { errorCode: '200', errorMessage: '', data };
}

describe('FreematicaClient — Personal extended methods (pers/*)', () => {
  let client: FreematicaClient;

  beforeEach(() => {
    client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ---------------------------------------------------------------------------
  // listPersonalV2
  // ---------------------------------------------------------------------------

  describe('listPersonalV2', () => {
    it('fetches /pers/v2/personal without fchmodificacion', async () => {
      const fake = [{ VSSPER_COD: 'P001' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 50));

      const result = await client.listPersonalV2({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 50 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes fchmodificacion as query param', async () => {
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal')
        .query({ items: '20', page: '1', fchmodificacion: '2026-01-01' })
        .reply(200, listEnv([], 0));

      const result = await client.listPersonalV2({ items: 20, page: 1, fchmodificacion: '2026-01-01' });

      expect(result).toEqual({ items: [], total: 0 });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalIdentificacion
  // ---------------------------------------------------------------------------

  describe('listPersonalIdentificacion', () => {
    it('fetches /pers/v2/personal-identificacion', async () => {
      const fake = [{ IDENT_TIPO: 'DNI', IDENT_NUM: '12345678A' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal-identificacion')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listPersonalIdentificacion({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalNotas + getPersonalNota
  // ---------------------------------------------------------------------------

  describe('listPersonalNotas', () => {
    it('fetches /pers/v2/personal-notas without idReg', async () => {
      const fake = [{ PERNOT_TIPO: 'OBS' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal-notas')
        .query({ items: '20', page: '1' })
        .reply(200, listEnv(fake, 5));

      const result = await client.listPersonalNotas({ items: 20, page: 1 });

      expect(result).toEqual({ items: fake, total: 5 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes idReg filter as query param', async () => {
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal-notas')
        .query({ items: '20', page: '1', idReg: 'PERS001==' })
        .reply(200, listEnv([], 0));

      await client.listPersonalNotas({ items: 20, page: 1, idReg: 'PERS001==' });

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalNota', () => {
    it('unwraps list envelope and returns first item', async () => {
      const fake = { PERNOT_TIPO: 'HAB', PERNOT_DES: 'Test' };
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal-notas/NOTA001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalNota('NOTA001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when items is empty', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-notas/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalNota('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalExperiencias + getPersonalExperiencia
  // ---------------------------------------------------------------------------

  describe('listPersonalExperiencias', () => {
    it('fetches /pers/v1/personal-experiencias', async () => {
      const fake = [{ PEREX_DES: 'Técnico' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal-experiencias')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 3));

      const result = await client.listPersonalExperiencias({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 3 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes idReg filter', async () => {
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal-experiencias')
        .query({ items: '10', page: '1', idReg: 'PERS001==' })
        .reply(200, listEnv([], 0));

      await client.listPersonalExperiencias({ items: 10, page: 1, idReg: 'PERS001==' });

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalExperiencia', () => {
    it('unwraps list envelope', async () => {
      const fake = { PEREX_DES: 'Analista' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal-experiencias/EXP001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalExperiencia('EXP001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-experiencias/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalExperiencia('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalFormaciones + getPersonalFormacion
  // ---------------------------------------------------------------------------

  describe('listPersonalFormaciones', () => {
    it('fetches /pers/v1/personal-formaciones', async () => {
      const fake = [{ FORM_TITULO: 'FP' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal-formaciones')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 2));

      const result = await client.listPersonalFormaciones({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 2 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalFormacion', () => {
    it('unwraps list envelope', async () => {
      const fake = { FORM_TITULO: 'Ingeniería' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal-formaciones/FORM001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalFormacion('FORM001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-formaciones/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalFormacion('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalContratos + getPersonalContrato
  // ---------------------------------------------------------------------------

  describe('listPersonalContratos', () => {
    it('fetches /pers/v1/personal_contratos', async () => {
      const fake = [{ PERCTRAB_TIPO: 'I' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal_contratos')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 10));

      const result = await client.listPersonalContratos({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 10 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalContrato', () => {
    it('unwraps list envelope', async () => {
      const fake = { PERCTRAB_TIPO: 'I', PERCTRAB_FCH_INICIO: '2024-01-01' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal_contratos/CTRAB001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalContrato('CTRAB001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_contratos/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalContrato('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalTramos + getPersonalTramo
  // ---------------------------------------------------------------------------

  describe('listPersonalTramos', () => {
    it('fetches /pers/v1/personal_tramos', async () => {
      const fake = [{ PERHH_COD_HH: 'H01' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal_tramos')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 20));

      const result = await client.listPersonalTramos({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 20 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalTramo', () => {
    it('unwraps list envelope', async () => {
      const fake = { PERHH_COD_HH: 'H02' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal_tramos/TRAM001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalTramo('TRAM001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_tramos/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalTramo('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalTramosSync + getPersonalTramoV2
  // ---------------------------------------------------------------------------

  describe('listPersonalTramosSync', () => {
    it('fetches /pers/v2/personal/tramos', async () => {
      const fake = [{ PERHH_COD_HH: 'H03' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal/tramos')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 5));

      const result = await client.listPersonalTramosSync({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 5 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes fchmodificacion as query param', async () => {
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal/tramos')
        .query({ items: '10', page: '1', fchmodificacion: '2026-06-01' })
        .reply(200, listEnv([], 0));

      await client.listPersonalTramosSync({ items: 10, page: 1, fchmodificacion: '2026-06-01' });

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalTramoV2', () => {
    it('unwraps list envelope for v2 tramo', async () => {
      const fake = { PERHH_COD_HH: 'H04' };
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal/tramos/TRAMV2%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalTramoV2('TRAMV2==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/tramos/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalTramoV2('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalPago + getPersonalPago
  // ---------------------------------------------------------------------------

  describe('listPersonalPago', () => {
    it('fetches /pers/v1/personal_pago', async () => {
      const fake = [{ PAGO_IBAN: 'ES1234' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal_pago')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 3));

      const result = await client.listPersonalPago({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 3 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalPago', () => {
    it('unwraps list envelope', async () => {
      const fake = { PAGO_IBAN: 'ES9876' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal_pago/PAGO001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalPago('PAGO001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal_pago/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalPago('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalAdicionales
  // ---------------------------------------------------------------------------

  describe('listPersonalAdicionales', () => {
    it('fetches /pers/v2/personal-adicionales', async () => {
      const fake = [{ VSSPERA_COD: 'EXT1' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal-adicionales')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 2));

      const result = await client.listPersonalAdicionales({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 2 });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalProrroga + getPersonalProrroga
  // ---------------------------------------------------------------------------

  describe('listPersonalProrroga', () => {
    it('fetches /pers/v1/personal-prorroga', async () => {
      const fake = [{ PROR_TIPO: 'A' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal-prorroga')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 1));

      const result = await client.listPersonalProrroga({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 1 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalProrroga', () => {
    it('unwraps list envelope', async () => {
      const fake = { PROR_TIPO: 'B' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/personal-prorroga/PROR001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalProrroga('PROR001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/personal-prorroga/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalProrroga('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listIncidenciasPersonal
  // ---------------------------------------------------------------------------

  describe('listIncidenciasPersonal', () => {
    it('fetches /pers/v2/incidencias', async () => {
      const fake = [{ INC_TIPO: 'BAJA' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/incidencias')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 6));

      const result = await client.listIncidenciasPersonal({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 6 });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getAgendaPersona
  // ---------------------------------------------------------------------------

  describe('getAgendaPersona', () => {
    it('fetches /pers/v1/agenda-persona without idReg', async () => {
      const fake = [{ AGENDA_TIPO: 'REUNION' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/agenda-persona')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 3));

      const result = await client.getAgendaPersona({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 3 });
      expect(scope.isDone()).toBe(true);
    });

    it('passes idReg as query param', async () => {
      const scope = nock(BASE_URL)
        .get('/pers/v1/agenda-persona')
        .query({ items: '10', page: '1', idReg: 'PERS001==' })
        .reply(200, listEnv([], 0));

      await client.getAgendaPersona({ items: 10, page: 1, idReg: 'PERS001==' });

      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // listEquipamientoFichaSeguridad
  // ---------------------------------------------------------------------------

  describe('listEquipamientoFichaSeguridad', () => {
    it('fetches /pers/v2/equipamiento-ficha-seguridad', async () => {
      const fake = [{ EQ_TIPO: 'CASCO' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/equipamiento-ficha-seguridad')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 10));

      const result = await client.listEquipamientoFichaSeguridad({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 10 });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // listAnticiposPersonal + getAnticipoPersonal
  // ---------------------------------------------------------------------------

  describe('listAnticiposPersonal', () => {
    it('fetches /pers/v2/personal/anticipos', async () => {
      const fake = [{ ANT_IMPORTE: '500' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal/anticipos')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 2));

      const result = await client.listAnticiposPersonal({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 2 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getAnticipoPersonal', () => {
    it('unwraps list envelope', async () => {
      const fake = { ANT_IMPORTE: '1000' };
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal/anticipos/ANT001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getAnticipoPersonal('ANT001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal/anticipos/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getAnticipoPersonal('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listCalendarioPersonal + getCalendarioPersonal
  // ---------------------------------------------------------------------------

  describe('listCalendarioPersonal', () => {
    it('fetches /pers/v2/personal-cal', async () => {
      const fake = [{ CAL_TIPO: 'VACACIONES' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal-cal')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 30));

      const result = await client.listCalendarioPersonal({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 30 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getCalendarioPersonal', () => {
    it('unwraps list envelope', async () => {
      const fake = { CAL_TIPO: 'PERMISO' };
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal-cal/CAL001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getCalendarioPersonal('CAL001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal-cal/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getCalendarioPersonal('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listCpd + getCpd
  // ---------------------------------------------------------------------------

  describe('listCpd', () => {
    it('fetches /pers/v1/cpd', async () => {
      const fake = [{ CPD_TIPO: 'NOMINA' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/cpd')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 200));

      const result = await client.listCpd({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 200 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getCpd', () => {
    it('unwraps list envelope', async () => {
      const fake = { CPD_TIPO: 'CONTRATO', CPD_ESTADO: 'FIRMADO' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/cpd/CPD001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getCpd('CPD001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/cpd/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getCpd('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listCpdMovimientos + listCpdFirmadosVid
  // ---------------------------------------------------------------------------

  describe('listCpdMovimientos', () => {
    it('fetches /pers/v1/cpd/{idreg}/movimientos', async () => {
      const fake = [{ MOV_TIPO: 'ENVIO' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/cpd/CPD001%3D%3D/movimientos')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 3));

      const result = await client.listCpdMovimientos('CPD001==', { items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 3 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('listCpdFirmadosVid', () => {
    it('fetches /pers/v1/cpd/firmados-vid', async () => {
      const fake = [{ CPD_VID: '123' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/cpd/firmados-vid')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 15));

      const result = await client.listCpdFirmadosVid({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 15 });
      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // listPersonalIrpf + getPersonalIrpf
  // ---------------------------------------------------------------------------

  describe('listPersonalIrpf', () => {
    it('fetches /pers/v2/personal_irpf', async () => {
      const fake = [{ IRPF_TIPO: 'G' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal_irpf')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 50));

      const result = await client.listPersonalIrpf({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 50 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getPersonalIrpf', () => {
    it('unwraps list envelope', async () => {
      const fake = { IRPF_TIPO: 'G', IRPF_NUM_DESC: '2' };
      const scope = nock(BASE_URL)
        .get('/pers/v2/personal_irpf/IRPF001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonalIrpf('IRPF001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v2/personal_irpf/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getPersonalIrpf('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listSesionesFormacion + getSesionFormacion
  // ---------------------------------------------------------------------------

  describe('listSesionesFormacion', () => {
    it('fetches /pers/v1/sesiones-formacion', async () => {
      const fake = [{ SES_TIPO: 'PRESENCIAL' }];
      const scope = nock(BASE_URL)
        .get('/pers/v1/sesiones-formacion')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 9));

      const result = await client.listSesionesFormacion({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 9 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getSesionFormacion', () => {
    it('unwraps list envelope', async () => {
      const fake = { SES_TIPO: 'ONLINE', SES_DURACION: '8' };
      const scope = nock(BASE_URL)
        .get('/pers/v1/sesiones-formacion/SES001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getSesionFormacion('SES001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v1/sesiones-formacion/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getSesionFormacion('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // listVssIncidencias + getVssIncidencia
  // ---------------------------------------------------------------------------

  describe('listVssIncidencias', () => {
    it('fetches /pers/v2/vss-incidencias', async () => {
      const fake = [{ VSS_TIPO: 'AT' }];
      const scope = nock(BASE_URL)
        .get('/pers/v2/vss-incidencias')
        .query({ items: '10', page: '1' })
        .reply(200, listEnv(fake, 7));

      const result = await client.listVssIncidencias({ items: 10, page: 1 });

      expect(result).toEqual({ items: fake, total: 7 });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getVssIncidencia', () => {
    it('unwraps list envelope', async () => {
      const fake = { VSS_TIPO: 'AT', VSS_BAJA: '2026-03-01' };
      const scope = nock(BASE_URL)
        .get('/pers/v2/vss-incidencias/VSS001%3D%3D')
        .reply(200, listEnv([fake], 1));

      const result = await client.getVssIncidencia('VSS001==');

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });

    it('throws not_found when empty', async () => {
      nock(BASE_URL)
        .get('/pers/v2/vss-incidencias/BADID')
        .reply(200, listEnv([], 0));

      await expect(client.getVssIncidencia('BADID')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  // ---------------------------------------------------------------------------
  // Write methods
  // ---------------------------------------------------------------------------

  describe('createPersona', () => {
    it('POSTs to /pers/v1/personal and returns result', async () => {
      const body = { VSSPER_COD: 'P001', VSSPER_NOM: 'Test' };
      const created = { ...body, idReg: 'ABC==' };
      const scope = nock(BASE_URL)
        .post('/pers/v1/personal', body)
        .reply(200, okEnv(created));

      const result = await client.createPersona(body);

      expect(result).toEqual(created);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('updatePersona', () => {
    it('PUTs to /pers/v1/personal/{idReg}', async () => {
      const idReg = 'PERS001==';
      const body = { VSSPER_NOM: 'NewName' };
      const scope = nock(BASE_URL)
        .put(`/pers/v1/personal/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ ...body }));

      const result = await client.updatePersona(idReg, body);

      expect(result).toEqual(body);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalIdentificacion', () => {
    it('POSTs to /pers/v1/personal-identificacion/{idReg}', async () => {
      const idReg = 'PERS001==';
      const body = { IDENT_TIPO: 'DNI' };
      const scope = nock(BASE_URL)
        .post(`/pers/v1/personal-identificacion/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ created: true }));

      const result = await client.createPersonalIdentificacion(idReg, body);

      expect(result).toEqual({ created: true });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalNota + updatePersonalNota', () => {
    it('POSTs to /pers/v2/personal-notas', async () => {
      const body = { PERNOT_TIPO: 'OBS' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/personal-notas', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalNota(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v2/personal-notas/{idReg}', async () => {
      const idReg = 'NOTA001==';
      const body = { PERNOT_DES: 'Updated' };
      const scope = nock(BASE_URL)
        .put(`/pers/v2/personal-notas/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalNota(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalExperiencia', () => {
    it('POSTs to /pers/v2/personal-experiencia', async () => {
      const body = { PEREX_DES: 'Dev' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/personal-experiencia', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalExperiencia(body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalFormacion + updatePersonalFormacion', () => {
    it('POSTs to /pers/v2/personal-formaciones', async () => {
      const body = { FORM_TITULO: 'FP' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/personal-formaciones', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalFormacion(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v2/personal-formaciones/{idReg}', async () => {
      const idReg = 'FORM001==';
      const body = { FORM_NIVEL: 'A' };
      const scope = nock(BASE_URL)
        .put(`/pers/v2/personal-formaciones/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalFormacion(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createIncidenciaBase + updateIncidenciaBase', () => {
    it('POSTs to /pers/v2/incidencias-base', async () => {
      const body = { INC_TIPO: 'BAJA' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/incidencias-base', body)
        .reply(200, okEnv({ created: true }));

      await client.createIncidenciaBase(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v2/incidencias-base/{idReg}', async () => {
      const idReg = 'INC001==';
      const body = { FECHA_FIN: '2026-07-31' };
      const scope = nock(BASE_URL)
        .put(`/pers/v2/incidencias-base/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updateIncidenciaBase(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalPago + updatePersonalPago', () => {
    it('POSTs to /pers/v1/personal_pago', async () => {
      const body = { IBAN: 'ES1234' };
      const scope = nock(BASE_URL)
        .post('/pers/v1/personal_pago', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalPago(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v1/personal_pago/{idReg}', async () => {
      const idReg = 'PAGO001==';
      const body = { PAGO_BANCO: 'BBVA' };
      const scope = nock(BASE_URL)
        .put(`/pers/v1/personal_pago/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalPago(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalTramo + updatePersonalTramo', () => {
    it('POSTs to /pers/v1/personal_tramos', async () => {
      const body = { PERHH_COD_HH: 'H01' };
      const scope = nock(BASE_URL)
        .post('/pers/v1/personal_tramos', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalTramo(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v1/personal_tramos/{idReg}', async () => {
      const idReg = 'TRAM001==';
      const body = { PERHH_JORNADA: 80 };
      const scope = nock(BASE_URL)
        .put(`/pers/v1/personal_tramos/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalTramo(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalContrato + updatePersonalContrato', () => {
    it('POSTs to /pers/v1/personal_contratos', async () => {
      const body = { PERCTRAB_TIPO: 'I' };
      const scope = nock(BASE_URL)
        .post('/pers/v1/personal_contratos', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalContrato(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v1/personal_contratos/{idReg}', async () => {
      const idReg = 'CTRAB001==';
      const body = { PERCTRAB_FCH_FIN: '2026-12-31' };
      const scope = nock(BASE_URL)
        .put(`/pers/v1/personal_contratos/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalContrato(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalAdicional + updatePersonalAdicional', () => {
    it('POSTs to /pers/v2/personal-adicionales', async () => {
      const body = { VSSPERA_COD: 'EXT1' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/personal-adicionales', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalAdicional(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v2/personal-adicionales/{idReg}', async () => {
      const idReg = 'ADIC001==';
      const body = { VSSPERA_TEXTO: 'Nuevo' };
      const scope = nock(BASE_URL)
        .put(`/pers/v2/personal-adicionales/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalAdicional(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createAnticipoPersonal', () => {
    it('POSTs to /pers/v2/personal/anticipos', async () => {
      const body = { ANT_IMPORTE: 500 };
      const scope = nock(BASE_URL)
        .post('/pers/v2/personal/anticipos', body)
        .reply(200, okEnv({ created: true }));

      await client.createAnticipoPersonal(body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createCalendarioPersonal + updateCalendarioPersonal', () => {
    it('POSTs to /pers/v2/personal-cal', async () => {
      const body = { CAL_TIPO: 'VACACIONES' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/personal-cal', body)
        .reply(200, okEnv({ created: true }));

      await client.createCalendarioPersonal(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v2/personal-cal/{idReg}', async () => {
      const idReg = 'CAL001==';
      const body = { CAL_DIAS: 2 };
      const scope = nock(BASE_URL)
        .put(`/pers/v2/personal-cal/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updateCalendarioPersonal(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('updateCpdBulk + updateCpdGestion', () => {
    it('POSTs to /pers/v1/cpd/actualizar', async () => {
      const body = { CPD_ACCION: 'APROBAR' };
      const scope = nock(BASE_URL)
        .post('/pers/v1/cpd/actualizar', body)
        .reply(200, okEnv({ updated: true }));

      await client.updateCpdBulk(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v1/cpd/{idReg}/gestion', async () => {
      const idReg = 'CPD001==';
      const body = { accionCpd: 'APROBAR' };
      const scope = nock(BASE_URL)
        .put(`/pers/v1/cpd/${encodeURIComponent(idReg)}/gestion`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updateCpdGestion(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalIrpf + updatePersonalIrpf', () => {
    it('POSTs to /pers/v2/personal_irpf', async () => {
      const body = { IRPF_TIPO: 'G' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/personal_irpf', body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalIrpf(body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v2/personal_irpf/{idReg}', async () => {
      const idReg = 'IRPF001==';
      const body = { IRPF_RET: '20' };
      const scope = nock(BASE_URL)
        .put(`/pers/v2/personal_irpf/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalIrpf(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('createPersonalIrpfAd + updatePersonalIrpfAd', () => {
    it('POSTs to /pers/v2/personal_irpf_ad/{idReg}', async () => {
      const idReg = 'IRPF001==';
      const body = { IRPFAD_CAMPO: 'DESC' };
      const scope = nock(BASE_URL)
        .post(`/pers/v2/personal_irpf_ad/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ created: true }));

      await client.createPersonalIrpfAd(idReg, body);

      expect(scope.isDone()).toBe(true);
    });

    it('PUTs to /pers/v2/personal_irpf_ad/{idReg}', async () => {
      const idReg = 'IRPFAD001==';
      const body = { IRPFAD_VALOR: '1' };
      const scope = nock(BASE_URL)
        .put(`/pers/v2/personal_irpf_ad/${encodeURIComponent(idReg)}`, body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePersonalIrpfAd(idReg, body);

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('updatePreventor + updatePreventorEstado', () => {
    it('PUTs to /pers/v1/control/preventor', async () => {
      const body = { PREV_ESTADO: 'ACTIVO' };
      const scope = nock(BASE_URL)
        .put('/pers/v1/control/preventor', body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePreventor(body);

      expect(scope.isDone()).toBe(true);
    });

    it('POSTs to /pers/v2/preventor/actualizar-estado', async () => {
      const body = { PREV_ACCION: 'ACTIVAR' };
      const scope = nock(BASE_URL)
        .post('/pers/v2/preventor/actualizar-estado', body)
        .reply(200, okEnv({ updated: true }));

      await client.updatePreventorEstado(body);

      expect(scope.isDone()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getPersonaForUpdate (delegates to getPersona)
  // ---------------------------------------------------------------------------

  describe('getPersonaForUpdate', () => {
    it('delegates to getPersona using /pers/v1/personal/{idreg}', async () => {
      const fake = { VSSPER_COD: 'P001' };
      const idReg = 'PERS001==';
      const scope = nock(BASE_URL)
        .get(`/pers/v1/personal/${encodeURIComponent(idReg)}`)
        .reply(200, listEnv([fake], 1));

      const result = await client.getPersonaForUpdate(idReg);

      expect(result).toEqual(fake);
      expect(scope.isDone()).toBe(true);
    });
  });
});
