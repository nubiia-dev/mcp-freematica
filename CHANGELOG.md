# Changelog

Todas las versiones notables del paquete `@serlimar/mcp-freematica` se documentan aquí. Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.5.1] — 2026-06-09

### Added — Tools de facturas electrónicas (TD-154)

- `freematica_list_facturas_electronicas` — list facturas Facturae/EDICOM via `GET /pven/v1/facturas`
- `freematica_get_factura_electronica` — detalle por idReg
- `freematica_get_factura_documento` — devuelve VoFacturasDocumento (JSON, no binario). Aplica truncate si excede `FREEMATICA_MAX_RESPONSE_SIZE_MB`
- `freematica_get_factura_log` — log de eventos (auditoría)
- `freematica_get_edicom_info` — estado integración EDICOM (contiene credenciales — usar con precaución)
- `freematica_list_facturas_documentos` — descarga masiva con guardrail de tamaño

Tests: 42 nuevos. Coverage `src/tools/facturas-electronicas.ts`: 99.61% stmts.

---

### Tools de pedidos de compra (TD-152)

#### Added

- **`freematica_list_pedidos_compra`** (`src/tools/pedidos-compras.ts`): lista paginada de pedidos de compra desde `GET /pcmp/v2/pedidos`.
  - Parámetros nativos: `empresa` (codEmpresa), `codProveedor`, `fechaPedidoDesde` (desdeFecha), `fechaPedidoHasta` (hastaFecha).
  - Filtros FIQL: `numPedido` (ALCC_NUMDOC), `codDocumento` (ALCC_CODDOC), `delegacion` (ALCC_DELEG), `formaPago` (ALCC_FPAGO), `tipoIva` (ALCC_TIPO_IVA), `codCliente` (ALCC_COD_CLIENTE), `codInstalador` (ALCC_COD_INSTALADOR), `codMantenedor` (ALCC_COD_MANTENEDOR), `referencia` (ALCC_REFERENCIA), `rango fechaEntregaDesde/Hasta` (ALCC_FCHENTREGA).
  - Filtro `estado`: enum `pendiente | bloqueado | recibido` mapeado a FIQL compuesto sobre `ALCC_PED_BLOQ` y `ALCC_PED_RECIB` usando la convención empírica `''` (empty string) como centinela de null.

- **`freematica_get_pedido_compra`** (`src/tools/pedidos-compras.ts`): detalle de un pedido por `idReg` opaco. Devuelve estructura compuesta `{ VoPedidosCompraCab, cabecera_proveedor, lineas[] }`. Endpoint: `GET /pcmp/v2/pedidos/{idReg}`.

- **`src/schemas/pedidos-compras.ts`**: `EstadoPedidoEnum`, `buildEstadoPedidoFiql()` y `ListPedidosCompraFiltersSchema` con constraints tipados (empresa=4 chars exactos, delegacion=4, formaPago=3, tipoIva=4).

- **`FreematicaClient`** (`src/clients/freematica-client.ts`): métodos `listPedidosCompra(opts)` y `getPedidoCompra(idReg)`.

#### Tests

- `tests/tools/pedidos-compras.test.ts`: 31 tests (registro, happy path con todos los filtros nativos y FIQL, estado enum, errores 404/500/401).
- `tests/clients/freematica-client.test.ts`: +17 tests de los 2 métodos nuevos del cliente.
- `tests/coverage-gaps.test.ts`: +4 tests de ramas `catch (err instanceof Error)` de ambas tools.
- **Total: 648 tests, todos en verde**.

#### Coverage

- `src/schemas/pedidos-compras.ts`: 100% statements, 100% branches
- `src/tools/pedidos-compras.ts`: 100% statements, 84.61% branches
- `src/tools/**`: 71.28% branches (umbral mínimo: 70%)

**Total tools registradas:** 34 (vs 32 en v0.5.0).

---

## [0.5.0] — 2026-06-10

### Release de la épica TD-116 — Ampliación dominio financiero/PRL + hardening

Promueve `0.5.0-rc.2` a versión estable tras integrar las 8 stories de la épica TD-116:

- **TD-117** Foundation: FIQL builder + HardenedBaseClient (timeout, retry+backoff, circuit breaker, 429 honor Retry-After) + logging estructurado pino con sanitización de credenciales.
- **TD-118** Tools de cartera clientes + facturas de ventas (7 tools).
- **TD-119** Tools de facturas de compras + proveedores + localizaciones (7 tools). Incluye fix funcional crítico: `FCC_FCHFAC_HASTA` reemplazado por composición AND con el campo real `FCC_FCHFAC`.
- **TD-120** Tools de contabilidad (cuentas, cuentas analíticas, export-asientos con protección de tamaño 10MB).
- **TD-121** Tools de PRL + personal + calendarios (7 tools).
- **TD-122** 6 nuevos catálogos en master-data (18 → 24).
- **TD-123** Coverage global 99.4% (clients 98.12%, schemas 99.68%, tools 100%). Property-based tests del FIQL builder. 595 tests totales.
- **TD-124** Documentación completa (README ampliado, 3 ADRs, examples ejecutables) + CI/CD hardening (GitHub Actions, Dependabot, CodeQL) + pre-commit husky/lint-staged + Dockerfile production-ready + TypeScript strict flags (`noImplicitOverride`, `noFallthroughCasesInSwitch`).

