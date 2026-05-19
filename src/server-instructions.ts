export const FREEMATICA_MCP_INSTRUCTIONS = `
# Freemática MCP

Este servidor expone operaciones del API REST de Freemática como tools MCP.

## Tools disponibles

- **freematica_list_materiales_asignados_servicios** — Devuelve la lista de
  material asignado a servicios (sin parámetros). Devuelve un objeto
  { items: VoContratosServMatAsignado[], count: number }.

- **freematica_get_master_data** — Devuelve un catálogo de datos maestros.
  Parámetro \`catalog\` (enum): tipos-contrato, tipo-instalacion, clases-servicios,
  tipos-casos, subtipos-casos, tipos-oportunidad-negocio, tipos-impuestos,
  tipos-marcajes, naturalezas-abono, paises, nacionalidades, provincias,
  poblaciones, empresas, delegaciones, lineas-negocio, cargos-clientes,
  familias, subfamilias. Devuelve { catalog, items, count }.

  Patrón típico: cuando una respuesta de otra tool contenga IDs de tipo de
  contrato o clase de servicio, llamar primero a freematica_get_master_data
  con el catálogo correspondiente para mapear esos IDs a nombres humanos.

## Manejo de errores

Las llamadas pueden fallar con uno de estos códigos:

| Código | Significado | Acción del LLM |
|---|---|---|
| invalid_token | Credenciales caducadas o inválidas | Avisar al usuario; renovar en Nubiia. |
| forbidden | Permisos insuficientes | Explicar; no reintentar. |
| not_found | Recurso o endpoint inexistente | Comprobar el ID; no reintentar. |
| rate_limit_exceeded | Demasiadas peticiones | Esperar y reintentar una vez. |
| server_error | Error 5xx del API | Reintentar una vez con backoff. |
| network_error | Problemas de red | Reintentar una vez tras 2s. |
| unexpected_error | Error no clasificado | Loggear y reintentar una vez. |
`.trim();
