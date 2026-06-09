# slm-freematica-mcp

MCP server que expone operaciones del API REST de Freemática para ser consumidas por Claude a través de Nubiia.

## Stack

- TypeScript + Node.js ≥20
- `@modelcontextprotocol/sdk` (stdio + Streamable HTTP transports)
- Express + axios + zod
- Vitest + nock para tests

## Tools expuestas

| Tool | Endpoint Freemática | Descripción |
|---|---|---|
| `freematica_list_materiales_asignados_servicios` | `GET /pvss/v2/contratos-servicios-material` | Lista de material asignado a servicios |
| `freematica_get_master_data` | (24 endpoints según `catalog`) | Devuelve un catálogo de datos maestros (tipos, geográficos, organizativos, inventario, financiero) |
| `freematica_list_clientes` | `GET /pgrl/v2/clientes` | Lista paginada de clientes |
| `freematica_get_cliente` | `GET /pgrl/v2/clientes/{idReg}` | Detalle de un cliente |
| `freematica_list_contactos_clientes` | `GET /pgrl/v2/contactos-clientes` | Lista paginada de contactos |
| `freematica_list_oportunidades_negocio` | `GET /pcrm/v2/oportunidades-negocio` | Lista paginada de oportunidades |
| `freematica_get_oportunidad_negocio` | `GET /pcrm/v2/oportunidades-negocio/{idReg}` | Detalle de oportunidad |
| `freematica_get_oportunidad_negocio_datos_ampliados` | `GET /pcrm/v2/oportunidades-negocio/{idReg}/datos-ampliados` | Datos ampliados (puede 404) |
| `freematica_get_ficha_prev_cliente` | `GET /pprl/v2/ficha-prev-cliente` | Ficha PRL de un cliente (filtros: codCliente, grupoCliente, codLocalizacionServicio, codigoFicha) |
| `freematica_list_vigilancia_salud` | `GET /pprl/v1/vigilancia-salud` | Lista paginada de registros de Vigilancia de la Salud con filtros FIQL y rango de fecha de cita |
| `freematica_get_vigilancia_salud` | `GET /pprl/v1/vigilancia-salud/{idreg}` | Detalle de un registro de Vigilancia de la Salud por idReg opaco |
| `freematica_list_personal` | `GET /pers/v2/personal` | Lista paginada de personas (RRHH) con filtros FIQL (empresa, delegación, nombre, NIF, activo...) |
| `freematica_get_persona` | `GET /pers/v2/personal/{idreg}` | Detalle de una persona por idReg opaco |
| `freematica_list_calendarios` | `GET /pgrl/v1/calendarios` | Lista paginada de calendarios laborales |
| `freematica_list_calendario_periodos` | `GET /pgrl/v1/calendarios/{idreg}/periodos` | Periodos de un calendario laboral concreto |
| `freematica_list_cartera_clientes` | `GET /pcar/v1/cartera-clientes` | Lista paginada de cartera de clientes (cobros, impagados). Filtros: empresa, codCliente, grupoCliente, representante, formaPago, modoPago, fechaDoc, fechaVencimiento, estado, soloImpagados, referencia |
| `freematica_get_cartera_cliente` | `GET /pcar/v1/cartera-clientes/{idReg}` | Detalle de un documento de cartera |
| `freematica_list_facturas_cabecera` | `GET /pven/v1/facturas-cabecera` | Lista paginada de facturas de ventas (cabecera). Filtros: empresa, codCliente, representante, fechaFactura, serie, numFactura, formaPago, traspasadoContabilidad, delegacion |
| `freematica_get_factura_cabecera` | `GET /pven/v1/facturas-cabecera/{idReg}` | Detalle de una factura |
| `freematica_list_factura_lineas` | `GET /pven/v1/facturas-cabecera/{idReg}/lineas` | Líneas de detalle de una factura. Filtros: codArticulo, codFamilia, codSubfamilia, delegacion |
| `freematica_list_factura_iva` | `GET /pven/v1/facturas-cabecera/{idReg}/iva` | Líneas de IVA de una factura. Filtro: tipoIva |
| `freematica_list_factura_vencimientos` | `GET /pven/v1/facturas-cabecera/{idReg}/vencimientos` | Vencimientos de cobro de una factura. Filtros: fechaVencimiento, modoPago |