**Total tools registradas:** 25 (vs 8 en v0.4.1).

---

## [0.5.0-rc.2] — 2026-06-09

### Testing gap + property-based tests + coverage (TD-123)

#### Tests añadidos

- `tests/pagination-edge-cases.test.ts`: edge cases del adapter de paginación (página vacía, total=0, items=null, page más allá del último).
- `tests/coverage-gaps.test.ts`: tests para los métodos `post`, `put`, `delete` del `BaseClient` y para las ramas `catch (err instanceof Error)` genéricas de todas las tools.
- `tests/fiql-builder.property.test.ts`: properties adicionales — idempotencia de escape, presencia literal de keys, separadores AND/OR en composiciones, operadores en output, safety con inputs maliciosos, manejo de `in` con array vacío.
- `docs/testing-e2e.md`: documentación manual para verificación con MCP Inspector.

#### Coverage

- Global statements: **99.4%** (antes 95.36%)
- `src/clients/`: **98.12%** statements / 87.76% branch
- `src/schemas/`: **99.68%** statements / 100% branch
- `src/tools/`: **100%** statements / 70.37% branch

#### Total tests

- **595** tests (antes 548), todos en verde.

#### Limpieza

- Eliminados marcadores residuales de conflict en `CHANGELOG.md` provenientes de merges anteriores de la épica TD-116.

---

### Fixes post code-review (TD-121)

#### Fixed

- **Tests fecha range `fechaCitaDesde/Hasta`** (`tests/clients/freematica-client.test.ts`, `tests/tools/prl.test.ts`): añadidos 3 tests de client-level y 1 test tool-level verificando que `listVigilanciaSalud` genera correctamente `PERVS_FCH_CITA=ge=`, `PERVS_FCH_CITA=le=` y la combinación `ge+le;` al pasar `fechaCitaDesde`, `fechaCitaHasta` o ambos.

- **Version mismatch**: `package.json`, `src/server.ts` y `src/index.ts` alineados a `0.5.0-rc.2`.

- **README tools table**: añadidas 7 filas para las tools de PRL, Personal y Calendarios introducidas en TD-121 (`freematica_get_ficha_prev_cliente`, `freematica_list_vigilancia_salud`, `freematica_get_vigilancia_salud`, `freematica_list_personal`, `freematica_get_persona`, `freematica_list_calendarios`, `freematica_list_calendario_periodos`).

#### Tests summary (post-fix)

- Tests nuevos: +4 (3 client-level + 1 tool-level fecha range)
- Total: 303 tests, todos en verde

### Fixed — Post code-review (TD-120)

- **Version mismatch** (`package.json`, `src/server.ts`, `src/index.ts`): alineadas las tres referencias de versión a `0.5.0-rc.2`. El log de stdio también actualizado de `v0.4.1` a `v0.5.0-rc.2`.

- **`loadMaxResponseSizeMb()` no respetaba validación Zod** (`src/clients/freematica-client.ts`): la función leía `FREEMATICA_MAX_RESPONSE_SIZE_MB` sin aplicar las restricciones `min(1).max(500).int()` del schema en `config.ts`. Añadidos bounds check (`< 1 || > 500`) y validación `Number.isInteger()`. Valores fuera de rango devuelven el default de 10 MB.

- **Asunción `borrador` FIQL sin documentar** (`src/clients/freematica-client.ts`): añadido JSDoc prominente en el bloque `if (opts.borrador !== undefined)` explicando que `ASI_BORR != ''` / `ASI_BORR == ''` es la convención empíricamente observada para campos nullable en Freemática FIQL, no verificada contra la API real. Añadido TODO para verificación futura.

- **Respuesta truncada no incluía campo `total`** (`src/tools/contabilidad.ts`): el payload del branch truncado omitía `total`, impidiendo que el cliente supiera cuántos registros existen en la API. Añadido `total: result.total` al payload. Nuevo test `respuesta truncada incluye campo total con el total real de la API` verifica el comportamiento.

---

## [0.5.0] — 2026-06-09

### PRL + Personal + Calendarios (TD-121)

#### Added

- **PRL tools** (`src/tools/prl.ts`): 3 nuevas tools de Prevención de Riesgos Laborales.
  - `freematica_get_ficha_prev_cliente` — ficha PRL de un cliente. Filtros nativos (NO FIQL): codCliente, grupoCliente, codLocalizacionServicio, codigoFicha. Validación `.refine()` interna exige al menos un identificador para evitar devolver el dataset completo.
  - `freematica_list_vigilancia_salud` — lista paginada de registros VS con filtros FIQL (empresa, delegación, codPersona, tipoRevision, resultado, rango fechaCita) e idRegPersona como query param nativo.
  - `freematica_get_vigilancia_salud` — detalle por idReg opaco.

- **Personal tools** (`src/tools/personal.ts`): 2 nuevas tools de RRHH.
  - `freematica_list_personal` — lista paginada con filtros FIQL: empresa, delegación, codPersona, nombre (parcial), apellido (parcial), NIF, situación, departamento, sección, activo (boolean → `VSSPER_ACTIVO==S/N`).
  - `freematica_get_persona` — detalle por idReg opaco.

