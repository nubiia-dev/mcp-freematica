# ADR-0003: Logging estructurado con pino y propagación de requestId

**Estado:** Aceptado

**Fecha:** 2026-05-20

**Autores:** Nubiia

---

## Contexto

El MCP necesita logging para:

1. Observabilidad en producción (Nubiia, Docker).
2. Debugging de fallos en el upstream Freemática.
3. Auditoría de qué requests hace cada sesión MCP.

### Requisitos identificados

- **Logs estructurados** (JSON): facilitan el parsing por herramientas de observabilidad (Loki, CloudWatch, GCP Logging).
- **requestId por petición**: permite correlacionar todos los logs de un mismo request HTTP a Freemática.
- **Sanitización de credenciales**: los headers `x-auth-*` NUNCA deben aparecer en los logs.
- **Nivel configurable**: en producción usar `info`; en desarrollo usar `debug` para ver todos los detalles.
- **Inyectable en tests**: los tests de los clientes no deben generar output de log.

### Opciones consideradas

**Opción A: `console.log` / `console.error`** — sin dependencias, pero output plano, sin niveles, difícil de parsear.

**Opción B: `winston`** — popular, flexible, pero más pesado y configuración verbosa.

**Opción C: `pino` (elegida)** — logging JSON estructurado de alta performance, API simple, ecosistema de pino-pretty para desarrollo.

---

## Decisión

Se usa **pino** como librería de logging. La implementación vive en `src/logger.ts`.

### Diseño del logger

```typescript
// src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  name: 'freematica-mcp',
  // En producción: JSON puro. En desarrollo con NODE_ENV=development: pretty print.
  transport:
    process.env['NODE_ENV'] === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// Factory para crear child loggers con contexto adicional.
// Usada en tests para inyectar un logger silencioso (level: 'silent').
export function createLogger(overrides?: Parameters<typeof pino>[0]) {
  return pino({ level: process.env['LOG_LEVEL'] ?? 'info', name: 'freematica-mcp', ...overrides });
}
```

### Propagación de requestId

Cada petición al upstream Freemática genera un `requestId` con `uuid v4`. Este ID se incluye en todos los logs relacionados con esa petición:

```typescript
// En HardenedBaseClient.request()
const requestId = uuidv4();

logger.info(
  { requestId, method, path: logPath, duration_ms, status: 'ok', attempt },
  'HTTP request completed',
);
logger.warn(
  { requestId, method, path: logPath, duration_ms, status: 'error', errorCode, attempt },
  'HTTP request failed',
);
```

Ejemplo de un request con 2 intentos (1 fallo + 1 éxito):

```json
{"level":"warn","time":1716199200000,"name":"freematica-mcp","requestId":"abc-123","method":"GET","path":"/pcar/v1/cartera-clientes","duration_ms":30045,"status":"error","errorCode":"network_error","attempt":0}
{"level":"debug","time":1716199201000,"name":"freematica-mcp","requestId":"abc-123","attempt":1,"delay_ms":650,"reason":"network_error","msg":"Retrying request after backoff delay"}
{"level":"info","time":1716199202000,"name":"freematica-mcp","requestId":"abc-123","method":"GET","path":"/pcar/v1/cartera-clientes","duration_ms":245,"status":"ok","attempt":1}
```

### Sanitización de credenciales

Los headers `x-auth-*` (token, company, organization, app, session) son **estructuralmente excluidos** de los logs:

1. El `logPath` se extrae del path de la URL, sin query params (donde podrían filtrarse tokens si se usaran como query params).
2. Los headers de axios no se loguean en ningún caso — solo se loguea `method`, `path`, `duration_ms`, `status`, `errorCode`, `requestId`.
3. `pino` no tiene un mecanismo de redaction configurado en esta versión porque no hay campos de entrada al logger que contengan credenciales — la sanitización es por diseño, no por filtro post-hoc.

### Inyección en tests

Los tests de los clientes HTTP usan un logger silencioso para no contaminar la salida de Vitest:

```typescript
// En los tests:
import { createLogger } from '../../src/logger.js';
const silentLogger = createLogger({ level: 'silent' });
const client = new HardenedBaseClient({ ..., logger: silentLogger });
```

La factory `createLogger()` permite sobreescribir la configuración por defecto sin modificar el singleton global.

---

## Consecuencias

### Ventajas

- **JSON estructurado**: los logs son parseables directamente por Loki, Datadog, CloudWatch Insights, etc. sin regexes.
- **Alta performance**: pino es el logger Node.js más rápido del ecosistema (async, worker thread para I/O).
- **requestId**: facilita el debugging en producción — dado un error, se pueden recuperar todos los logs de esa petición con un simple query por `requestId`.
- **Credenciales seguras**: la ausencia de credenciales en logs es por diseño (no se pasan al logger), no por configuración (que podría olvidarse).
- **Testabilidad**: `createLogger({ level: 'silent' })` permite tests sin output de log.

### Desventajas / Trade-offs

- **Dependencia adicional**: pino y pino-pretty se añaden al bundle (pino en producción, pino-pretty en devDependencies).
- **No hay log de sesiones MCP**: los logs actuales cubren las peticiones HTTP al upstream. Las sesiones MCP (initialize, tool calls) no se loguean con el mismo detalle por decisión de alcance.
- **Log format**: en producción los logs son JSON puro en una línea. Los humanos que leen logs en raw (sin herramienta) necesitan `jq` o similar para leer logs en desarrollo si `NODE_ENV` no está seteado a `development`.

### Alternativas descartadas

- **winston**: descartada por mayor peso y API más verbosa para el mismo resultado.
- **console.log**: descartada por output no estructurado, no parseable.
- **OpenTelemetry logs**: evaluado, descartado por complejidad de setup para este tamaño de proyecto.

---

## Referencias

- `src/logger.ts` — implementación del logger y factory
- `src/clients/hardened-base-client.ts` — uso de requestId y logging por petición
- `tests/` — ejemplos de uso de `createLogger({ level: 'silent' })`
