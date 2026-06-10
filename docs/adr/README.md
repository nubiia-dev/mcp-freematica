# Architecture Decision Records (ADRs)

Este directorio contiene las decisiones de arquitectura del MCP Freemática documentadas con el formato estándar ADR.

## Indice

| ADR                                              | Titulo                                                                   | Estado   |
| ------------------------------------------------ | ------------------------------------------------------------------------ | -------- |
| [0001](./0001-filtros-tipados-fiql-interno.md)   | Filtros tipados con adapter FIQL interno                                 | Aceptado |
| [0002](./0002-retry-circuit-breaker-upstream.md) | Retry con backoff exponencial y Circuit Breaker para upstream Freemática | Aceptado |
| [0003](./0003-logging-estructurado-pino.md)      | Logging estructurado con pino y propagación de requestId                 | Aceptado |

## Formato

Cada ADR sigue la estructura:

- **Estado**: Propuesto / Aceptado / Obsoleto / Sustituido por ADR-XXXX
- **Fecha**: Fecha de la decisión
- **Contexto**: Qué problema resuelve y qué opciones se evaluaron
- **Decisión**: Qué se decidió y por qué
- **Consecuencias**: Ventajas, desventajas y trade-offs de la decisión

## Proceso

Para proponer un nuevo ADR:

1. Crear un fichero `XXXX-titulo-descriptivo.md` siguiendo el formato existente.
2. Inicialmente con estado `Propuesto`.
3. Revisión en PR, discusión en comentarios.
4. Mergeado con estado `Aceptado` cuando hay consenso.