- **Calendarios tools** (`src/tools/calendarios.ts`): 2 nuevas tools de calendarios laborales.
  - `freematica_list_calendarios` — lista paginada de calendarios.
  - `freematica_list_calendario_periodos` — periodos de un calendario concreto (path param idCalendario + paginación).

- **FreematicaClient** (`src/clients/freematica-client.ts`): 7 nuevos métodos:
  `getFichaPrevCliente`, `listVigilanciaSalud`, `getVigilanciaSalud`,
  `listPersonal`, `getPersona`, `listCalendarios`, `listCalendarioPeriodos`.

- **Tests** (`tests/tools/prl.test.ts`, `tests/tools/personal.test.ts`, `tests/tools/calendarios.test.ts`): suites completas con nock — happy path + 4xx/5xx por tool. Test específico del `.refine()` de `FichaPrevClienteRefinedSchema` (8 casos).

- **Tests cliente** (`tests/clients/freematica-client.test.ts`): 25 nuevos tests de los 7 métodos nuevos del cliente.

- **server.ts**: versión bumped a `0.5.0`, se registran los 3 grupos nuevos de tools (15 tools totales).

#### Tests summary

- Total: 299 tests, todos en verde
- Coverage de archivos nuevos: 100% statements/lines

### Added — Contabilidad (TD-120)

#### Tools nuevas

- **`freematica_list_cuentas_contables`** (`src/tools/contabilidad.ts`): lista el plan de cuentas contables desde `GET /pcon/v2/cuentas`. Soporta filtros FIQL: `codPlan` (COD_PLAN), `prefijoCuenta` (prefix match léxico sobre COD_CTA usando `=ge=`/`=lt=`), `activa` (CTA_ACTIVA==1 o ==0), `grupoCuenta` (COD_GRUPO_CTA).

- **`freematica_list_cuentas_analiticas`** (`src/tools/contabilidad.ts`): lista el catálogo de cuentas analíticas desde `GET /pcon/v2/cuentas-analiticas`. Filtros FIQL: `codPlan`, `prefijoCuenta` (sobre COD_CTA_ANL), `activa` (CTA_ACTIVA_ANL), `grupoCuenta` (COD_GRUPO_ANL), `area` (AREA_ANL), `delegacion` (DELEG).

- **`freematica_export_asientos`** (`src/tools/contabilidad.ts`): exporta asientos contables en batch desde `GET /pcon/v2/export-asientos`.
  - Parámetros nativos obligatorios: `empresa` (4 chars exactos), `cal` (4 chars exactos).
  - Parámetro nativo opcional: `periodo` (max 2 chars).
  - Filtros FIQL: `fechaDesde`/`fechaHasta` (sobre ASI_FCHASI), `diario` (ASI_DIARIO), `borrador` (ASI_BORR).
  - **Protección de tamaño**: si la respuesta JSON supera `FREEMATICA_MAX_RESPONSE_SIZE_MB` (default 10 MB), los items se truncan con búsqueda binaria y se añade `warning` a la respuesta. Se loguea `warn` con metadatos.
  - Description advierte explícitamente de usar rangos de fecha cortos.

#### Nuevos métodos en FreematicaClient

- `listCuentasContables(opts)` → `GET /pcon/v2/cuentas`
- `listCuentasAnaliticas(opts)` → `GET /pcon/v2/cuentas-analiticas`
- `exportAsientos(opts)` → `GET /pcon/v2/export-asientos` con validación de tamaño y truncado

#### Nueva variable de entorno

- **`FREEMATICA_MAX_RESPONSE_SIZE_MB`** (default: 10, min: 1, max: 500): límite de tamaño de respuesta para `freematica_export_asientos`. Si se supera, los datos se truncan con warning en lugar de error. Documentada en `src/config.ts` y README.

#### Tests

- `tests/tools/contabilidad.test.ts`: 36 tests (happy path, filtros FIQL, Zod schema, truncado, 500s).
- `tests/clients/contabilidad-client.test.ts`: 30 tests (client methods, filtros, edge cases, truncado por env var).
- Cobertura de `src/tools/contabilidad.ts`: 100% statements/lines/functions.
- Cobertura de `src/clients/freematica-client.ts`: 99.44%.
- Total tests: 298 (todos en verde).

### Fixed — Post code-review (TD-119)

#### Fixed — Critical (bug funcional)

- **`FCC_FCHFAC_HASTA` no existe en Freemática** (`src/clients/freematica-client.ts`): el campo `FCC_FCHFAC_HASTA` era sintético e inventado; el filtro `fechaHasta` quedaba silenciosamente ignorado. Fix: la composición AND usa ahora el mismo campo real `FCC_FCHFAC` con operador `=le=` para el límite superior y `=ge=` para el inferior. Rquery resultante: `FCC_FCHFAC=ge=YYYY-MM-DD;FCC_FCHFAC=le=YYYY-MM-DD`.

#### Fixed — Menor

