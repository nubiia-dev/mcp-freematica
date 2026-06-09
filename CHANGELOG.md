# Changelog

Todas las versiones notables del paquete `@serlimar/mcp-freematica` se documentan aquí. Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.5.0-rc.2] — 2026-06-09

### Master-data verification + new catalogs (TD-122)

#### Verified

- **`lineas-negocio`** (`/pgrl/v2/lineas-negocio`): confirmado presente en `MASTER_DATA_CATALOGS` desde v0.4.1. Test unitario y documentación README ya reflejaban el catálogo correctamente.

#### Added — 6 new master-data catalogs

Nuevos catálogos identificados en la Postman collection que cumplen el criterio de "sin parámetros requeridos adicionales":

| Catálogo | Endpoint | Sección |
|---|---|---|
| `incidencecode` | `GET /pvss/v2/incidencecode` | Tipos / clasificaciones |
| `claves-facturacion` | `GET /pvss/v2/claves-facturacion` | Tipos / clasificaciones |
| `calendarios` | `GET /pgrl/v1/calendarios` | Organizativos |
| `series` | `GET /pgrl/v2/series` | Organizativos |
| `lineas` | `GET /part/v1/lineas` | Inventario |
| `bancos` | `GET /pgrl/v2/bancos` | Financiero (nueva sección) |

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

| Archivo | Statements | Functions | Lines |
|---------|-----------|-----------|-------|
| `src/schemas/cartera.ts` | 100% | 100% | 100% |
| `src/schemas/facturas-ventas.ts` | 100% | 100% | 100% |
| `src/tools/cartera.ts` | 100% | 100% | 100% |
| `src/tools/facturas-ventas.ts` | 100% | 100% | 100% |
| `src/clients/freematica-client.ts` | 100% | 100% | 100% |

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
