# Master Data Tool — Design Spec

- **Date:** 2026-05-19
- **Author:** Samuel Fraga
- **Status:** Approved, ready for implementation
- **Repo:** `serlimar/slm-freematica-mcp`
- **Target version:** `0.3.0`
- **Predecessors:** v0.1.0 (`docs/superpowers/specs/2026-05-18-freematica-mcp-design.md`), v0.2.0 (`docs/superpowers/specs/2026-05-19-stdio-transport-design.md`).

---

## 1. Context

Las tools actuales (v0.2.0) solo exponen una operación de negocio: `freematica_list_materiales_asignados_servicios`. Las respuestas de Freemática contienen códigos crípticos (IDs de tipos de contrato, clases de servicio, delegaciones, etc.) que el LLM no puede traducir sin acceso a los catálogos correspondientes.

Esta release añade una segunda tool, `freematica_get_master_data`, que expone 19 catálogos de datos maestros del API de Freemática a través de un único MCP tool con un parámetro `catalog` enum. El patrón sigue el de MCPs maduros (Stripe, Holded) y evita saturar el catálogo de tools del LLM con 19 tools casi idénticas.

## 2. Goals

- Una sola tool MCP, `freematica_get_master_data`, parametrizada con un enum `catalog`.
- Cubrir 19 catálogos agrupados en cuatro familias: tipos/clasificaciones, geográficos, organizativos, inventario.
- Descubrible vía MCP `tools/list` sin documentación externa: el `inputSchema` enumera los valores válidos y cada uno tiene una descripción de qué significa.
- Reutilizar la infraestructura existente (`BaseClient`, `FreematicaError`, `ok/error` helpers, factory `createFreematicaServer`).
- Cero breaking changes: la tool de v0.1.0 y todo el comportamiento de v0.2.0 (dual transport, env vars, dynamic imports) se conserva.

## 3. Non-goals

- Catálogos **operativos** (`/pvss/v2/normas`, `/pvss/v2/plantillas`). Decisión del usuario.
- Catálogos **financieros** (`/pgrl/v2/bancos`, `/pgrl/v2/series`, `/pcon/v2/cuentas-analiticas`, `/pcon/v2/cuentas-contables`, `/pvss/v2/claves-facturacion`). Decisión del usuario.
- Paginación, filtros por nombre, búsqueda. Los catálogos son pequeños (decenas a unos miles de registros). YAGNI.
- Cache server-side. Confiamos en el cliente Freemática.
- Tipado fuerte de cada catálogo. Igual que `VoContratosServMatAsignado`, dejamos `Record<string, unknown>[]` y se afina cuando haya respuestas reales.
- Tool meta-helper (`freematica_help`). Pospuesto a >5 tools.

## 4. Catálogos incluidos

Cada entrada define el valor del enum `catalog`, el endpoint Freemática y una descripción humana (que va al `.describe()` del enum para que el LLM la lea en el inputSchema).

| `catalog` | Endpoint | Descripción para el LLM |
|---|---|---|
| **Tipos / clasificaciones (9)** | | |
| `tipos-contrato` | `GET /ppre/v2/tipos-contrato` | Tipos de contrato comercial (mantenimiento, venta, instalación, etc.) |
| `tipo-instalacion` | `GET /ppre/v1/tipo-instalacion` | Tipos de instalación física |
| `clases-servicios` | `GET /pvss/v1/clases-servicios` | Clases de servicio operativas |
| `tipos-casos` | `GET /pcrm/v2/tipos-casos` | Tipos de caso/ticket del CRM |
| `subtipos-casos` | `GET /pcrm/v2/subtipos-casos` | Subtipos de caso del CRM |
| `tipos-oportunidad-negocio` | `GET /pcrm/v2/tipos-oportunidad-negocio` | Tipos de oportunidad comercial |
| `tipos-impuestos` | `GET /pgrl/v2/tipos-impuestos` | Tipos de impuesto (IVA, IRPF, retenciones) |
| `tipos-marcajes` | `GET /pkai/v1/tiposmarcajes` | Tipos de marcaje de presencia/jornada |
| `naturalezas-abono` | `GET /pven/v1/naturalezas-abono` | Naturalezas de abono comercial |
| **Geográficos (4)** | | |
| `paises` | `GET /pgrl/v1/paises` | Países |
| `nacionalidades` | `GET /pgrl/v1/nacionalidades` | Nacionalidades |
| `provincias` | `GET /pgrl/v1/provincias` | Provincias |
| `poblaciones` | `GET /pgrl/v2/poblaciones` | Poblaciones / municipios |
| **Organizativos (4)** | | |
| `empresas` | `GET /pgrl/v1/empresas` | Empresas dentro de la organización |
| `delegaciones` | `GET /pgrl/v2/delegaciones` | Delegaciones de las empresas |
| `lineas-negocio` | `GET /pgrl/v2/lineas-negocio` | Líneas de negocio |
| `cargos-clientes` | `GET /pgrl/v2/cargos-clientes` | Cargos / puestos de contactos de clientes |
| **Inventario (2)** | | |
| `familias` | `GET /part/v1/familias` | Familias de artículos / productos |
| `subfamilias` | `GET /part/v1/subfamilias` | Subfamilias de artículos |