- **Type cast incorrecto en `listLocalizacionesServicioClientes`** (`src/clients/freematica-client.ts:335`): `fiqlFilters as Record<string, string | undefined>` reemplazado por `fiqlFilters as Parameters<typeof buildFiql>[0]`, coherente con el patrón de `listProveedores`.

- **Version mismatch en `server.ts`**: `version` bumped de `'0.5.0'` a `'0.5.0-rc.2'` para alinear con `package.json` y `CHANGELOG`.

#### Documented

- **Operador `=lk=`** (`src/clients/fiql-builder.ts`): JSDoc actualizado para indicar explícitamente que `=lk=` es una **extensión no estándar de Freemática** (no parte de FIQL spec); sin evidencia documental en la colección Postman. Se mantiene el operador con documentación clara.

#### Tests añadidos

- `tests/fiql-builder.test.ts`: 5 tests nuevos para el operador `=lk=` (happy path, escape de reservados, injection prevention).
- `tests/fiql-builder.property.test.ts`: regex `FIQL_OP_RE` actualizado para incluir `=lk=`.
- `tests/tools/facturas-compras.test.ts`: 3 tests nuevos: `fechaDesde` solo, `fechaHasta` solo, y `fechaDesde+fechaHasta` simultáneos (regresión del bug fix). **Total: 15 tests** (+2 netos respecto a rc.1).
- `tests/clients/freematica-client.test.ts`: 3 tests nuevos equivalentes a nivel cliente. **Total: 45 tests** (+3 netos).
- **Total global: 315 tests, todos en verde**.

---

### Added — Dominio financiero compras + proveedores + localizaciones (TD-119)

#### Tools nuevas (7)

- **`freematica_list_facturas_compras`** (`src/tools/facturas-compras.ts`): lista paginada de facturas de compras con filtros FIQL (empresa, proveedor, serie, numFactura, formaPago, traspasadoContabilidad, delegacion, lineaNegocio, rango fechas) + query param nativo `exportado` (`all` | `not_exported`). Endpoint: `GET /pcmp/v2/facturas-compras`.

- **`freematica_get_factura_compra`** (`src/tools/facturas-compras.ts`): detalle de una factura de compra por `idReg` opaco. Endpoint: `GET /pcmp/v2/facturas-compras/{idReg}`.

- **`freematica_list_proveedores`** (`src/tools/proveedores.ts`): lista paginada de proveedores con filtros FIQL (codProveedor, grupoProveedor, nif, tipoIdent, codProvincia, codPais). Búsqueda parcial por `nombre` mediante operador `=lk=`. Filtro `activo` mapea `FECHA_BAJA==null` (activos) / `FECHA_BAJA!=null` (bajas). Endpoint: `GET /pgrl/v2/proveedores`.

- **`freematica_get_proveedor`** (`src/tools/proveedores.ts`): detalle de un proveedor por `idReg` opaco. Endpoint: `GET /pgrl/v2/proveedores/{idReg}`.

- **`freematica_list_localizaciones_cobro_clientes`** (`src/tools/localizaciones.ts`): localizaciones de cobro de clientes (domiciliación bancaria). Filtros: codCliente, grupoCliente, formaPago (COD_FORMA_COBRO). Endpoint: `GET /pgrl/v2/localizaciones-cobro-clientes`.

- **`freematica_list_localizaciones_pago_proveedores`** (`src/tools/localizaciones.ts`): localizaciones de pago de proveedores. Filtros: codProveedor, grupoProveedor, formaPago (COD_FORMA_PAGO). Endpoint: `GET /pgrl/v2/localizaciones-pago-proveedores`.

- **`freematica_list_localizaciones_servicio_clientes`** (`src/tools/localizaciones.ts`): localizaciones de servicio de clientes. Filtros: codCliente, grupoCliente, codPais, codProvincia, representante, activo (FECHA_BAJA nulo/no nulo). Endpoint: `GET /pgrl/v2/localizaciones-servicio-clientes`.

#### Cambios en cliente y builder

- **`FreematicaClient`** (`src/clients/freematica-client.ts`): 7 métodos nuevos (`listFacturasCompras`, `getFacturaCompra`, `listProveedores`, `getProveedor`, `listLocalizacionesCobroClientes`, `listLocalizacionesPagoProveedores`, `listLocalizacionesServicioClientes`). Nuevo helper privado `listResourceWithFiql` que centraliza la lógica de paginación + FIQL rquery.

- **`FiqlOp`** (`src/clients/fiql-builder.ts`): añadido operador `lk` → `=lk=` para búsqueda parcial (LIKE). Compatible con la extensión Freemática para campos de texto libre.

- **`server.ts`**: versión bumped a `0.5.0`. Registradas las 3 nuevas familias de tools (facturas-compras, proveedores, localizaciones). Total tools: 15.

#### Tests (TD-119)

- `tests/tools/facturas-compras.test.ts`: 13 tests (registro, happy path, filtros FIQL, exportado nativo, errores 404/500/401).
- `tests/tools/proveedores.test.ts`: 13 tests (registro, happy path, filtros FIQL, =lk= nombre, activo/baja FIQL, errores).
- `tests/tools/localizaciones.test.ts`: 19 tests (3 tools: cobro clientes, pago proveedores, servicio clientes — happy path + filtros FIQL + errores).
- `tests/clients/freematica-client.test.ts`: +28 nuevos tests para los 7 métodos añadidos al cliente.
- `tests/server.test.ts`: actualizado de 8 → 15 tools registradas.
- **Total: 305 tests, todos en verde**.