## Modos de transporte

El binario soporta dos transportes seleccionables. La selección sigue este orden de precedencia:

1. CLI flag: `--transport=<modo>`
2. Variable de entorno: `MCP_TRANSPORT=<modo>`
3. Default: `stdio`

| Modo | Cuándo usar | Comando |
|---|---|---|
| `stdio` | Claude Desktop, Claude Code, ejecución local | `mcp-freematica` (default) o `mcp-freematica --transport=stdio` |
| `http`  | Nubiia, deploy como servicio web | `mcp-freematica --transport=http` o `MCP_TRANSPORT=http mcp-freematica` |

### Configurar en Claude Desktop (stdio)

Edita `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "freematica": {
      "command": "npx",
      "args": ["-y", "@serlimar/mcp-freematica"],
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

Reinicia Claude Desktop y la tool `freematica_list_materiales_asignados_servicios` aparecerá disponible.

### Configurar en Claude Code (stdio)

```bash
claude mcp add freematica npx -y @serlimar/mcp-freematica \
  -e FREEMATICA_AUTH_TOKEN=... \
  -e FREEMATICA_AUTH_COMPANY=... \
  -e FREEMATICA_AUTH_ORGANIZATION=... \
  -e FREEMATICA_AUTH_APP=... \
  -e FREEMATICA_AUTH_SESSION=...
