export const FREEMATICA_MCP_INSTRUCTIONS = `
# Freemática MCP

Este servidor expone operaciones del API REST de Freemática como tools MCP.

## Tools destacadas (lista parcial; el resto se descubren vía tools/list)

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

## Contratos y Servicios

Lectura (siempre disponibles):

- **freematica_list_contratos(page, items, empresa?, delegacion?, order?)** —
  Cabeceras de contratos (campos CTRT_*). AVISO: el API ignora los filtros
  FIQL en este endpoint; solo funcionan empresa/delegacion (params nativos).
- **freematica_get_contrato(empresa, codContrato, delegacion?)** — Busca un
  contrato por códigos naturales paginando internamente (puede tardar en
  datasets grandes). Devuelve la cabecera con su \`idReg\`.
- **freematica_list_servicios_contrato(idContrato, page, items)** — Servicios
  de un contrato (campos CTRTS_*). \`idContrato\` = idReg del contrato.
- **freematica_get_servicio_contrato(idReg)** — Detalle de un servicio.
- **freematica_list_contratos_opcionales(page, items)** /
  **freematica_get_contrato_opcionales(idReg)** — Opcionales de contratos
  (campos CON2_*, módulo ppre).

Escritura (solo si el servidor arranca con FREEMATICA_ENABLE_WRITES=true;
no existe borrado):

- **freematica_create_contrato** / **freematica_update_contrato** — Alta y
  actualización de cabeceras. Requeridos en alta: delegacion, descripcion,
  fecha, codCliente.
- **freematica_create_servicio_contrato(idContrato, …)** — Alta de servicio;
  los campos de identificación se derivan del idReg del contrato.
- **freematica_update_servicio_fechas(idContrato, idServicio, fechaAlta?,
  fechaFin?)** — Único mecanismo de "baja" de un servicio: informar fechaFin.
- **freematica_create_servicio_historico_precios** /
  **freematica_update_servicio_historico_precios** — Los precios de un
  servicio se gestionan como histórico versionado, separado del servicio.
- **freematica_create_servicio_facturacion_txt** — Líneas de texto de factura.
- **freematica_update_servicio_facturacion** — Datos de facturación (precios
  hora, importes, forma de pago); campos avanzados vía camposAdicionales
  (CTRTF_*).
- **freematica_create_contrato_opcionales** /
  **freematica_update_contrato_opcionales** — Opcionales (campos CON2_*).

Flujo típico para crear un contrato completo:
1. freematica_create_contrato → devuelve idReg.
2. freematica_create_servicio_contrato por cada servicio.
3. freematica_create_servicio_historico_precios con los precios.
4. (opcional) freematica_create_servicio_facturacion_txt.

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