### Master-data verification + new catalogs (TD-122)

#### Verified

- **`lineas-negocio`** (`/pgrl/v2/lineas-negocio`): confirmado presente en `MASTER_DATA_CATALOGS` desde v0.4.1. Test unitario y documentación README ya reflejaban el catálogo correctamente.

#### Added — 6 new master-data catalogs

Nuevos catálogos identificados en la Postman collection que cumplen el criterio de "sin parámetros requeridos adicionales":

| Catálogo             | Endpoint                          | Sección                    |
| -------------------- | --------------------------------- | -------------------------- |
| `incidencecode`      | `GET /pvss/v2/incidencecode`      | Tipos / clasificaciones    |
| `claves-facturacion` | `GET /pvss/v2/claves-facturacion` | Tipos / clasificaciones    |
| `calendarios`        | `GET /pgrl/v1/calendarios`        | Organizativos              |
| `series`             | `GET /pgrl/v2/series`             | Organizativos              |
| `lineas`             | `GET /part/v1/lineas`             | Inventario                 |
| `bancos`             | `GET /pgrl/v2/bancos`             | Financiero (nueva sección) |

Total de catálogos: 18 → **24**.

#### Changed

- `src/schemas/master-data.ts`: enum reordenado en secciones con comentarios (tipos, geográficos, organizativos, inventario, **financiero**). Añadido JSDoc con instrucciones para añadir futuros catálogos.
- `src/tools/master-data.ts`: `CATALOG_DESCRIPTIONS` ampliado con los 6 nuevos catálogos. Comentario JSDoc actualizado (18 → 24).
- `README.md`: tabla "Datos maestros disponibles" actualizada (18 → 24 filas, nueva sección "Financiero"). Header de tools actualizado (19 → 24 endpoints).

#### Tests

- `tests/schemas/master-data.test.ts`: actualizado a 24 catálogos. Añadidos tests de presencia para `lineas-negocio` y los 6 nuevos. Añadido test exhaustivo de endpoints.
- `tests/tools/master-data.test.ts`: añadidos 4 tests de integración nock (lineas-negocio, bancos, calendarios, incidencecode) + test exhaustivo que mocka y verifica cada uno de los 24 catálogos.
- **Total tests: 254 (todos en verde)**

### Added — Cartera Clientes + Facturas Ventas (TD-118)

#### Nuevas tools (7)

- **`freematica_list_cartera_clientes`** (`GET /pcar/v1/cartera-clientes`): lista paginada de documentos de cartera de clientes con filtros FIQL completos.
  - Filtros: `empresa` (CARCL_EMP), `codCliente` (CARCL_CODAUX), `grupoCliente` (CARCL_GRUPAUX), `representante` (CARCL_CODREP), `formaPago` (CARCL_CODFPAG), `modoPago` (CARCL_CODMPAG)
  - Rangos de fecha: `fechaDocDesde/Hasta` (CARCL_FECDOC), `fechaVencimientoDesde/Hasta` (CARCL_FECVCTO)
  - `estado`: enum `pendiente | cancelado | derivado` → `CARCL_SITCAR==1/2/3`
  - `soloImpagados`: boolean → `CARCL_FECIMPAG!=null`
  - `referencia`: exacto → `CARCL_REFCAR`
- **`freematica_get_cartera_cliente`** (`GET /pcar/v1/cartera-clientes/{idreg}`): detalle de un documento por `idReg` opaco.
- **`freematica_list_facturas_cabecera`** (`GET /pven/v1/facturas-cabecera`): lista paginada de cabeceras de facturas de ventas con filtros FIQL.
  - Filtros: `empresa` (FVC_EMP), `codCliente` (FVC_CODAUX), `representante` (FVC_CODREP), `serie` (FVC_SERFAC), `numFactura` (FVC_NUMFAC), `formaPago` (FVC_CODFPAG), `delegacion` (FVC_DELEG)
  - Rangos de fecha: `fechaFacturaDesde/Hasta` (FVC_FECFAC)
  - `traspasadoContabilidad`: boolean → `FVC_TRSCONT==S/N`
- **`freematica_get_factura_cabecera`** (`GET /pven/v1/facturas-cabecera/{idreg}`): detalle de una factura por `idReg` opaco.
- **`freematica_list_factura_lineas`** (`GET /pven/v1/facturas-cabecera/{idreg}/lineas`): líneas de detalle de una factura. Filtros: `codArticulo` (FVL_CODART), `codFamilia` (FVL_CODFAM), `codSubfamilia` (FVL_CODSFAM), `delegacion` (FVL_DELEG).
- **`freematica_list_factura_iva`** (`GET /pven/v1/facturas-cabecera/{idreg}/iva`): líneas de IVA de una factura. Filtro: `tipoIva` (FVI_TIPIVA).
- **`freematica_list_factura_vencimientos`** (`GET /pven/v1/facturas-cabecera/{idreg}/vencimientos`): vencimientos de cobro de una factura. Filtros: `fechaVencimientoDesde/Hasta` (FVV_FECVCTO), `modoPago` (FVV_CODMPAG).

