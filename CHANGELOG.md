# Changelog

Todas las versiones notables del paquete `@serlimar/mcp-freematica` se documentan aquí. Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.5.0-rc.2] — 2026-06-09

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