Si Freemática ofrece varias versiones del mismo endpoint, usamos siempre la más alta (v2 sobre v1). Para los catálogos cuya última versión es v1, se documenta así.

## 5. Decisiones de diseño

| Decisión | Elección | Justificación |
|---|---|---|
| Una tool vs N tools | Una sola con enum | 19 tools casi idénticas saturan el catálogo del LLM. Patrón estándar (Stripe, Holded). |
| Nombre tool | `freematica_get_master_data` | Coherente con `freematica_list_materiales_asignados_servicios`. Prefijo namespaced. |
| Parámetro | `catalog: z.enum([19 valores])` | Validación a nivel de schema; valores inválidos rechazados antes del handler. |
| Descripción del enum | `.describe()` con la lista completa de valores y su significado | Visible para el LLM vía `tools/list`. No necesita docs externas. |
| Tipo de items | `Record<string, unknown>[]` | Igual que v0.1.0. Se tipa cuando se vea la forma real. |
| Output | `{ catalog, items, count }` | Mismo shape que `freematica_list_materiales_asignados_servicios`. |
| Paginación | No | YAGNI. Catálogos pequeños. |
| Cache | No | El cliente axios no cachea; Freemática responde rápido. |
| Mapeo catálogo → endpoint | `const CATALOG_ENDPOINTS: Record<MasterDataCatalog, string>` en `src/schemas/master-data.ts` | Una fuente de verdad. Añadir catálogo = 1 línea en enum + 1 línea en record. |
| Versionado API Freemática | v2 cuando exista, v1 si no | Aprovechar la versión más estable. |
| Versión paquete | `0.3.0` | Minor: feature add, no breaking. |

## 6. Estructura de archivos

```
src/
├── clients/
│   └── freematica-client.ts          # MODIFY: add getMasterData(catalog) method
├── tools/
│   ├── contratos.ts                  # no cambia
│   ├── helpers.ts                    # no cambia
│   └── master-data.ts                # NEW: registerMasterDataTools(server, client)
├── schemas/
│   ├── contratos.ts                  # no cambia
│   └── master-data.ts                # NEW: CATALOG_ENUM, CATALOG_ENDPOINTS, MasterDataCatalog type
├── types/
│   ├── contratos.ts                  # no cambia
│   └── master-data.ts                # NEW: MasterDataItem = Record<string, unknown>
├── server.ts                          # MODIFY: add registerMasterDataTools() call
├── server-instructions.ts             # MODIFY: extend with master data section
├── config.ts                          # no cambia
└── transports/                        # no cambia

tests/
├── clients/
│   └── freematica-client.test.ts     # MODIFY: add 2 tests for getMasterData
└── tools/
    └── master-data.test.ts           # NEW: 3 tests (registration, success, error)
```

## 7. Componentes

### 7.1 `src/schemas/master-data.ts`