#### Nuevos schemas Zod

- **`src/schemas/cartera.ts`**: `ListCarteraFiltersSchema` con `EstadoCarteraEnum` (pendiente/cancelado/derivado) y mapa FIQL `ESTADO_CARTERA_FIQL_MAP`.
- **`src/schemas/facturas-ventas.ts`**: `ListFacturasCabeceraFiltersSchema`, `ListFacturaLineasFiltersSchema`, `ListFacturaIvaFiltersSchema`, `ListFacturaVencimientosFiltersSchema`.

#### Tests

- `tests/tools/cartera.test.ts`: 13 tests (registro, happy path con filtros FIQL, errores 404 + 500)
- `tests/tools/facturas-ventas.test.ts`: 23 tests (registro, happy path con filtros FIQL para las 5 tools, errores 404 + 500)
- `tests/clients/freematica-client-cartera.test.ts`: 34 tests (métodos del cliente: list/get cartera, list/get facturas cabecera, lineas, iva, vencimientos)
- **Total: 302 tests, todos en verde**

#### Coverage nuevos archivos

| Archivo                            | Statements | Functions | Lines |
| ---------------------------------- | ---------- | --------- | ----- |
| `src/schemas/cartera.ts`           | 100%       | 100%      | 100%  |
| `src/schemas/facturas-ventas.ts`   | 100%       | 100%      | 100%  |
| `src/tools/cartera.ts`             | 100%       | 100%      | 100%  |
| `src/tools/facturas-ventas.ts`     | 100%       | 100%      | 100%  |
| `src/clients/freematica-client.ts` | 100%       | 100%      | 100%  |

---

## [0.5.0-rc.1] — 2026-06-09

### Fixes post code-review (TD-117)

#### Fixed — Critical

- **FIQL operator injection** (`src/clients/fiql-builder.ts`): los caracteres `=` y `!` no se escapaban en valores, permitiendo que valores como `'123==EVIL'` o `'x=gt=0'` produjeran FIQL estructuralmente ambiguo. Añadidos `=` → `%3D` y `!` → `%21` a `FIQL_RESERVED_RE` y `RESERVED_ENCODE_MAP`. El CHANGELOG de rc.0 ya prometía `==` → `%3D%3D` pero la implementación no lo hacía.

- **Type confusion en `isComposition()`** (`src/clients/fiql-builder.ts`): si se pasaba `{ and: 'string' }`, `isComposition` devolvía `true` y el loop iteraba el string char a char produciendo basura silenciosa (ej. `0==C;0==O;0==D;...`). La guardia ahora exige que `and`/`or` sean `Array` para activar composición. Valores no-array se tratan como campos planos ordinarios.

#### Fixed — Major

- **Eliminada duplicación de error mappers** (`src/clients/base-client.ts`, `src/clients/hardened-base-client.ts`): `mapEnvelopeError` y `mapAxiosError` en `BaseClient` promovidos de `private` a `protected`. Eliminados `mapEnvelopeErrorPublic()` y `mapAxiosErrorPublic()` de `HardenedBaseClient` (eran copias exactas). `requestWithSignal` usa ahora `this.mapEnvelopeError` y `this.mapAxiosError` directamente.

- **Coverage `src/schemas/filters.ts`** (`tests/schemas/filters.test.ts`): nueva suite con 45 tests (DateRangeSchema, IdentityFiltersSchema, BaseFiltersSchema). Coverage de `src/schemas/filters.ts` pasa de 0% a 100%.

- **Circuit breaker documentation**: añadido JSDoc explícito a `HardenedBaseClient` y `CircuitBreaker.recordFailure` clarificando que se cuentan **operaciones lógicas post-retry**, no intentos HTTP individuales. Con threshold=5 y maxRetries=3 pueden producirse hasta 20 peticiones HTTP antes de abrir el circuito.

- **429 rate-limit retry honoring `Retry-After`** (`src/clients/hardened-base-client.ts`): implementada **Opción A** — `rate_limit_exceeded` es ahora reintentable. Si `FreematicaError.retryAfter` está definido y >0, el delay de reintento usa `retryAfter * 1000` ms en lugar del backoff exponencial. Justificación: el 429 es transitorio por diseño del servidor; ignorarlo y fallar rápido aumentaría la tasa de error innecesariamente. El field `retryAfter` en `FreematicaError` pasa de dead code a activo.

#### Fixed — Minor

- **Timeout mapeado a `network_error`** (`src/clients/base-client.ts`, `src/clients/hardened-base-client.ts`): los códigos `ECONNABORTED` (axios timeout) y `ERR_CANCELED` (AbortController via axios) ahora se mapean a `network_error` con mensaje `"Request timed out: ..."`. Antes caían al fallback `unexpected_error`. El test de timeout actualizado para verificar `code: 'network_error'` y `message: stringContaining('timed out')`.

- **`createLogger` factory injectable** (`src/logger.ts`): refactorizado el logger para exportar `createLogger(destination?)` además del singleton `logger`. Permite inyectar un stream writable en tests. Nuevos 4 tests end-to-end en `tests/logger.test.ts` verifican que ningún valor `x-auth-*` aparece en el output del stream.

