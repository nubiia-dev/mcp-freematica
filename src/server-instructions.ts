export const FREEMATICA_MCP_INSTRUCTIONS = `
# Freemática MCP

Este servidor expone operaciones del API REST de Freemática como tools MCP.

## Tools disponibles (8)

### Materiales (1)

- **freematica_list_materiales_asignados_servicios** — Lista de material
  asignado a servicios (sin parámetros). Devuelve { items, count, total }.

### Datos maestros (1)

- **freematica_get_master_data** — Devuelve un catálogo de datos maestros.
  Parámetro \`catalog\` (enum): tipos-contrato, tipo-instalacion, clases-servicios,
  tipos-casos, subtipos-casos, tipos-oportunidad-negocio, tipos-impuestos,
  naturalezas-abono, paises, nacionalidades, provincias, poblaciones, empresas,
  delegaciones, lineas-negocio, cargos-clientes, familias, subfamilias (18 catálogos).
  Devuelve { catalog, items, count, total }.

### Clientes (2)

- **freematica_list_clientes(page=1, items=20)** — Lista paginada de clientes.
- **freematica_get_cliente(id)** — Detalle de un cliente. \`id\` = \`idReg\` opaco.

### Contactos clientes (1)

- **freematica_list_contactos_clientes(page=1, items=20)** — Lista paginada.

### Oportunidades de negocio (3)

- **freematica_list_oportunidades_negocio(page=1, items=20)** — Lista paginada.
- **freematica_get_oportunidad_negocio(id)** — Detalle. \`id\` = \`idReg\` opaco.
- **freematica_get_oportunidad_negocio_datos_ampliados(id)** — Datos ampliados.
  Puede devolver not_found si la oportunidad no tiene datos extra.

## Paginación

Todas las tools \`freematica_list_*\` aceptan dos parámetros opcionales:

- **page** (int, ≥1, default 1): página a recuperar, 1-indexed.
- **items** (int, 1..50, default 20): items por página.

La respuesta siempre incluye \`total\` = total de elementos en el dataset,
para que puedas paginar (\`page = total / items + 1\`).

AVISO: NO uses \`page=0\` (este parámetro lo bloquea al mínimo 1). El API real
trata \`page=0\` como "devuelve TODO el dataset" — puede ser muchos MB.

## IDs opacos en endpoints de detalle

Las tools \`freematica_get_*\` requieren un \`id\` que es el campo \`idReg\` de los
items en los listados — un string opaco base64 como \`MV9fMTAwMA==\` o \`MDJfXzI=\`.

NO uses códigos naturales como \`COD_CLI\` o \`ID_OPORTUNIDAD\` — el API devuelve
not_found. Patrón típico:

1. Llamar a \`freematica_list_clientes\` y localizar el cliente que buscas.
2. Tomar su campo \`idReg\`.
3. Pasarlo como \`id\` a \`freematica_get_cliente\`.

## Resolución de códigos a nombres

Muchas tools devuelven códigos como \`COD_TIPO_OPOR: "01"\` o \`COD_GRUPO_CLI: 1.0\`.
Para mostrar nombres legibles, usa \`freematica_get_master_data\` con el catálogo
correspondiente y haz el lookup.

## Manejo de errores

Las llamadas pueden fallar con uno de estos códigos:

| Código | Significado | Acción del LLM |
|---|---|---|
| invalid_token | Credenciales caducadas o inválidas | Avisar al usuario; renovar en Nubiia. |
| forbidden | Permisos insuficientes | Explicar; no reintentar. |
| not_found | Recurso o endpoint inexistente | Comprobar el id; no reintentar (excepto datos-ampliados, que puede ser un caso normal). |
| rate_limit_exceeded | Demasiadas peticiones | Esperar y reintentar una vez. |
| server_error | Error 5xx del API | Reintentar una vez con backoff. |
| network_error | Problemas de red | Reintentar una vez tras 2s. |
| unexpected_error | Error no clasificado | Loggear y reintentar una vez. |
`.trim();