```ts
import { z } from 'zod';

export const MASTER_DATA_CATALOGS = [
  'tipos-contrato',
  'tipo-instalacion',
  'clases-servicios',
  'tipos-casos',
  'subtipos-casos',
  'tipos-oportunidad-negocio',
  'tipos-impuestos',
  'tipos-marcajes',
  'naturalezas-abono',
  'paises',
  'nacionalidades',
  'provincias',
  'poblaciones',
  'empresas',
  'delegaciones',
  'lineas-negocio',
  'cargos-clientes',
  'familias',
  'subfamilias',
] as const;

export type MasterDataCatalog = typeof MASTER_DATA_CATALOGS[number];

export const MasterDataCatalogSchema = z.enum(MASTER_DATA_CATALOGS);

export const CATALOG_ENDPOINTS: Record<MasterDataCatalog, string> = {
  'tipos-contrato': '/ppre/v2/tipos-contrato',
  'tipo-instalacion': '/ppre/v1/tipo-instalacion',
  'clases-servicios': '/pvss/v1/clases-servicios',
  'tipos-casos': '/pcrm/v2/tipos-casos',
  'subtipos-casos': '/pcrm/v2/subtipos-casos',
  'tipos-oportunidad-negocio': '/pcrm/v2/tipos-oportunidad-negocio',
  'tipos-impuestos': '/pgrl/v2/tipos-impuestos',
  'tipos-marcajes': '/pkai/v1/tiposmarcajes',
  'naturalezas-abono': '/pven/v1/naturalezas-abono',
  'paises': '/pgrl/v1/paises',
  'nacionalidades': '/pgrl/v1/nacionalidades',
  'provincias': '/pgrl/v1/provincias',
  'poblaciones': '/pgrl/v2/poblaciones',
  'empresas': '/pgrl/v1/empresas',
  'delegaciones': '/pgrl/v2/delegaciones',
  'lineas-negocio': '/pgrl/v2/lineas-negocio',
  'cargos-clientes': '/pgrl/v2/cargos-clientes',
  'familias': '/part/v1/familias',
  'subfamilias': '/part/v1/subfamilias',
};
```

### 7.2 `src/types/master-data.ts`

```ts
export type MasterDataItem = Record<string, unknown>;
```

### 7.3 `src/clients/freematica-client.ts`

Añadir un método:

```ts
import { CATALOG_ENDPOINTS, type MasterDataCatalog } from '../schemas/master-data.js';
import type { MasterDataItem } from '../types/master-data.js';

// dentro de la clase FreematicaClient:
getMasterData(catalog: MasterDataCatalog): Promise<MasterDataItem[]> {
  const endpoint = CATALOG_ENDPOINTS[catalog];
  return this.get<MasterDataItem[]>(endpoint);
}
```

### 7.4 `src/tools/master-data.ts`

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { MasterDataCatalogSchema, MASTER_DATA_CATALOGS } from '../schemas/master-data.js';
import { error, ok } from './helpers.js';

const TOOL_NAME = 'freematica_get_master_data';

const CATALOG_DESCRIPTIONS = `tipos-contrato (tipos de contrato comercial), tipo-instalacion, clases-servicios (clases de servicio operativas), tipos-casos, subtipos-casos, tipos-oportunidad-negocio, tipos-impuestos (IVA, IRPF, retenciones), tipos-marcajes (presencia/jornada), naturalezas-abono, paises, nacionalidades, provincias, poblaciones (municipios), empresas, delegaciones, lineas-negocio, cargos-clientes (puestos de contactos), familias (de artículos), subfamilias`;

const TOOL_DESCRIPTION = [
  'Devuelve un catálogo de datos maestros de Freemática.',
  '',
  `Catálogos disponibles (${MASTER_DATA_CATALOGS.length}): ${CATALOG_DESCRIPTIONS}.`,
  '',
  'Devuelve un objeto con tres campos:',
  '  - catalog: el catálogo solicitado (echo)',
  '  - items: array de objetos con los registros del catálogo',
  '  - count: número total de elementos',
].join('\n');