#### Tests summary (post-fix)

- `tests/fiql-builder.test.ts`: 53 tests (+9 nuevos: escape de `=`/`!`, type guard `and`/`or`)
- `tests/hardened-client.test.ts`: 16 tests (+1: retry 429 con Retry-After; updated: timeout → network_error)
- `tests/schemas/filters.test.ts`: 45 tests (nuevo archivo)
- `tests/logger.test.ts`: 16 tests (+4: createLogger stream injection)
- **Total: 228 tests, todos en verde**

---

## [0.5.0-rc.0] — 2026-06-09

### Foundation (TD-117)

#### Added

- **FIQL builder** (`src/clients/fiql-builder.ts`): función pura `buildFiql(filters)` que genera cadenas FIQL válidas para el API de Freemática.
  - Operadores soportados: `==`, `!=`, `=gt=`, `=lt=`, `=ge=`, `=le=`, `=in=(v1,v2,...)`
  - Separadores: `;` (AND), `,` (OR)
  - Composición explícita con `{ and: [...], or: [...] }`
  - Escape automático de caracteres reservados FIQL en valores: `;` → `%3B`, `,` → `%2C`, `(` → `%28`, `)` → `%29`, `"` → `%22`, `'` → `%27`, espacio → `%20`, `=` → `%3D`, `!` → `%21` (corregido en rc.1)
  - Skip de claves con valor `undefined`; retorna `""` si todos los filtros son undefined
  - Helper `appendRquery(url, fiql)` para añadir `rquery=...` a un objeto `URL`

- **Filter schemas** (`src/schemas/filters.ts`): bloques Zod reutilizables para tools de v0.5.0.
  - `DateRangeSchema`: `fechaDesde?` y `fechaHasta?` en formato ISO 8601
  - `IdentityFiltersSchema`: `codCliente?`, `grupoCliente?`, `codProveedor?`, `grupoProveedor?`
  - `BaseFiltersSchema`: composición `PaginationSchema + DateRangeSchema + IdentityFiltersSchema`

- **Hardened base client** (`src/clients/hardened-base-client.ts`): extensión de `BaseClient` con resiliencia de producción.
  - **Timeout configurable** vía `FREEMATICA_TIMEOUT_MS` (default 30s) usando `AbortController`
  - **Retry con backoff exponencial** para errores 5xx y de red: delays 500ms → 1000ms → 2000ms + jitter 0..200ms. Configurable vía `FREEMATICA_MAX_RETRIES` (default 3). Los errores 4xx nunca se reintentan.
  - **Circuit breaker in-memory**: abre tras `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD` (default 5) fallos consecutivos; permanece abierto `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` (default 30s) y luego pasa a half-open. Sin dependencias externas.
  - Logging estructurado por petición: `requestId`, `method`, `path`, `duration_ms`, `status`, `attempt`

- **Logger estructurado** (`src/logger.ts`): singleton pino con sanitización de credenciales.
  - Nivel configurable vía `LOG_LEVEL` (default `info`)
  - `sanitizeHeaders()`: elimina todos los headers `x-auth-*` antes de loguear
  - Serializer `req` que nunca emite headers de autenticación ni body completo
  - `AUTH_HEADER_NAMES` exportado para uso en tests y otros módulos

- **Variables de entorno nuevas** (documentadas en `.env.example` y `src/config.ts`):
  - `FREEMATICA_TIMEOUT_MS` (default 30000)
  - `FREEMATICA_MAX_RETRIES` (default 3)
  - `LOG_LEVEL` (default `info`, enum: `trace|debug|info|warn|error|fatal`)
  - `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD` (default 5)
  - `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` (default 30000)

- **Tests** nuevos (todos pasando):
  - `tests/fiql-builder.test.ts`: 44 tests unitarios (happy path + escape + operadores + edge cases)
  - `tests/fiql-builder.property.test.ts`: 9 propiedades con fast-check, 200 runs cada una
  - `tests/hardened-client.test.ts`: 15 tests con nock (retry 5xx, no-retry 4xx, timeout, circuit breaker)
  - `tests/logger.test.ts`: 12 tests de sanitización de headers y exports del logger

- **Dependencias nuevas**:
  - Runtime: `pino`, `uuid`
  - Dev: `pino-pretty`, `fast-check`, `@types/uuid`

## [0.4.1] — 2026-05-20

### Fixed

- **Catálogo `delegaciones`**: el endpoint `/pgrl/v1/delegaciones` y `/pgrl/v2/delegaciones` requieren un query param `empresa` no documentado en Postman. Cambiado a `/pgrl/v1/delegaciones/agrupcod` (listado global agrupado por código) — verificado empíricamente que funciona sin parámetros adicionales.

### Removed

- **Catálogo `tipos-marcajes`** eliminado del enum: el endpoint `/pkai/v1/tiposmarcajes` requiere un query param `sTipoMarcaje` no documentado en Postman. No tenemos manera de generalizarlo en el patrón `freematica_get_master_data(catalog)`. Se reintroducirá cuando descubramos los valores válidos de ese parámetro o un endpoint alternativo.