```

### Configurar en Nubiia (HTTP)

Setear `MCP_TRANSPORT=http` en las variables de entorno del proceso, junto a las 5 `FREEMATICA_AUTH_*`. Resto de variables (puerto, origins) opcionales — ver tabla en "Configuración".

## Datos maestros disponibles

La tool `freematica_get_master_data` acepta un parámetro `catalog` con uno de los 24 valores siguientes. Cada uno mapea a un endpoint específico de Freemática.

| `catalog` | Endpoint Freemática | Contenido |
|---|---|---|
| **Tipos / clasificaciones** | | |
| `tipos-contrato` | `GET /ppre/v2/tipos-contrato` | Tipos de contrato comercial |
| `tipo-instalacion` | `GET /ppre/v1/tipo-instalacion` | Tipos de instalación física |
| `clases-servicios` | `GET /pvss/v1/clases-servicios` | Clases de servicio operativas |
| `tipos-casos` | `GET /pcrm/v2/tipos-casos` | Tipos de caso CRM |
| `subtipos-casos` | `GET /pcrm/v2/subtipos-casos` | Subtipos de caso CRM |
| `tipos-oportunidad-negocio` | `GET /pcrm/v2/tipos-oportunidad-negocio` | Tipos de oportunidad comercial |
| `tipos-impuestos` | `GET /pgrl/v2/tipos-impuestos` | IVA, IRPF, retenciones |
| `naturalezas-abono` | `GET /pven/v1/naturalezas-abono` | Naturalezas de abono comercial |
| `incidencecode` | `GET /pvss/v2/incidencecode` | Códigos de incidencia en servicios |
| `claves-facturacion` | `GET /pvss/v2/claves-facturacion` | Claves de facturación de servicios |
| **Geográficos** | | |
| `paises` | `GET /pgrl/v1/paises` | Países |
| `nacionalidades` | `GET /pgrl/v1/nacionalidades` | Nacionalidades |
| `provincias` | `GET /pgrl/v1/provincias` | Provincias |
| `poblaciones` | `GET /pgrl/v2/poblaciones` | Municipios |
| **Organizativos** | | |
| `empresas` | `GET /pgrl/v1/empresas` | Empresas |
| `delegaciones` | `GET /pgrl/v1/delegaciones/agrupcod` | Delegaciones (listado global) |
| `lineas-negocio` | `GET /pgrl/v2/lineas-negocio` | Líneas de negocio |
| `cargos-clientes` | `GET /pgrl/v2/cargos-clientes` | Cargos de contactos |
| `calendarios` | `GET /pgrl/v1/calendarios` | Calendarios laborales |
| `series` | `GET /pgrl/v2/series` | Series de numeración de documentos |
| **Inventario** | | |
| `familias` | `GET /part/v1/familias` | Familias de artículos |
| `subfamilias` | `GET /part/v1/subfamilias` | Subfamilias |
| `lineas` | `GET /part/v1/lineas` | Líneas de artículos |
| **Financiero** | | |
| `bancos` | `GET /pgrl/v2/bancos` | Entidades bancarias |

Respuesta: `{ catalog, items, count, total }`. Patrón típico de uso: llamar primero al catálogo correspondiente cuando otra tool devuelva IDs crípticos para resolverlos a nombres humanos.

## Paginación

Todas las tools `freematica_list_*` aceptan dos parámetros opcionales:

- **`page`** (int, ≥1, default 1): página a recuperar, **1-indexed**.
- **`items`** (int, 1..50, default 20): items por página.

La respuesta incluye siempre `total` (total de elementos en el dataset) para que el LLM pueda iterar páginas.

> ⚠️ El parámetro está bloqueado en `page ≥ 1` porque el API real de Freemática trata `page=0` como "devuelve TODO el dataset" (varios MB en endpoints grandes como `clientes`). Verificado empíricamente.

## IDs opacos en endpoints de detalle

Las tools `freematica_get_*` requieren un `id` que **NO** es el código natural (`COD_CLI`, `ID_OPORTUNIDAD`) sino el campo **`idReg`** que aparece en los items del listado correspondiente. Es un string opaco base64 como `MV9fMTAwMA==`.

Si pasas un código natural, el API responde `not_found`.

Patrón típico de uso desde el LLM:
1. `freematica_list_clientes(page=1, items=20)` → encontrar el cliente que interesa.
2. Tomar el campo `idReg` de ese item.
3. `freematica_get_cliente(id="<idReg>")` → detalle completo.

## Configuración

El servidor lee toda su configuración de **variables de entorno** al arrancar. Si falta alguna obligatoria, el proceso muere con un mensaje claro listando qué falta — no acepta requests hasta que la configuración sea válida.

### Variables de entorno

| Variable | Obligatoria | Default | Descripción |
|---|---|---|---|
| `FREEMATICA_AUTH_TOKEN` | ✅ | — | Header `x-auth-token` para autenticar con la API de Freemática. |
| `FREEMATICA_AUTH_COMPANY` | ✅ | — | Header `x-auth-company`. Identifica la empresa dentro del API. |
| `FREEMATICA_AUTH_ORGANIZATION` | ✅ | — | Header `x-auth-organization`. Identifica la organización. |
| `FREEMATICA_AUTH_APP` | ✅ | — | Header `x-auth-app`. Identifica la aplicación que consume (p.ej. `pvss`). |
| `FREEMATICA_AUTH_SESSION` | ✅ | — | Header `x-auth-session`. Identifica la sesión activa. |
| `FREEMATICA_BASE_URL` | ❌ | `https://api-p01.clientservicepanel.com/restsat/api` | Base URL del API de Freemática. Cambiar solo si Freemática cambia el host o se usa un entorno alternativo. |
| `MCP_TRANSPORT` | ❌ | `stdio` | Transporte: `stdio` (default, para Claude Desktop/Code) o `http` (para Nubiia). Equivale al flag `--transport=`. |
| `MCP_PORT` | ❌ (solo HTTP) | `3000` | Puerto TCP donde el servidor MCP expone `/mcp` y `/health`. Ignorado en modo stdio. |
| `MCP_ALLOWED_ORIGINS` | ❌ (solo HTTP) | `*` | CORS: lista de orígenes permitidos separados por coma, o `*` para todos. En producción restringir al dominio de Nubiia. Ignorado en modo stdio. |

### De dónde salen las credenciales `x-auth-*`

Las 5 credenciales `x-auth-*` son **preexistentes** — el Postman collection de Freemática no expone un endpoint de login, así que estas credenciales se obtienen fuera de banda (típicamente por el departamento de IT de Freemática o el integrador de Serlimar).