export function registerMasterDataTools(server: McpServer, client: FreematicaClient): void {
  server.tool(
    TOOL_NAME,
    TOOL_DESCRIPTION,
    {
      catalog: MasterDataCatalogSchema.describe(
        `Catálogo a consultar. Valores válidos: ${CATALOG_DESCRIPTIONS}.`,
      ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ catalog }) => {
      try {
        const items = await client.getMasterData(catalog);
        return ok({ catalog, items, count: items.length });
      } catch (err) {
        if (err instanceof FreematicaError) return error(err);
        return error(err instanceof Error ? err : new Error(String(err)));
      }
    },
  );
}
```

### 7.5 `src/server.ts`

Añadir una línea:

```ts
import { registerMasterDataTools } from './tools/master-data.js';
// ...
registerMasterDataTools(server, opts.client);
```

### 7.6 `src/server-instructions.ts`

Extender el bloque "Tools disponibles" para incluir la nueva tool con sus 19 catálogos y un par de ejemplos de uso.

## 8. Data flow

1. Claude llama `tools/call` con `{ name: "freematica_get_master_data", arguments: { catalog: "tipos-contrato" } }`.
2. Zod valida el `catalog` contra el enum. Si es inválido, el SDK responde error de validación.
3. El handler invoca `client.getMasterData("tipos-contrato")`.
4. `getMasterData` resuelve `endpoint = CATALOG_ENDPOINTS["tipos-contrato"]` y llama a `this.get(endpoint)`.
5. `BaseClient.get` ejecuta `axios.get(baseUrl + endpoint, { headers: authHeaders })`.
6. Respuesta 2xx → devuelve el array → handler retorna `ok({ catalog, items, count })`.
7. Error → mapeado a `FreematicaError` → `error(err)` con el código normalizado.

## 9. Manejo de errores

Mismo flujo que la tool existente. Códigos posibles:

| Código | Cuándo |
|---|---|
| `invalid_token` | Auth expirada |
| `forbidden` | Sin permisos para el catálogo |
| `not_found` | Endpoint inexistente (catálogo retirado en Freemática) |
| `rate_limit_exceeded` | Demasiadas peticiones |
| `server_error` | 5xx |
| `network_error` | Timeout / unreachable |
| `unexpected_error` | Cualquier otro |

Validación de input fallida (catálogo no presente en el enum) la maneja el SDK antes de llegar al handler y devuelve un error MCP estándar de invalid_params.

## 10. Testing

### 10.1 `tests/clients/freematica-client.test.ts` (añadir)

Dos tests nuevos dentro de un `describe('getMasterData', ...)`:

1. Llama al endpoint correcto para `tipos-contrato` y devuelve el array.
2. Propaga `FreematicaError` con código `invalid_token` cuando el API responde 401.

No se testean los 19 catálogos individualmente: el lookup está en el record, basta cubrir 1 ejemplo + verificar el mapeo en un test del record (opcional).

### 10.2 `tests/tools/master-data.test.ts` (nuevo)

Tres tests:

1. `registerMasterDataTools` registra la tool `freematica_get_master_data`.
2. Handler con `catalog="paises"` devuelve `ok({ catalog: "paises", items, count })`.
3. Handler con `catalog="paises"` y API 401 devuelve `error()` con `error: "invalid_token"`.

### 10.3 Validación cross-cutting

Un test ligero adicional verifica que `MASTER_DATA_CATALOGS` y `CATALOG_ENDPOINTS` tienen el mismo conjunto de claves (evita olvidos al añadir un catálogo nuevo):

```ts
it('every catalog has an endpoint mapping', () => {
  for (const cat of MASTER_DATA_CATALOGS) {
    expect(CATALOG_ENDPOINTS[cat]).toBeDefined();
    expect(CATALOG_ENDPOINTS[cat]).toMatch(/^\/[a-z]/);
  }
});
```

## 11. README

Añadir:

- Fila nueva en la tabla "Tools expuestas" para `freematica_get_master_data`.
- Sección "Datos maestros disponibles" listando los 19 valores del enum con su endpoint.
- CHANGELOG entrada v0.3.0 con `Added`.

## 12. Versión

`0.3.0`. Actualizar `package.json`, `src/server.ts` (string version del McpServer), `src/transports/http.ts` (string version del `/health`).

## 13. Open questions

1. ¿Hay catálogos con respuestas grandes (>1 MB) que justifiquen revisar la decisión de no paginar? Si en producción se observa lentitud en `poblaciones` (España tiene ~8000 municipios), revisar en v0.4.x.
2. ¿Se observan respuestas con shapes consistentes entre catálogos? Si todos comparten `{ idreg, codigo, nombre }`, podríamos tipar `MasterDataItem` con campos mínimos. Decidir tras la primera prueba real.
