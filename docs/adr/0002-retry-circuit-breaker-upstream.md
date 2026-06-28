# ADR-0002: Retry con backoff exponencial y Circuit Breaker para upstream Freemática

**Estado:** Aceptado

**Fecha:** 2026-05-20

**Autores:** Nubiia

---

## Contexto

El MCP actúa como proxy entre Claude/Nubiia y el API de Freemática. En producción, el upstream (Freemática) puede:

1. Responder lentamente o no responder (timeouts).
2. Devolver errores 5xx transitorios (reinicios, deploys, sobrecarga puntual).
3. Devolver 429 Too Many Requests (throttling).
4. Estar completamente caído por mantenimiento o fallo.

Sin protección, estos problemas se propagan directamente a Claude como errores opacos o cuelgues indefinidos.

### Opciones consideradas

**Opción A: Sin protección** — propagar errores tal cual al LLM.

**Opción B: Solo timeout** — añadir timeout configurable por request.

**Opción C: Timeout + retry con backoff exponencial** — reintentar errores transitorios.

**Opción D: Timeout + retry + circuit breaker (elegida)** — añadir protección activa contra cascadas de fallos.

---

## Decisión

Se implementa la **Opción D** en `src/clients/hardened-base-client.ts`, que extiende `BaseClient` con tres capas de protección:

### Capa 1: Timeout configurable

Cada petición HTTP tiene un timeout gestionado con `AbortController`. Si el upstream no responde en `FREEMATICA_TIMEOUT_MS` (default 30s), la petición se cancela y se mapea a `network_error`.

```typescript
const controller = new AbortController();
const timeoutHandle = setTimeout(() => controller.abort(), this.requestTimeoutMs);
```

### Capa 2: Retry con backoff exponencial

Los errores reintentables (`server_error`, `network_error`, `rate_limit_exceeded`) se reintentan hasta `FREEMATICA_MAX_RETRIES` veces (default 3) con delays progresivos + jitter aleatorio:

| Intento | Delay base | Jitter máx |
| ------- | ---------- | ---------- |
| 1       | 500ms      | 200ms      |
| 2       | 1000ms     | 200ms      |
| 3       | 2000ms     | 200ms      |

**Decisión sobre 429 (rate_limit_exceeded):** se reintenta honrando el header `Retry-After` cuando está presente. Si el header indica `Retry-After: 5`, se espera 5 segundos antes del siguiente intento en lugar del backoff exponencial estándar.

Los errores 4xx (`invalid_token`, `forbidden`, `not_found`) **no se reintentan** — son errores de configuración o datos, no transitorios.

### Capa 3: Circuit Breaker in-memory

Implementación clásica de 3 estados (closed → open → half-open) sin dependencias externas.

**Estado `closed`** (operación normal): peticiones pasan libremente. Contador de fallos consecutivos activo.

**Estado `open`** (cortocircuito): tras `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD` (default 5) fallos lógicos consecutivos, el circuito se abre. Las peticiones fallan inmediatamente con `server_error: "Circuit breaker is open"` sin tocar la red. El circuito permanece abierto `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` (default 30s).

**Estado `half-open`** (prueba): tras expirar el timeout, se deja pasar 1 petición de prueba. Si tiene éxito → `closed`. Si falla → vuelve a `open`.

### Semántica de conteo del circuit breaker

El circuit breaker cuenta **operaciones lógicas fallidas** (post-retry-exhaustion), no intentos HTTP individuales.

Con los valores por defecto (threshold=5, maxRetries=3):

- Cada operación puede generar hasta 4 peticiones HTTP (1 inicial + 3 reintentos).
- Para abrir el circuito hacen falta 5 operaciones agotadas = hasta **20 peticiones HTTP upstream**.
- Los blips transitorios que se resuelven en el primer o segundo reintento **no abren el circuito**.

Esta semántica es intencional: evita que un blip puntual cierre el acceso a Freemática para todos los usuarios del MCP.

---

## Consecuencias

### Ventajas

- **Resiliencia automática**: los errores transitorios de Freemática son transparentes para Claude en la mayoría de casos.
- **Fail-fast**: cuando Freemática está completamente caído, el circuit breaker abierto evita acumular peticiones en cola y degrada gracefully.
- **Observabilidad**: todos los estados del circuit breaker se loguean con pino (`circuitBreaker: "open"`, etc.).
- **Sin dependencias externas**: implementación propia sin añadir librerías de circuit breaker.
- **Configurable**: todos los umbrales ajustables por variables de entorno sin redeploy.

### Desventajas / Trade-offs

- **Estado in-memory**: el circuit breaker es por instancia del proceso. En deployments con múltiples réplicas, cada réplica tiene su propio estado. No hay coordinación distribuida.
- **No persiste entre reinicios**: el circuito siempre arranca en `closed`. Un reinicio del proceso "cura" el circuito, lo cual puede ser bueno (forzar reset) o malo (ocultar problemas persistentes).
- **Código adicional en el cliente**: `HardenedBaseClient` tiene más lógica que `BaseClient`. Hay que entenderla para debuggear comportamientos inesperados.

### Alternativas descartadas

- **Librería `opossum` (circuit breaker)**: descartada por añadir dependencia y por no ofrecer ventajas significativas sobre la implementación propia para este caso de uso.
- **Retry via `axios-retry`**: descartada por menor control sobre la integración con el circuit breaker y el AbortController.

---

## Referencias

- `src/clients/hardened-base-client.ts` — implementación completa
- `src/clients/base-client.ts` — clase base que se extiende
- `tests/clients/hardened-base-client.test.ts` — suite de tests
