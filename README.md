# mcp-freematica

[![npm version](https://img.shields.io/npm/v/@nubiia/mcp-freematica)](https://www.npmjs.com/package/@nubiia/mcp-freematica)
[![license: MIT](https://img.shields.io/npm/l/@nubiia/mcp-freematica)](./LICENSE)
[![by Nubiia](https://img.shields.io/badge/by-Nubiia-6C4EE3)](https://nubiia.es)

MCP server que expone operaciones del API REST de Freemática (ERP: facturación, cartera, proveedores, contabilidad, personal) para ser consumidas por asistentes de IA como Claude.

> Built and maintained by **[Nubiia](https://nubiia.es)** — automatización e integraciones con IA para negocios (MCP, Holded, Pipedrive y más). ¿Quieres algo así para tu empresa? Escríbenos en **[nubiia.es](https://nubiia.es)**.

## Stack

- TypeScript + Node.js ≥20
- `@modelcontextprotocol/sdk` (stdio + Streamable HTTP transports)
- Express + axios + zod
- pino (logging estructurado)
- Vitest + nock para tests

## Tools expuestas

| Tool                                                 | Endpoint Freemática                                          | Descripción                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `freematica_list_materiales_asignados_servicios`     | `GET /pvss/v2/contratos-servicios-material`                  | Lista de material asignado a servicios                                                             |
| `freematica_get_master_data`                         | (24 endpoints según `catalog`)                               | Devuelve un catálogo de datos maestros (tipos, geográficos, organizativos, inventario, financiero) |
| `freematica_list_clientes`                           | `GET /pgrl/v2/clientes`                                      | Lista paginada de clientes                                                                         |
| `freematica_get_cliente`                             | `GET /pgrl/v2/clientes/{idReg}`                              | Detalle de un cliente                                                                              |
| `freematica_list_contactos_clientes`                 | `GET /pgrl/v2/contactos-clientes`                            | Lista paginada de contactos                                                                        |
| `freematica_list_oportunidades_negocio`              | `GET /pcrm/v2/oportunidades-negocio`                         | Lista paginada de oportunidades                                                                    |
| `freematica_get_oportunidad_negocio`                 | `GET /pcrm/v2/oportunidades-negocio/{idReg}`                 | Detalle de oportunidad                                                                             |
| `freematica_get_oportunidad_negocio_datos_ampliados` | `GET /pcrm/v2/oportunidades-negocio/{idReg}/datos-ampliados` | Datos ampliados (puede 404)                                                                        |
| `freematica_get_ficha_prev_cliente`                  | `GET /pprl/v2/ficha-prev-cliente`                            | Ficha PRL de un cliente                                                                            |
| `freematica_list_vigilancia_salud`                   | `GET /pprl/v1/vigilancia-salud`                              | Lista paginada de registros de Vigilancia de la Salud                                              |
| `freematica_get_vigilancia_salud`                    | `GET /pprl/v1/vigilancia-salud/{idreg}`                      | Detalle de un registro de Vigilancia de la Salud                                                   |
| `freematica_list_personal`                           | `GET /pers/v2/personal`                                      | Lista paginada de personas (RRHH)                                                                  |
| `freematica_get_persona`                             | `GET /pers/v2/personal/{idreg}`                              | Detalle de una persona                                                                             |
| `freematica_list_calendarios`                        | `GET /pgrl/v1/calendarios`                                   | Lista paginada de calendarios laborales                                                            |
| `freematica_list_calendario_periodos`                | `GET /pgrl/v1/calendarios/{idreg}/periodos`                  | Periodos de un calendario laboral                                                                  |
| `freematica_list_cartera_clientes`                   | `GET /pcar/v1/cartera-clientes`                              | Lista paginada de cartera de clientes (cobros, impagados)                                          |
| `freematica_get_cartera_cliente`                     | `GET /pcar/v1/cartera-clientes/{idReg}`                      | Detalle de un documento de cartera                                                                 |
| `freematica_list_facturas_cabecera`                  | `GET /pven/v1/facturas-cabecera`                             | Lista paginada de facturas de ventas (cabecera)                                                    |
| `freematica_get_factura_cabecera`                    | `GET /pven/v1/facturas-cabecera/{idReg}`                     | Detalle de una factura de venta                                                                    |
| `freematica_list_factura_lineas`                     | `GET /pven/v1/facturas-cabecera/{idReg}/lineas`              | Líneas de detalle de una factura de venta                                                          |
| `freematica_list_factura_iva`                        | `GET /pven/v1/facturas-cabecera/{idReg}/iva`                 | Líneas de IVA de una factura de venta                                                              |
| `freematica_list_factura_vencimientos`               | `GET /pven/v1/facturas-cabecera/{idReg}/vencimientos`        | Vencimientos de cobro de una factura de venta                                                      |
| `freematica_list_facturas_compras`                   | `GET /pcom/v1/facturas-cabecera`                             | Lista paginada de facturas de compras                                                              |
| `freematica_get_factura_compra`                      | `GET /pcom/v1/facturas-cabecera/{idReg}`                     | Detalle de una factura de compra                                                                   |
| `freematica_list_proveedores`                        | `GET /pgrl/v2/proveedores`                                   | Lista paginada de proveedores                                                                      |
| `freematica_get_proveedor`                           | `GET /pgrl/v2/proveedores/{idReg}`                           | Detalle de un proveedor                                                                            |
| `freematica_list_localizaciones_cobro_clientes`      | `GET /pgrl/v2/localizaciones-cobro-clientes`                 | Localizaciones de cobro de clientes (SEPA, domiciliaciones)                                        |
| `freematica_list_localizaciones_pago_proveedores`    | `GET /pgrl/v2/localizaciones-pago-proveedores`               | Localizaciones de pago de proveedores                                                              |
| `freematica_list_localizaciones_servicio_clientes`   | `GET /pgrl/v2/localizaciones-servicio-clientes`              | Localizaciones de servicio de clientes                                                             |
| `freematica_list_cuentas_contables`                  | `GET /pcon/v2/cuentas`                                       | Plan de cuentas contables (COD_CTA, COD_PLAN, etc.)                                                |
| `freematica_list_cuentas_analiticas`                 | `GET /pcon/v2/cuentas-analiticas`                            | Catálogo de cuentas analíticas                                                                     |
| `freematica_export_asientos`                         | `GET /pcon/v2/asientos`                                      | Exporta asientos contables de un período (CSV/JSON)                                                |
| `freematica_list_pedidos_compra`                     | `GET /pcmp/v2/pedidos`                                       | Lista paginada de pedidos de compra (filtros nativos + FIQL + estado enum)                         |
| `freematica_get_pedido_compra`                       | `GET /pcmp/v2/pedidos/{idReg}`                               | Detalle de un pedido de compra (cabecera + proveedor + líneas)                                     |
| `freematica_list_albaranes_ventas`                   | `GET /pven/v2/albaranes-ventas`                              | Lista paginada de albaranes de ventas (filtros todos nativos, empresa requerido)                   |
| `freematica_get_albaran_venta`                       | `GET /pven/v2/albaranes-ventas/{idReg}`                      | Detalle de un albarán de venta                                                                     |
| `freematica_list_albaranes_factura`                  | `GET /pven/v2/albaranes-facturas`                            | Lista paginada de vinculaciones albarán↔factura (idReg nativo + FIQL)                              |
| `freematica_get_albaran_factura`                     | `GET /pven/v2/albaranes-facturas/{idReg}`                    | Detalle de una vinculación albarán-factura                                                         |
| `freematica_list_resultados_facturacion`             | `GET /pvss/v1/facturacion-resultados`                        | Resultados del proceso batch de facturación automática de vigilancia (FIQL)                        |

## Filtros tipados (FIQL interno)

El MCP expone **parámetros tipados con zod** al consumidor (Claude/LLM). Internamente, el cliente los traduce a sintaxis FIQL antes de llamar al API de Freemática. El consumidor nunca ve ni escribe FIQL.

### Ejemplo

```typescript
// El LLM llama:
freematica_list_cartera_clientes({
  empresa: '0001',
  fechaDocDesde: '2026-01-01',
  estado: 'pendiente',
});

// El MCP construye internamente:
// rquery=CARCL_EMP==0001;CARCL_FECDOC=ge=2026-01-01;CARCL_SITCAR==1
```

### Ventajas del patrón

- El LLM solo necesita conocer los parámetros tipados con nombres semánticos en español.
- La complejidad de la sintaxis FIQL queda encapsulada en el adapter interno (`src/clients/fiql-builder.ts`).
- Los errores de validación son claros: "empresa debe ser string", no "FIQL parse error".
- Los filtros booleanos (`soloImpagados: true`) se traducen automáticamente al operador FIQL correcto.

### Más ejemplos

```typescript
// Facturas pendientes de traspaso a contabilidad:
freematica_list_facturas_cabecera({
  empresa: '0001',
  traspasadoContabilidad: false,
});
// → rquery=FAC_CODEMP==0001;FAC_TRASP_CONTAB==0

// Proveedores activos que contienen "GARCIA" en el nombre:
freematica_list_proveedores({
  nombre: 'GARCIA',
  activo: true,
});
// → rquery=NOMBRE_PRO=lk=GARCIA;FECHA_BAJA==null
```

## Modos de transporte

El binario soporta dos transportes seleccionables. La selección sigue este orden de precedencia:

1. CLI flag: `--transport=<modo>`
2. Variable de entorno: `MCP_TRANSPORT=<modo>`
3. Default: `stdio`

| Modo    | Cuándo usar                                  | Comando                                                                 |
| ------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `stdio` | Claude Desktop, Claude Code, ejecución local | `mcp-freematica` (default) o `mcp-freematica --transport=stdio`         |
| `http`  | Nubiia, deploy como servicio web             | `mcp-freematica --transport=http` o `MCP_TRANSPORT=http mcp-freematica` |

### Configurar en Claude Desktop (stdio)

Edita `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "freematica": {
      "command": "npx",
      "args": ["-y", "@nubiia/mcp-freematica"],
      "env": {
        "FREEMATICA_AUTH_TOKEN": "...",
        "FREEMATICA_AUTH_COMPANY": "...",
        "FREEMATICA_AUTH_ORGANIZATION": "...",
        "FREEMATICA_AUTH_APP": "...",
        "FREEMATICA_AUTH_SESSION": "..."
      }
    }
  }
}
```

Reinicia Claude Desktop y las tools de `freematica_*` aparecerán disponibles.

### Configurar en Claude Code (stdio)

```bash
claude mcp add freematica npx -y @nubiia/mcp-freematica \
  -e FREEMATICA_AUTH_TOKEN=... \
  -e FREEMATICA_AUTH_COMPANY=... \
  -e FREEMATICA_AUTH_ORGANIZATION=... \
  -e FREEMATICA_AUTH_APP=... \
  -e FREEMATICA_AUTH_SESSION=...
```

### Configurar en Nubiia (HTTP)

Setear `MCP_TRANSPORT=http` en las variables de entorno del proceso, junto a las 5 `FREEMATICA_AUTH_*`. Resto de variables (puerto, origins) opcionales — ver tabla en "Configuración avanzada".

## Datos maestros disponibles

La tool `freematica_get_master_data` acepta un parámetro `catalog` con uno de los 24 valores siguientes. Cada uno mapea a un endpoint específico de Freemática.

| `catalog`                   | Endpoint Freemática                      | Contenido                          |
| --------------------------- | ---------------------------------------- | ---------------------------------- |
| **Tipos / clasificaciones** |                                          |                                    |
| `tipos-contrato`            | `GET /ppre/v2/tipos-contrato`            | Tipos de contrato comercial        |
| `tipo-instalacion`          | `GET /ppre/v1/tipo-instalacion`          | Tipos de instalación física        |
| `clases-servicios`          | `GET /pvss/v1/clases-servicios`          | Clases de servicio operativas      |
| `tipos-casos`               | `GET /pcrm/v2/tipos-casos`               | Tipos de caso CRM                  |
| `subtipos-casos`            | `GET /pcrm/v2/subtipos-casos`            | Subtipos de caso CRM               |
| `tipos-oportunidad-negocio` | `GET /pcrm/v2/tipos-oportunidad-negocio` | Tipos de oportunidad comercial     |
| `tipos-impuestos`           | `GET /pgrl/v2/tipos-impuestos`           | IVA, IRPF, retenciones             |
| `naturalezas-abono`         | `GET /pven/v1/naturalezas-abono`         | Naturalezas de abono comercial     |
| `incidencecode`             | `GET /pvss/v2/incidencecode`             | Códigos de incidencia en servicios |
| `claves-facturacion`        | `GET /pvss/v2/claves-facturacion`        | Claves de facturación de servicios |
| **Geográficos**             |                                          |                                    |
| `paises`                    | `GET /pgrl/v1/paises`                    | Países                             |
| `nacionalidades`            | `GET /pgrl/v1/nacionalidades`            | Nacionalidades                     |
| `provincias`                | `GET /pgrl/v1/provincias`                | Provincias                         |
| `poblaciones`               | `GET /pgrl/v2/poblaciones`               | Municipios                         |
| **Organizativos**           |                                          |                                    |
| `empresas`                  | `GET /pgrl/v1/empresas`                  | Empresas                           |
| `delegaciones`              | `GET /pgrl/v1/delegaciones/agrupcod`     | Delegaciones (listado global)      |
| `lineas-negocio`            | `GET /pgrl/v2/lineas-negocio`            | Líneas de negocio                  |
| `cargos-clientes`           | `GET /pgrl/v2/cargos-clientes`           | Cargos de contactos                |
| `calendarios`               | `GET /pgrl/v1/calendarios`               | Calendarios laborales              |
| `series`                    | `GET /pgrl/v2/series`                    | Series de numeración de documentos |
| **Inventario**              |                                          |                                    |
| `familias`                  | `GET /part/v1/familias`                  | Familias de artículos              |
| `subfamilias`               | `GET /part/v1/subfamilias`               | Subfamilias                        |
| `lineas`                    | `GET /part/v1/lineas`                    | Líneas de artículos                |
| **Financiero**              |                                          |                                    |
| `bancos`                    | `GET /pgrl/v2/bancos`                    | Entidades bancarias                |

Respuesta: `{ catalog, items, count, total }`. Patrón típico de uso: llamar primero al catálogo correspondiente cuando otra tool devuelva IDs crípticos para resolverlos a nombres humanos.

## Paginación

Todas las tools `freematica_list_*` aceptan dos parámetros opcionales:

- **`page`** (int, ≥1, default 1): página a recuperar, **1-indexed**.
- **`items`** (int, 1..50, default 20): items por página.

La respuesta incluye siempre `total` (total de elementos en el dataset) para que el LLM pueda iterar páginas.

> El parámetro está bloqueado en `page >= 1` porque el API real de Freemática trata `page=0` como "devuelve TODO el dataset" (varios MB en endpoints grandes como `clientes`). Verificado empíricamente.

## IDs opacos en endpoints de detalle

Las tools `freematica_get_*` requieren un `id` que **NO** es el código natural (`COD_CLI`, `ID_OPORTUNIDAD`) sino el campo **`idReg`** que aparece en los items del listado correspondiente. Es un string opaco base64 como `MV9fMTAwMA==`.

Si pasas un código natural, el API responde `not_found`.

Patrón típico de uso desde el LLM:

1. `freematica_list_clientes(page=1, items=20)` → encontrar el cliente que interesa.
2. Tomar el campo `idReg` de ese item.
3. `freematica_get_cliente(id="<idReg>")` → detalle completo.

## Configuración

El servidor lee toda su configuración de **variables de entorno** al arrancar. Si falta alguna obligatoria, el proceso muere con un mensaje claro listando qué falta — no acepta requests hasta que la configuración sea válida.

### Variables de entorno obligatorias

| Variable                       | Descripción                                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| `FREEMATICA_AUTH_TOKEN`        | Header `x-auth-token` para autenticar con la API de Freemática.           |
| `FREEMATICA_AUTH_COMPANY`      | Header `x-auth-company`. Identifica la empresa dentro del API.            |
| `FREEMATICA_AUTH_ORGANIZATION` | Header `x-auth-organization`. Identifica la organización.                 |
| `FREEMATICA_AUTH_APP`          | Header `x-auth-app`. Identifica la aplicación que consume (p.ej. `pvss`). |
| `FREEMATICA_AUTH_SESSION`      | Header `x-auth-session`. Identifica la sesión activa.                     |

### Configuración avanzada

Variables de entorno opcionales para tuning de comportamiento en producción:

| Variable                                | Default                                              | Descripción                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `FREEMATICA_BASE_URL`                   | `https://api-p01.clientservicepanel.com/restsat/api` | Base URL del API de Freemática. Cambiar solo si Freemática cambia el host o se usa un entorno alternativo.                                      |
| `FREEMATICA_TIMEOUT_MS`                 | `30000`                                              | Timeout por petición en milisegundos. Si el upstream no responde en este tiempo, el request se cancela con `network_error`.                     |
| `FREEMATICA_MAX_RETRIES`                | `3`                                                  | Número máximo de reintentos para errores 5xx y errores de red. Los errores 4xx nunca se reintentan.                                             |
| `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD`  | `5`                                                  | Número de operaciones lógicas fallidas consecutivas (post-retry-exhaustion) necesarias para abrir el circuit breaker.                           |
| `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` | `30000`                                              | Tiempo en ms que el circuit breaker permanece abierto antes de pasar a half-open.                                                               |
| `FREEMATICA_MAX_RESPONSE_SIZE_MB`       | `10`                                                 | Tamaño máximo de respuesta aceptada del upstream en MB. Respuestas mayores se truncan con aviso en el campo `truncated`.                        |
| `MCP_TRANSPORT`                         | `stdio`                                              | Transporte: `stdio` (para Claude Desktop/Code) o `http` (para Nubiia). Equivale al flag `--transport=`.                                         |
| `MCP_PORT`                              | `3000`                                               | Puerto TCP donde el servidor MCP expone `/mcp` y `/health`. Ignorado en modo stdio.                                                             |
| `MCP_ALLOWED_ORIGINS`                   | `*`                                                  | CORS: lista de orígenes permitidos separados por coma, o `*` para todos. En producción restringir al dominio de Nubiia. Ignorado en modo stdio. |
| `LOG_LEVEL`                             | `info`                                               | Nivel de log para pino: `fatal`, `error`, `warn`, `info`, `debug`, `trace`. En producción usar `info`. En desarrollo usar `debug`.              |

### De dónde salen las credenciales `x-auth-*`

Las 5 credenciales `x-auth-*` son **preexistentes** — el Postman collection de Freemática no expone un endpoint de login, así que estas credenciales se obtienen fuera de banda (típicamente por el departamento de IT de Freemática o tu integrador).

- Pide los 5 valores al responsable técnico de Freemática (o recupéralos de tu gestor de secretos si ya están provisionados).
- **NO comitees credenciales reales**. El repositorio tiene `.env.*` en `.gitignore` (excepto `.env.example`).
- Si las credenciales caducan, el MCP devolverá `invalid_token` en todas las llamadas. Renovarlas implica reiniciar el proceso (no hay refresh automático).

### Configuración en Nubiia (producción)

Nubiia despliega el servidor MCP y se encarga de inyectar las variables de entorno. En el panel de Nubiia:

1. Crea un MCP server apuntando a la URL del contenedor desplegado (por ejemplo `https://freematica-mcp.example.com/mcp`).
2. Añade las variables de entorno listadas arriba en la sección de secretos.
3. Recomendado: setear `MCP_ALLOWED_ORIGINS` al dominio exacto desde el que Claude/Nubiia conecta, no `*`.
4. Verifica con el endpoint `GET /health` que el servidor está vivo antes de habilitar el MCP en Claude.

### Configuración local (desarrollo)

Para desarrollo local crea un `.env` (o `.env.local`) en la raíz:

```bash
cp .env.example .env
# Edita .env y rellena los 5 FREEMATICA_AUTH_*
```

Luego arranca con:

```bash
set -a; source .env; set +a
npm run dev
```

O todo en una línea:

```bash
node --env-file=.env --import tsx src/index.ts
```

### Verificación de la configuración

1. **Sin env vars** — el proceso debe morir inmediatamente con un mensaje listando las 5 variables que faltan:

   ```bash
   node dist/index.js
   # [freematica-mcp] FATAL: Invalid configuration:
   #   - FREEMATICA_AUTH_TOKEN: Required
   #   - FREEMATICA_AUTH_COMPANY: Required
   #   ...
   ```

2. **Con env vars válidas (modo HTTP)** — arranca con `MCP_TRANSPORT=http` y el proceso queda escuchando; `/health` devuelve `{ "status": "ok", "version": "0.5.0", "sessions": 0 }`:
   ```bash
   MCP_TRANSPORT=http node dist/index.js &
   curl http://localhost:3000/health
   ```
   En modo stdio (default) no hay endpoints HTTP — el server escucha JSON-RPC por stdin/stdout.

## Troubleshooting

### `invalid_token` en todas las llamadas

Las credenciales `x-auth-*` han caducado o son incorrectas. Pasos:

1. Verificar que las 5 variables `FREEMATICA_AUTH_*` están seteadas correctamente.
2. Contactar al responsable técnico de Freemática para renovar el token/sesión.
3. Reiniciar el proceso del MCP tras actualizar las variables (el cliente no refresca credenciales en caliente).

### `network_error` — upstream Freemática caído

El API de Freemática no está respondiendo. Puede ser:

- Mantenimiento programado del upstream.
- Circuit breaker activo tras varios fallos consecutivos (ver logs: `Circuit breaker opened`).
- Problema de red entre el servidor y `api-p01.clientservicepanel.com`.

Pasos:

1. Verificar en los logs si hay `circuitBreaker: "open"` — si es así, esperar `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` ms (default 30s) para que pase a half-open.
2. Verificar conectividad al upstream: `curl https://api-p01.clientservicepanel.com/`.
3. Aumentar `FREEMATICA_TIMEOUT_MS` si el upstream es lento (default 30s puede ser insuficiente en algunas redes).

### `rate_limit_exceeded` — throttling de Freemática

Freemática devuelve 429. El MCP reintenta automáticamente honrando el header `Retry-After` si está presente. Si el problema persiste:

1. Reducir la frecuencia de llamadas desde Claude.
2. Aumentar `FREEMATICA_MAX_RETRIES` (default 3) si los reintentos no son suficientes.
3. Contactar a Freemática para revisar los límites de rate asignados a la cuenta.

### `Response truncated` en `freematica_export_asientos`

El endpoint de exportación de asientos devuelve demasiados registros para un rango de fechas amplio. Pasos:

1. Usar un rango de fechas más corto: en lugar de un trimestre, exportar mes a mes.
2. Añadir filtros adicionales: filtrar por empresa, delegación o cuenta específica.
3. Si el volumen esperado es grande por diseño, aumentar `FREEMATICA_MAX_RESPONSE_SIZE_MB` (default 10 MB).

### El pre-commit hook falla al hacer `git commit`

Lint o formato detectaron errores en los ficheros staged. Pasos:

1. Revisar el output del hook: indicará qué fichero y qué regla falló.
2. Ejecutar `npm run lint:fix` y `npm run format` para corregir automáticamente.
3. Hacer `git add` de los ficheros corregidos antes de volver a intentar el commit.

## Desarrollo

```bash
npm install
npm run dev           # arranca con tsx (hot reload)
npm test              # ejecuta vitest una vez
npm run test:watch    # watcher
npm run test:coverage # coverage report
npm run lint
npm run lint:fix
npm run format
npm run typecheck
npm run build         # compila a dist/
npm start             # ejecuta dist/index.js
```

## Testing

### Tests unitarios e integración

```bash
# Ejecutar todos los tests
npm test

# Ejecutar con coverage report
npm test -- --coverage

# Ejecutar un archivo concreto
npm test -- tests/fiql-builder.property.test.ts
```

Los tests están en `tests/` organizados por tipo:

- `tests/clients/` — tests de los clientes HTTP (con nock)
- `tests/schemas/` — tests de los schemas Zod
- `tests/tools/` — tests de los handlers MCP (unit + integration)
- `tests/fiql-builder.*.test.ts` — tests unitarios y property-based del FIQL builder
- `tests/pagination-edge-cases.test.ts` — edge cases del adapter de paginación
- `tests/coverage-gaps.test.ts` — cobertura específica de ramas no cubiertas

**Coverage thresholds** (configurados en `vitest.config.ts`):

- Global statements: ≥85%
- src/clients/: ≥90%
- src/schemas/: ≥90%
- src/tools/: ≥85%

### Testing manual con MCP Inspector

Para probar el servidor MCP de forma interactiva, usa [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

Ver instrucciones detalladas en [docs/testing-e2e.md](docs/testing-e2e.md).

## Endpoints HTTP

| Método | Path      | Descripción                                          |
| ------ | --------- | ---------------------------------------------------- |
| POST   | `/mcp`    | JSON-RPC del MCP (envía `initialize` la primera vez) |
| GET    | `/mcp`    | Stream SSE (requiere `Mcp-Session-Id`)               |
| DELETE | `/mcp`    | Terminar sesión                                      |
| GET    | `/health` | Healthcheck                                          |

## Seguridad

> [!IMPORTANT]
> **El endpoint `/mcp` no autentica al cliente.** Cualquiera con acceso de red al
> puerto puede invocar las tools usando las credenciales de Freemática que el
> servidor tiene configuradas en sus variables de entorno. Como todas las tools
> son de **solo lectura**, esto equivale a acceso de lectura a los datos de la
> empresa (cartera, facturación, clientes, personal…).

Por tanto, al desplegar en modo HTTP:

- **Nunca expongas el puerto directamente a internet.** Despliega siempre detrás
  de un gateway / reverse-proxy que haga la autenticación y autorización del
  cliente (es el modelo con el que opera Nubiia).
- **Restringe `MCP_ALLOWED_ORIGINS`** al dominio exacto desde el que se conecta,
  en lugar del valor por defecto `*`. Si arrancas con `*`, el servidor emite un
  warning en el log. Ten en cuenta que CORS solo protege frente a navegadores;
  no frente a clientes como `curl`.
- **Trata las 5 credenciales `FREEMATICA_AUTH_*` como secretos.** Inyéctalas vía
  gestor de secretos, nunca en el repositorio (`.env*` está en `.gitignore`).

Buenas prácticas ya incluidas en el servidor:

- Los headers `x-auth-*` se eliminan de cualquier log (incluido `debug`/`trace`)
  y los bodies de petición nunca se loguean.
- Rate limiting (120 req/min por IP) en `/mcp` y `/health`, límite de body de
  1 MB, y expiración automática de sesiones inactivas.
- Los valores de los filtros FIQL se escapan para prevenir inyección de
  operadores de consulta.

## Cómo añadir una nueva operación

1. **Tipar la respuesta** en `src/types/<grupo>.ts`.
2. **Añadir método** al `FreematicaClient` (`src/clients/freematica-client.ts`):
   ```ts
   getContratosServicios(): Promise<VoContratosServicios[]> {
     return this.get<VoContratosServicios[]>('/pvss/v1/contratos-servicios');
   }
   ```
3. **Añadir `server.tool(...)`** en `src/tools/<grupo>.ts` (o crear el archivo si el grupo es nuevo).
4. **Si el grupo es nuevo:** registrar `register<Grupo>Tools(server, client)` en `src/server.ts`.
5. **Tests:** un test del método del client (con nock) + un test del handler de la tool.

Patrón inspirado en `mcp-nevent` y `mcp-holded`.

## Despliegue

Pensado para ejecutarse dentro de **Nubiia**. La plataforma se encarga del deploy y de inyectar las variables de entorno. Tienes 3 opciones:

### Opción 1 — Instalar como paquete npm (recomendada)

El paquete se publica como `@nubiia/mcp-freematica` en el registry público de npm cuando se crea un tag `v*` en `main`.

```bash
# Instalar y ejecutar (no requiere autenticación)
npm install -g @nubiia/mcp-freematica
mcp-freematica   # binario instalado, lee env vars y arranca el server
```

### Opción 2 — Docker

```bash
docker build -t mcp-freematica .
docker run --env-file .env -p 3000:3000 mcp-freematica
```

### Opción 3 — Clone + build

```bash
git clone https://github.com/nubiia-dev/mcp-freematica.git
cd mcp-freematica
npm ci && npm run build
node dist/index.js
```

## Publicar una nueva versión

1. Bump de versión en `package.json` (semver).
2. Commit + merge a `main`.
3. Crear y empujar un tag con prefijo `v`:
   ```bash
   git tag v0.5.0
   git push origin v0.5.0
   ```
4. El workflow `.github/workflows/publish.yml` se dispara, valida (lint + typecheck + test + build) y publica en npm.

## Especificaciones y diseño

- v0.1.0 spec: `docs/superpowers/specs/2026-05-18-freematica-mcp-design.md` (bootstrap inicial)
- v0.1.0 plan: `docs/superpowers/plans/2026-05-18-freematica-mcp.md`
- v0.2.0 spec: `docs/superpowers/specs/2026-05-19-stdio-transport-design.md` (stdio support)
- v0.2.0 plan: `docs/superpowers/plans/2026-05-19-stdio-transport.md`
- v0.3.0 spec: `docs/superpowers/specs/2026-05-19-master-data-tool-design.md` (master data tool)
- v0.3.0 plan: `docs/superpowers/plans/2026-05-19-master-data-tool.md`
- v0.4.0 spec: `docs/superpowers/specs/2026-05-20-commercial-tools-design.md` (commercial tools + envelope unwrap fix)
- v0.4.0 plan: `docs/superpowers/plans/2026-05-20-commercial-tools.md`
- v0.4.1: hotfix de catálogos `delegaciones` (endpoint cambiado a /agrupcod) y `tipos-marcajes` (eliminado — endpoint roto). Ver CHANGELOG.
- ADRs de arquitectura: `docs/adr/` (ver índice en ese directorio)
- API: `apidocs/Freematica API - Complete Collection.postman_collection.json`
- CHANGELOG: `CHANGELOG.md`

## About Nubiia

This MCP server is built and maintained by **[Nubiia](https://nubiia.es)**.

[Nubiia](https://nubiia.es) ayuda a empresas a **automatizar procesos e integrar sus herramientas con IA**: servidores MCP a medida, integraciones con ERPs y CRMs (Freemática, Holded, Pipedrive…), y agentes que conectan tus datos de negocio con asistentes como Claude. Este `@nubiia/mcp-freematica` es un ejemplo open source de lo que hacemos.

👉 ¿Quieres una integración o automatización con IA para tu negocio? **[nubiia.es](https://nubiia.es)** · ✉️ [hola@nubiia.es](mailto:hola@nubiia.es)

## Author

Built by **[Nubiia](https://nubiia.es)** — [nubiia.es](https://nubiia.es) · [hola@nubiia.es](mailto:hola@nubiia.es)

Maintainer: Samuel Fraga — [GitHub](https://github.com/iamsamuelfraga)

## Links

- [Nubiia — AI automation & integrations](https://nubiia.es)
- [npm: @nubiia/mcp-freematica](https://www.npmjs.com/package/@nubiia/mcp-freematica)
- [GitHub: nubiia-dev/mcp-freematica](https://github.com/nubiia-dev/mcp-freematica)

## Licencia

MIT — ver `LICENSE`.