- Pide los 5 valores al responsable técnico de Freemática (o usa los mismos que ya emplea `slm-integration` si están en el gestor de secretos).
- **NO comitees credenciales reales**. El repositorio tiene `.env.*` en `.gitignore` (excepto `.env.example`).
- Si las credenciales caducan, el MCP devolverá `invalid_token` en todas las llamadas. Renovarlas implica reiniciar el proceso (no hay refresh automático en v0.1.0).

### Configuración en Nubiia (producción)

Nubiia despliega el servidor MCP y se encarga de inyectar las variables de entorno. En el panel de Nubiia:

1. Crea un MCP server apuntando a la URL del contenedor desplegado (por ejemplo `https://freematica-mcp.serlimar.internal/mcp`).
2. Añade las 8 variables de entorno listadas arriba (5 obligatorias + 3 opcionales) en la sección de secretos.
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
   # [freematica-mcp] FATAL: [freematica-mcp] Invalid configuration:
   #   - FREEMATICA_AUTH_TOKEN: Required
   #   - FREEMATICA_AUTH_COMPANY: Required
   #   ...
   ```

2. **Con env vars válidas (modo HTTP)** — arranca con `MCP_TRANSPORT=http` y el proceso queda escuchando; `/health` devuelve `{ "status": "ok", "version": "0.4.1", "sessions": 0 }`:
   ```bash
   MCP_TRANSPORT=http node dist/index.js &
   curl http://localhost:3000/health
   ```
   En modo stdio (default) no hay endpoints HTTP — el server escucha JSON-RPC por stdin/stdout.

3. **Llamada real al API de Freemática** — inicializa sesión MCP y llama la única tool disponible. Si las credenciales son correctas devolverá `items` + `count`; si no, un error con `code: "invalid_token"` o similar:
   ```bash
   # 1) Inicializar y capturar el Mcp-Session-Id de los headers de respuesta
   curl -i -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}'

   # 2) Llamar la tool (sustituye <SESSION_ID> por el header devuelto)
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "Mcp-Session-Id: <SESSION_ID>" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"freematica_list_materiales_asignados_servicios","arguments":{}}}'
   ```

## Desarrollo

```bash
npm install
npm run dev        # arranca con tsx (hot reload)
npm test           # ejecuta vitest una vez
npm run test:watch # watcher
npm run lint
npm run typecheck
npm run build      # compila a dist/
npm start          # ejecuta dist/index.js
```

## Endpoints HTTP

| Método | Path | Descripción |
|---|---|---|
| POST | `/mcp` | JSON-RPC del MCP (envía `initialize` la primera vez) |
| GET | `/mcp` | Stream SSE (requiere `Mcp-Session-Id`) |
| DELETE | `/mcp` | Terminar sesión |
| GET | `/health` | Healthcheck |

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

### Opción 1 — Instalar como paquete npm desde GitHub Packages (recomendada)

El paquete se publica como `@serlimar/mcp-freematica` en GitHub Packages cuando se crea un tag `v*` en `main`.

```bash
# .npmrc del consumidor:
echo "@serlimar:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> ~/.npmrc

# Instalar y ejecutar
npm install -g @serlimar/mcp-freematica
mcp-freematica   # binario instalado, lee env vars y arranca el server
```

`GITHUB_TOKEN` debe tener scope `read:packages` y acceso al repo `serlimar/slm-freematica-mcp`.

### Opción 2 — Docker

```bash
docker build -t mcp-freematica .
docker run --env-file .env -p 3000:3000 mcp-freematica
```

### Opción 3 — Clone + build

```bash
git clone https://github.com/serlimar/slm-freematica-mcp.git
cd slm-freematica-mcp
npm ci && npm run build
node dist/index.js
```

## Publicar una nueva versión

1. Bump de versión en `package.json` (semver).
2. Commit + merge a `main`.
3. Crear y empujar un tag con prefijo `v`:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
4. El workflow `.github/workflows/publish.yml` se dispara, valida (lint + typecheck + test + build) y publica en GitHub Packages.

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
- API: `apidocs/Freematica API - Complete Collection.postman_collection.json`
- CHANGELOG: `CHANGELOG.md`

## Licencia

MIT — ver `LICENSE`.
