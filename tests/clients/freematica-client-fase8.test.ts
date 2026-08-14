/**
 * Tests de cliente para los métodos de Fase 8 (módulos pequeños).
 *
 * Cubre: pett, pkai, pedv, pfree, pdir, pgdoc, pcuo, mcom, ppde, comp, psel, ptes.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
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

function listEnv(items: unknown[] = [], total = 0) {
  return { errorCode: '200', errorMessage: '', data: { items, total } };
}

function detailEnv(data: unknown) {
  return { errorCode: '200', errorMessage: '', data };
}

let client: FreematicaClient;

beforeEach(() => {
  client = new FreematicaClient({ baseUrl: BASE_URL, authHeaders: AUTH_HEADERS });
});

afterEach(() => {
  nock.cleanAll();
});

// ---------------------------------------------------------------------------
// pett — ETT
// ---------------------------------------------------------------------------

describe('pett — ETT', () => {
  it('listPettPeticionesServ', async () => {
    nock(BASE_URL).get('/pett/v2/peticiones-serv').query(true).reply(200, listEnv([{ idReg: 'P1' }], 1));
    const r = await client.listPettPeticionesServ({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('listPettPeticionesServPerso', async () => {
    nock(BASE_URL).get('/pett/v2/peticiones-serv-perso').query(true).reply(200, listEnv([], 0));
    const r = await client.listPettPeticionesServPerso({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('listPettOfertas', async () => {
    nock(BASE_URL).get('/pett/v2/ofertas').query(true).reply(200, listEnv([{ idReg: 'O1' }], 1));
    const r = await client.listPettOfertas({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('listPettPartesEttC', async () => {
    nock(BASE_URL).get('/pett/v1/partes_ett_c').query(true).reply(200, listEnv([], 0));
    const r = await client.listPettPartesEttC({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('createPettPeticionServ', async () => {
    nock(BASE_URL).post('/pett/v2/peticiones-serv').reply(200, detailEnv({ idReg: 'NEW' }));
    const r = await client.createPettPeticionServ({ CAMPO: 'valor' });
    expect(r).toMatchObject({ idReg: 'NEW' });
  });

  it('createPettPeticionServPerso', async () => {
    nock(BASE_URL).post('/pett/v2/peticiones-serv/perso').reply(200, detailEnv({ idReg: 'NEW2' }));
    const r = await client.createPettPeticionServPerso({});
    expect(r).toMatchObject({ idReg: 'NEW2' });
  });

  it('updatePettPeticionServ', async () => {
    nock(BASE_URL).put('/pett/v2/peticiones-serv/P001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePettPeticionServ('P001==', { CAMPO: 'valor' });
    expect(r).toMatchObject({ ok: true });
  });

  it('updatePettPeticionServPersoEstado', async () => {
    nock(BASE_URL).put('/pett/v2/peticiones-serv/perso/estado/P001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePettPeticionServPersoEstado('P001==', { ESTADO: 'A' });
    expect(r).toMatchObject({ ok: true });
  });

  it('updatePettPeticionServDuplicar', async () => {
    nock(BASE_URL).put('/pett/v2/peticiones-serv/duplicar/P001%3D%3D').reply(200, detailEnv({ idReg: 'P002' }));
    const r = await client.updatePettPeticionServDuplicar('P001==');
    expect(r).toMatchObject({ idReg: 'P002' });
  });

  it('createPettGestionPartesEttC', async () => {
    nock(BASE_URL).post('/pett/v1/gestion_partes_ett_c').reply(200, detailEnv({ ok: true }));
    const r = await client.createPettGestionPartesEttC({});
    expect(r).toMatchObject({ ok: true });
  });

  it('updatePettProcesoServicioFin', async () => {
    nock(BASE_URL).put('/pett/v2/procesos_servicio_fin/P001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePettProcesoServicioFin('P001==', {});
    expect(r).toMatchObject({ ok: true });
  });

  it('updatePettProcesoServicio', async () => {
    nock(BASE_URL).put('/pett/v2/procesos-servicio/P001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePettProcesoServicio('P001==', {});
    expect(r).toMatchObject({ ok: true });
  });

  it('updatePettProcesoServicioProrroga', async () => {
    nock(BASE_URL).put('/pett/v2/procesos-servicio-prorrogas/P001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePettProcesoServicioProrroga('P001==', {});
    expect(r).toMatchObject({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// pkai — KAIROS fichajes
// ---------------------------------------------------------------------------

describe('pkai — KAIROS fichajes', () => {
  it('listPkaiHistoricosV1', async () => {
    nock(BASE_URL).get('/pkai/v1/historicos').query(true).reply(200, listEnv([{ idReg: 'H1' }], 1));
    const r = await client.listPkaiHistoricosV1({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('listPkaiHistoricosV2', async () => {
    nock(BASE_URL).get('/pkai/v2/historicos').query(true).reply(200, listEnv([], 0));
    const r = await client.listPkaiHistoricosV2({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('listPkaiTiposMarcajes', async () => {
    nock(BASE_URL).get('/pkai/v1/tiposmarcajes').query(true).reply(200, listEnv([{ idReg: 'TM1' }], 1));
    const r = await client.listPkaiTiposMarcajes({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('createPkaiMarcaje', async () => {
    nock(BASE_URL).post('/pkai/v1/marcajes').reply(200, detailEnv({ idReg: 'M1' }));
    const r = await client.createPkaiMarcaje({ TIPO: 'E' });
    expect(r).toMatchObject({ idReg: 'M1' });
  });
});

// ---------------------------------------------------------------------------
// pedv — pedidos venta portal
// ---------------------------------------------------------------------------

describe('pedv — pedidos venta portal', () => {
  it('listPedvPedidos', async () => {
    nock(BASE_URL).get('/pedv/v1/pedidos').query(true).reply(200, listEnv([{ idReg: 'PED1' }], 1));
    const r = await client.listPedvPedidos({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('listPedvPedidosLineas', async () => {
    nock(BASE_URL).get('/pedv/v1/pedidos-lineas').query(true).reply(200, listEnv([], 0));
    const r = await client.listPedvPedidosLineas({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('createPedvPedidoServir', async () => {
    nock(BASE_URL).post('/pedv/v1/pedidos/PED001%3D%3D/servir').reply(200, detailEnv({ ok: true }));
    const r = await client.createPedvPedidoServir('PED001==', {});
    expect(r).toMatchObject({ ok: true });
  });

  it('updatePedvServirPedidoV2', async () => {
    nock(BASE_URL).put('/pedv/v2/control/servir-pedidos/PED001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePedvServirPedidoV2('PED001==', {});
    expect(r).toMatchObject({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// pfree — IPs internas/ERP
// ---------------------------------------------------------------------------

describe('pfree — IPs internas/ERP', () => {
  it('listPfreeIps', async () => {
    nock(BASE_URL).get('/pfree/v2/ips').query(true).reply(200, listEnv([{ idReg: 'IP1' }], 1));
    const r = await client.listPfreeIps({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('listPfreeIpsErp', async () => {
    nock(BASE_URL).get('/pfree/v2/ips-erp').query(true).reply(200, listEnv([], 0));
    const r = await client.listPfreeIpsErp({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('getPfreeIp', async () => {
    nock(BASE_URL).get('/pfree/v2/ips/IP001%3D%3D').reply(200, detailEnv({ idReg: 'IP001==' }));
    const r = await client.getPfreeIp('IP001==');
    expect(r).toMatchObject({ idReg: 'IP001==' });
  });

  it('getPfreeIpErp', async () => {
    nock(BASE_URL).get('/pfree/v2/ips-erp/ERP001%3D%3D').reply(200, detailEnv({ idReg: 'ERP001==' }));
    const r = await client.getPfreeIpErp('ERP001==');
    expect(r).toMatchObject({ idReg: 'ERP001==' });
  });
});

// ---------------------------------------------------------------------------
// pdir — CSM indicadores
// ---------------------------------------------------------------------------

describe('pdir — CSM indicadores', () => {
  it('listPdirCsmGrupoIndicador', async () => {
    nock(BASE_URL).get('/pdir/v1/csm/grupoindicador').query(true).reply(200, listEnv([{ idReg: 'GI1' }], 1));
    const r = await client.listPdirCsmGrupoIndicador({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('listPdirCsmIndicador', async () => {
    nock(BASE_URL).get('/pdir/v1/csm/indicador').query(true).reply(200, listEnv([], 0));
    const r = await client.listPdirCsmIndicador({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('getPdirCsmIndicador', async () => {
    nock(BASE_URL).get('/pdir/v1/csm/indicador/IND001%3D%3D').reply(200, detailEnv({ idReg: 'IND001==' }));
    const r = await client.getPdirCsmIndicador('IND001==');
    expect(r).toMatchObject({ idReg: 'IND001==' });
  });
});

// ---------------------------------------------------------------------------
// pgdoc — documentos electrónicos
// ---------------------------------------------------------------------------

describe('pgdoc — documentos electrónicos', () => {
  it('listPgdocEdocs', async () => {
    nock(BASE_URL).get('/pgdoc/v2/edocs/docs').query(true).reply(200, listEnv([{ idReg: 'DOC1' }], 1));
    const r = await client.listPgdocEdocs({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// pcuo — beneficiarios y partes
// ---------------------------------------------------------------------------

describe('pcuo — beneficiarios y partes', () => {
  it('listPcuoBeneficiarios', async () => {
    nock(BASE_URL).get('/pcuo/v2/beneficiarios').query(true).reply(200, listEnv([{ idReg: 'B1' }], 1));
    const r = await client.listPcuoBeneficiarios({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('getPcuoBeneficiario', async () => {
    nock(BASE_URL).get('/pcuo/v2/beneficiarios/B001%3D%3D').reply(200, detailEnv({ idReg: 'B001==' }));
    const r = await client.getPcuoBeneficiario('B001==');
    expect(r).toMatchObject({ idReg: 'B001==' });
  });

  it('createPcuoBeneficiario', async () => {
    nock(BASE_URL).post('/pcuo/v2/beneficiarios').reply(200, detailEnv({ idReg: 'NEW_B' }));
    const r = await client.createPcuoBeneficiario({ NOMBRE: 'Test' });
    expect(r).toMatchObject({ idReg: 'NEW_B' });
  });

  it('updatePcuoBeneficiario', async () => {
    nock(BASE_URL).put('/pcuo/v2/beneficiarios/B001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePcuoBeneficiario('B001==', {});
    expect(r).toMatchObject({ ok: true });
  });

  it('listPcuoPartes', async () => {
    nock(BASE_URL).get('/pcuo/v2/partes').query(true).reply(200, listEnv([], 0));
    const r = await client.listPcuoPartes({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('getPcuoParte', async () => {
    nock(BASE_URL).get('/pcuo/v2/partes/PA001%3D%3D').reply(200, detailEnv({ idReg: 'PA001==' }));
    const r = await client.getPcuoParte('PA001==');
    expect(r).toMatchObject({ idReg: 'PA001==' });
  });

  it('createPcuoParte', async () => {
    nock(BASE_URL).post('/pcuo/v2/partes').reply(200, detailEnv({ idReg: 'NEW_P' }));
    const r = await client.createPcuoParte({});
    expect(r).toMatchObject({ idReg: 'NEW_P' });
  });

  it('updatePcuoParte', async () => {
    nock(BASE_URL).put('/pcuo/v2/partes/PA001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePcuoParte('PA001==', {});
    expect(r).toMatchObject({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// mcom — usuarios comunicaciones
// ---------------------------------------------------------------------------

describe('mcom — usuarios comunicaciones', () => {
  it('listMcomUsuarios', async () => {
    nock(BASE_URL).get('/mcom/v2/usuarios').query(true).reply(200, listEnv([{ idReg: 'U1' }], 1));
    const r = await client.listMcomUsuarios({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('getMcomUsuario', async () => {
    nock(BASE_URL).get('/mcom/v2/usuarios/U001%3D%3D').reply(200, detailEnv({ idReg: 'U001==' }));
    const r = await client.getMcomUsuario('U001==');
    expect(r).toMatchObject({ idReg: 'U001==' });
  });

  it('createMcomUsuario', async () => {
    nock(BASE_URL).post('/mcom/v2/usuarios').reply(200, detailEnv({ idReg: 'NEW_U' }));
    const r = await client.createMcomUsuario({ LOGIN: 'test@example.com' });
    expect(r).toMatchObject({ idReg: 'NEW_U' });
  });

  it('updateMcomUsuario', async () => {
    nock(BASE_URL).put('/mcom/v2/usuarios/U001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updateMcomUsuario('U001==', {});
    expect(r).toMatchObject({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// ppde — portal del empleado
// ---------------------------------------------------------------------------

describe('ppde — portal del empleado', () => {
  it('listPpdeConfiguracionAccesoUsuario', async () => {
    nock(BASE_URL).get('/ppde/v2/configuracion-acceso-usuario').query(true).reply(200, listEnv([], 0));
    const r = await client.listPpdeConfiguracionAccesoUsuario({ page: 1, items: 10 });
    expect(r.items).toEqual([]);
  });

  it('getPpdeConfiguracionAccesoUsuario', async () => {
    nock(BASE_URL).get('/ppde/v2/configuracion-acceso-usuario/CFG001%3D%3D').reply(200, detailEnv({ idReg: 'CFG001==' }));
    const r = await client.getPpdeConfiguracionAccesoUsuario('CFG001==');
    expect(r).toMatchObject({ idReg: 'CFG001==' });
  });

  it('listPpdePersonalDoc', async () => {
    nock(BASE_URL).get('/ppde/v1/personal_doc').query(true).reply(200, listEnv([{ idReg: 'PD1' }], 1));
    const r = await client.listPpdePersonalDoc({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('getPpdePersonalDoc', async () => {
    nock(BASE_URL).get('/ppde/v1/personal_doc/PD001%3D%3D').reply(200, detailEnv({ idReg: 'PD001==' }));
    const r = await client.getPpdePersonalDoc('PD001==');
    expect(r).toMatchObject({ idReg: 'PD001==' });
  });

  it('listPpdeSolicitudVacaciones', async () => {
    nock(BASE_URL).get('/ppde/v2/solicitud-vacaciones').query(true).reply(200, listEnv([{ idReg: 'VAC1' }], 1));
    const r = await client.listPpdeSolicitudVacaciones({ page: 1, items: 10 });
    expect(r.total).toBe(1);
  });

  it('getPpdeSolicitudVacacion', async () => {
    nock(BASE_URL).get('/ppde/v2/solicitud-vacaciones/VAC001%3D%3D').reply(200, detailEnv({ idReg: 'VAC001==' }));
    const r = await client.getPpdeSolicitudVacacion('VAC001==');
    expect(r).toMatchObject({ idReg: 'VAC001==' });
  });

  it('updatePpdeSolicitudVacacion', async () => {
    nock(BASE_URL).put('/ppde/v2/solicitud-vacaciones/VAC001%3D%3D').reply(200, detailEnv({ ok: true }));
    const r = await client.updatePpdeSolicitudVacacion('VAC001==', { ESTADO: 'A' });
    expect(r).toMatchObject({ ok: true });
  });

  it('createPpdeRecordatorioFirma', async () => {
    nock(BASE_URL).post('/ppde/v2/recordatorio_firma').reply(200, detailEnv({ ok: true }));
    const r = await client.createPpdeRecordatorioFirma({});
    expect(r).toMatchObject({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// comp — compras
// ---------------------------------------------------------------------------

describe('comp — compras', () => {
  it('createCompAlbaranCompra', async () => {
    nock(BASE_URL).post('/comp/v2/albaranes-compras').reply(200, detailEnv({ idReg: 'ALB1' }));
    const r = await client.createCompAlbaranCompra({ REF: '001' });
    expect(r).toMatchObject({ idReg: 'ALB1' });
  });

  it('createCompRegistroGastosContrato', async () => {
    nock(BASE_URL).post('/comp/v2/registro-gastos-contratos').reply(200, detailEnv({ idReg: 'RGC1' }));
    const r = await client.createCompRegistroGastosContrato({});
    expect(r).toMatchObject({ idReg: 'RGC1' });
  });
});

// ---------------------------------------------------------------------------
// psel — selección
// ---------------------------------------------------------------------------

describe('psel — selección', () => {
  it('createPselCandidato', async () => {
    nock(BASE_URL).post('/psel/v2/control/candidatos').reply(200, detailEnv({ idReg: 'CAND1' }));
    const r = await client.createPselCandidato({ NOMBRE: 'Candidato Test' });
    expect(r).toMatchObject({ idReg: 'CAND1' });
  });
});

// ---------------------------------------------------------------------------
// ptes — tesorería
// ---------------------------------------------------------------------------

describe('ptes — tesorería', () => {
  it('createPtesImportarFicheroN43', async () => {
    nock(BASE_URL).post('/ptes/v1/importar-fichero-n43').reply(200, detailEnv({ ok: true }));
    const r = await client.createPtesImportarFicheroN43({ FICHERO: 'base64data==' });
    expect(r).toMatchObject({ ok: true });
  });
});