### Notes

- Tested end-to-end against the real Freemática API. 17/18 catálogos OK + 6 commercial tools OK + idReg pattern OK + page=0 boundary OK + not_found graceful.

## [0.4.0] — 2026-05-20

### Fixed

- **Envelope unwrap**: el API REST de Freemática envuelve todas las respuestas en `{ errorCode, errorMessage, data }`. El `BaseClient` desempaqueta ahora `data` automáticamente y mapea `errorCode != "200"` a `FreematicaError` (con códigos como `invalid_token`, `not_found`, `server_error`, etc.). Las tools v0.3.x estaban devolviendo el wrapper completo en `items` — bug silencioso al no haber sido consumidas en producción.

### Added

- 6 tools comerciales nuevas:
  - `freematica_list_clientes` (paginada)
  - `freematica_get_cliente`
  - `freematica_list_contactos_clientes` (paginada)
  - `freematica_list_oportunidades_negocio` (paginada)
  - `freematica_get_oportunidad_negocio`
  - `freematica_get_oportunidad_negocio_datos_ampliados`
- `PaginationSchema` reutilizable: `page` (1-indexed, default 1), `items` (1..50, default 20). Bloquea `page=0` (peligroso en el API real).
- Helper `okList()` para serializar respuestas de listado con `items, count, total, page, items_per_page`.
- `FreematicaListData<T>` y `FreematicaEnvelope<T>` types.

### Changed (breaking — no consumed yet)

- Tools existentes (`freematica_list_materiales_asignados_servicios`, `freematica_get_master_data`) devuelven ahora `{ items, count, total, ... }` (antes era el wrapper completo de Freemática mal mapeado).
- `FreematicaClient.getMaterialesAsignadosServicios()` y `getMasterData()` devuelven `Promise<{ items, total }>` en vez de `Promise<T[]>`.

### Notes

- Probado empíricamente contra el API real de Freemática. Confirmado que `grupoCli` documentado en Postman no funciona en producción — no se expone como filtro.

## [0.3.1] — 2026-05-19

### Fixed

- Catálogo `delegaciones`: el endpoint cambia de `/pgrl/v2/delegaciones` (devolvía HTTP 400 en producción) a `/pgrl/v1/delegaciones`. El Postman documenta ambas versiones; v1 funciona, v2 no.

## [0.3.0] — 2026-05-19

### Added

- Nueva tool `freematica_get_master_data` que expone 19 catálogos de datos maestros del API de Freemática (tipos, geográficos, organizativos, inventario) a través de un único enum `catalog`.
- `src/schemas/master-data.ts` con `MASTER_DATA_CATALOGS` (enum de 19 valores) y `CATALOG_ENDPOINTS` (mapeo a endpoints REST). Una sola fuente de verdad para añadir catálogos futuros.
- `FreematicaClient.getMasterData(catalog)` que resuelve el endpoint via el record.
- Sección "Datos maestros disponibles" en README con la tabla catálogo → endpoint.

### Changed

- `createFreematicaServer` ahora registra dos tools (la existente + la nueva).
- `server-instructions.ts` ampliado con la nueva tool y un patrón de uso (resolver IDs crípticos a nombres humanos).
- Version reportada en `/health` y en el `serverInfo` MCP actualizada a `0.3.0`.

## [0.2.0] — 2026-05-19

### Added

- Soporte para transporte **stdio** (default). Selección vía CLI `--transport=` o env `MCP_TRANSPORT`.
- `src/transports/stdio.ts` con `startStdio({ client })`.
- Smoke test E2E del modo stdio (spawn de `dist/index.js`, JSON-RPC initialize por stdin).
- Seccion "Modos de transporte" en el README con ejemplos para Claude Desktop, Claude Code y Nubiia.

### Changed

- `src/config.ts` refactorizado: `loadAuthConfig()` + `loadHttpConfig()` independientes. `loadConfig()` se mantiene como wrapper retro-compat.
- `src/index.ts` reescrito para branching stdio/http con dynamic imports (evita cargar Express en modo stdio).
- CI: `npm run build` se ejecuta antes que `npm test` (el smoke test stdio necesita `dist/`).
- Version reportada en `/health` y en el `serverInfo` del MCP actualizada a `0.2.0`.

### Breaking

- **Default del binario cambió de HTTP a stdio.** Si tu entorno (Nubiia u otro) ejecutaba el binario sin configurar transporte, hay que añadir `MCP_TRANSPORT=http` para mantener el comportamiento anterior.

## [0.1.0] — 2026-05-18

### Added

- Bootstrap inicial del MCP server.
- Tool: `freematica_list_materiales_asignados_servicios` → `GET /pvss/v2/contratos-servicios-material`.
- Transporte HTTP (Streamable) con Express + StreamableHTTPServerTransport.
- `FreematicaClient` (axios + 5 headers `x-auth-*`) + mapeo de errores HTTP a códigos normalizados.
- Configuración vía Zod (5 env vars `FREEMATICA_AUTH_*` obligatorias + 3 opcionales).
- 30 tests (vitest + nock), CI en GitHub Actions, Dockerfile multistage.
- Publicación en GitHub Packages como `@serlimar/mcp-freematica`.
