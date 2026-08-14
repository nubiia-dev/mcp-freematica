# Changelog

Todas las versiones notables del paquete `@nubiia/mcp-freematica` se documentan aquí. Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [Unreleased] — módulo pgrl completado: correo, calendarios festivos, catálogos, instaladores, proveedores escritura

### Módulo `pgrl` (completar)

Completación del módulo `/pgrl/` de la API de Freemática. Se añaden **55 tools de solo lectura** y **14 tools de escritura** (condicionadas a `FREEMATICA_ENABLE_WRITES=true`). Cubre correos v1/v2, calendarios festivos, catálogos dedicados (delegaciones, empresas, geográficos, series, bancos, tipos de impuestos, usuarios, auditoría), instaladores, cargos de clientes, y escrituras de proveedores y localizaciones de pago de proveedores.

También se extienden los módulos existentes con endpoints v1 y detalles individuales de localizaciones.

#### Added (lectura — 55 tools nuevas)

- **`freematica_list_clientes_v1`** — `GET /pgrl/v1/clientes`. Lista paginada de clientes (v1). Preferir v2 para datos completos.
- **`freematica_get_cliente_v1`** — `GET /pgrl/v1/clientes/{idReg}`. Detalle de cliente (v1).
- **`freematica_list_contactos_clientes_v1`** — `GET /pgrl/v1/contactos-clientes`. Lista paginada de contactos de clientes (v1).
- **`freematica_get_contacto_cliente`** — `GET /pgrl/v1/contactos-clientes/{idReg}`. Detalle de un contacto de cliente.
- **`freematica_list_localizaciones_cobro_clientes_v1`** — `GET /pgrl/v1/localizaciones-cobro-clientes`. Lista paginada de localizaciones de cobro (v1).
- **`freematica_get_localizacion_cobro_cliente`** — `GET /pgrl/v1/localizaciones-cobro-clientes/{idReg}`. Detalle de localización de cobro (v1).
- **`freematica_get_localizacion_cobro_cliente_v2`** — `GET /pgrl/v2/localizaciones-cobro-clientes/{idReg}`. Detalle de localización de cobro (v2).
- **`freematica_list_localizaciones_envio_clientes_v1`** — `GET /pgrl/v1/localizaciones-envio-clientes`. Lista paginada (v1).
- **`freematica_get_localizacion_envio_cliente`** — `GET /pgrl/v1/localizaciones-envio-clientes/{idReg}`. Detalle (v1).
- **`freematica_get_localizacion_envio_cliente_v2`** — `GET /pgrl/v2/localizaciones-envio-clientes/{idReg}`. Detalle (v2).
- **`freematica_get_localizacion_factura_cliente`** — `GET /pgrl/v1/localizaciones-factura-clientes/{idReg}`. Detalle (v1).
- **`freematica_list_localizaciones_servicio_clientes_v1`** — `GET /pgrl/v1/localizaciones-servicio-clientes`. Lista paginada (v1).
- **`freematica_get_localizacion_servicio_cliente`** — `GET /pgrl/v1/localizaciones-servicio-clientes/{idReg}`. Detalle (v1).
- **`freematica_get_localizacion_servicio_cliente_v2`** — `GET /pgrl/v2/localizaciones-servicio-clientes/{idReg}`. Detalle (v2).
- **`freematica_list_localizaciones_pago_proveedores_v1`** — `GET /pgrl/v1/localizaciones-pago-proveedores`. Lista paginada (v1).
- **`freematica_get_localizacion_pago_proveedor`** — `GET /pgrl/v1/localizaciones-pago-proveedores/{idReg}`. Detalle (v1).
- **`freematica_get_localizacion_pago_proveedor_v2`** — `GET /pgrl/v2/localizaciones-pago-proveedores/{idReg}`. Detalle (v2).
- **`freematica_list_proveedores_v1`** — `GET /pgrl/v1/proveedores`. Lista paginada de proveedores (v1).
- **`freematica_list_cargos_clientes`** — `GET /pgrl/v2/cargos-clientes`. Lista paginada de cargos de clientes.
- **`freematica_get_cargo_cliente`** — `GET /pgrl/v2/cargos-clientes/{idReg}`. Detalle de un cargo de cliente.
- **`freematica_list_calen_festivos`** — `GET /pgrl/v2/calen-festivos`. Lista paginada de calendarios festivos.
- **`freematica_get_calen_festivo`** — `GET /pgrl/v2/calen-festivos/{idReg}`. Detalle de un calendario festivo.
- **`freematica_list_delegaciones_v1`** — `GET /pgrl/v1/delegaciones`. Lista paginada de delegaciones (v1).
- **`freematica_get_delegacion_v1`** — `GET /pgrl/v1/delegaciones/{idReg}`. Detalle de delegación (v1).
- **`freematica_list_delegaciones_agrupcod`** — `GET /pgrl/v1/delegaciones/agrupcod`. Delegaciones agrupadas por código.
- **`freematica_list_delegaciones_v2`** — `GET /pgrl/v2/delegaciones`. Lista paginada de delegaciones (v2).
- **`freematica_get_delegacion_v2`** — `GET /pgrl/v2/delegaciones/{idReg}`. Detalle de delegación (v2).
- **`freematica_list_empresas`** — `GET /pgrl/v1/empresas`. Lista paginada de empresas.
- **`freematica_get_empresa`** — `GET /pgrl/v1/empresas/{idReg}`. Detalle de una empresa.
- **`freematica_list_paises`** — `GET /pgrl/v1/paises`. Lista paginada de países.
- **`freematica_list_provincias`** — `GET /pgrl/v1/provincias`. Lista paginada de provincias.
- **`freematica_list_nacionalidades`** — `GET /pgrl/v1/nacionalidades`. Lista paginada de nacionalidades.
- **`freematica_list_poblaciones`** — `GET /pgrl/v2/poblaciones`. Lista paginada de poblaciones.
- **`freematica_get_poblacion`** — `GET /pgrl/v2/poblaciones/{idReg}`. Detalle de una población.
- **`freematica_list_series`** — `GET /pgrl/v2/series`. Lista paginada de series (v2).
- **`freematica_list_lineas_negocio`** — `GET /pgrl/v2/lineas-negocio`. Lista paginada de líneas de negocio.
- **`freematica_list_bancos`** — `GET /pgrl/v2/bancos`. Lista paginada de bancos.
- **`freematica_list_tipos_impuestos`** — `GET /pgrl/v2/tipos-impuestos`. Lista paginada de tipos de impuestos.
- **`freematica_get_tipo_impuesto`** — `GET /pgrl/v2/tipos-impuestos/{idReg}`. Detalle de un tipo de impuesto.
- **`freematica_list_usuarios_satelite`** — `GET /pgrl/v1/usuarios-satelite`. Lista paginada de usuarios satélite.
- **`freematica_get_configuracion_usuario`** — `GET /pgrl/v1/configuracion-usuario/{idReg}`. Configuración de un usuario.
- **`freematica_list_auditoria_procesos`** — `GET /pgrl/v2/auditoria-procesos`. Log de auditoría de procesos.
- **`freematica_list_instaladores`** — `GET /pgrl/v1/instaladores`. Lista paginada de instaladores.
- **`freematica_get_instalador`** — `GET /pgrl/v1/instaladores/{idReg}`. Detalle de un instalador.
- **`freematica_get_instalador_stocks`** — `GET /pgrl/v1/instaladores/{idReg}/stocks`. Stocks de un instalador.
- **`freematica_list_instalador_propuestas_compras`** — `GET /pgrl/v1/instaladores/{idReg}/propuestas-compras`. Propuestas de compra.
- **`freematica_get_parte_instalacion`** — `GET /pgrl/v1/partes-instalacion/{idReg}`. Detalle de un parte de instalación.
- **`freematica_list_correos`** — `GET /pgrl/v2/correos`. Lista paginada de correos (v2).
- **`freematica_get_correo`** — `GET /pgrl/v2/correos/{idReg}`. Detalle de un correo (v2).
- **`freematica_list_correos_destinatarios`** — `GET /pgrl/v2/correos/destinatarios`. Lista de destinatarios.
- **`freematica_get_correos_totales`** — `GET /pgrl/v2/correos/totales`. Totales de correos.
- **`freematica_list_correo_v1`** — `GET /pgrl/v1/correo`. Lista paginada de correos (v1).
- **`freematica_verificar_mail`** — `GET /pgrl/v2/control/mail/verificar`. Verifica si un email es válido.
- **`freematica_mailing_unsubscribe`** — `GET /pgrl/v1/mailing/unsubscribe/{idReg}`. Baja de mailing.
- **`freematica_mailing_subscribe`** — `GET /pgrl/v1/mailing/subscribe/{idReg}`. Alta de mailing.

#### Added (escritura — 14 tools nuevas, solo con `FREEMATICA_ENABLE_WRITES=true`)

- **`freematica_create_proveedor`** — `POST /pgrl/v2/proveedores`. Alta de proveedor (campos nativos libres).
- **`freematica_update_proveedor`** — `PUT /pgrl/v2/proveedores/{idReg}`. Actualización parcial de proveedor (fetch+merge).
- **`freematica_create_localizacion_pago_proveedor`** — `POST /pgrl/v2/localizaciones-pago-proveedores`. Alta de localización de pago.
- **`freematica_update_localizacion_pago_proveedor`** — `PUT /pgrl/v2/localizaciones-pago-proveedores/{idReg}`. Actualización parcial (fetch+merge v2).
- **`freematica_create_calen_festivo`** — `POST /pgrl/v2/calen-festivos`. Alta de calendario festivo (body libre por campos nativos).
- **`freematica_update_calen_festivo`** — `PUT /pgrl/v2/calen-festivos/{idReg}`. Actualización de calendario festivo (fetch+merge).
- **`freematica_update_calen_festivo_det`** — `PUT /pgrl/v2/calen-festivos-det/{idReg}`. Actualización de detalle de calendario festivo.
- **`freematica_create_instalador_propuesta_compra`** — `POST /pgrl/v1/instaladores/{idReg}/propuestas-compras`. Alta de propuesta de compra.
- **`freematica_create_correo_v1`** — `POST /pgrl/v1/correo`. Alta de correo (v1).
- **`freematica_create_correo`** — `POST /pgrl/v2/correos`. Alta de correo (v2).
- **`freematica_update_correo_estado_v1`** — `PUT /pgrl/v1/correo/{idReg}/estado`. Actualización de estado de correo (v1).
- **`freematica_update_correo_estado`** — `PUT /pgrl/v2/correos/{idReg}/estado`. Actualización de estado de correo (v2).

---

## [Unreleased] — módulo part (Inventario/Artículos) completo: lectura y escritura

### Módulo `part` (Inventario/Artículos)

Implementación completa del módulo `/part/` de la API de Freemática (Fase 5). Se añaden **14 tools de solo lectura** y **7 tools de escritura** (condicionadas a `FREEMATICA_ENABLE_WRITES=true`). Cubre costes de artículos, serie/lote, existencias (stocks-serie-lote), stocks por almacén, movimientos de stock, entradas de producción, albaranes de traspaso y tablas auxiliares de catálogo (familias, líneas, subfamilias).

Se extiende también `src/tools/articulos.ts` con 2 tools de lectura (`list_costes`, `get_coste`) y 2 de escritura (`create_articulo`, `update_articulo`), que complementan las 3 tools preexistentes de ese módulo sin reemplazarlas.

#### Added (lectura — 14 tools nuevas)

- **`freematica_list_articulos_costes`** — `GET /part/v2/articulos-costes`. Lista paginada de costes de artículos.
- **`freematica_get_articulo_coste`** — `GET /part/v2/articulos-costes/{idReg}`. Detalle de coste de un artículo.
- **`freematica_list_articulos_serie_lote`** — `GET /part/v2/articulos-serie-lote`. Lista paginada de artículos con número de serie/lote.
- **`freematica_get_articulo_serie_lote`** — `GET /part/v2/articulos-serie-lote/{idReg}`. Detalle de un artículo con número de serie/lote.
- **`freematica_list_stocks_serie_lote`** — `GET /part/v2/stocks-serie-lote`. Lista paginada de existencias de artículos por serie/lote.
- **`freematica_get_stock_serie_lote`** — `GET /part/v2/stocks-serie-lote/{idReg}`. Detalle de existencias de un artículo por serie/lote.
- **`freematica_list_stocks`** — `GET /part/v1/stocks`. Lista paginada de stocks de artículos por almacén.
- **`freematica_get_stock`** — `GET /part/v1/stocks/{idReg}`. Detalle de stock de un artículo por almacén (existencias, ubicación).
- **`freematica_list_familias`** — `GET /part/v1/familias`. Lista paginada de familias de artículos (complementa `freematica_get_master_data` con paginación e idReg individual).
- **`freematica_get_familia`** — `GET /part/v1/familias/{idReg}`. Detalle de una familia de artículos.
- **`freematica_list_lineas`** — `GET /part/v1/lineas`. Lista paginada de líneas de artículos.
- **`freematica_get_linea`** — `GET /part/v1/lineas/{idReg}`. Detalle de una línea de artículos.
- **`freematica_list_subfamilias`** — `GET /part/v1/subfamilias`. Lista paginada de subfamilias de artículos (complementa `freematica_get_master_data`).
- **`freematica_get_subfamilia`** — `GET /part/v1/subfamilias/{idReg}`. Detalle de una subfamilia de artículos.

#### Added (escritura — 7 tools nuevas, solo con `FREEMATICA_ENABLE_WRITES=true`)

- **`freematica_create_articulo`** — `POST /part/v2/articulos`. Alta de artículo en el catálogo de inventario (body libre por campos nativos).
- **`freematica_update_articulo`** — `PUT /part/v2/articulos/{idReg}`. Actualización parcial de artículo (fetch+merge; rechaza `fields` vacío).
- **`freematica_create_articulo_serie_lote`** — `POST /part/v2/articulos-serie-lote`. Alta de registro de número de serie/lote para un artículo (body libre).
- **`freematica_create_movimiento_stock`** — `POST /part/v2/movimientos-stock`. Alta de movimiento de stock: entradas, salidas y ajustes de inventario (body libre).
- **`freematica_create_entrada_produccion`** — `POST /part/v2/entradas-produccion`. Alta de entrada de producción (artículo fabricado). Params explícitos: `codArticulo`, `cantidad`, `codAlmacen`, `fchEntrada`, `codLote` (opcional).
- **`freematica_create_albaran_traspaso`** — `POST /part/v2/control/albaran-traspaso`. Alta de albarán de traspaso entre almacenes (`cab`: campos de cabecera; `lineas`: array de líneas).
- **`freematica_traspaso_albaran`** — `PUT /part/v2/control/albaran-traspaso/{idReg}`. Confirma el traspaso de un albarán de traspaso (body vacío; idReg URL-encoded).

#### Not implemented (by design)

- Endpoints de borrado (`DELETE`) — invariante del repositorio: no existen tools de borrado.
- `GET /part/v1/articulos`, `GET /part/v1/articulos/{idreg}`, `GET /pgrl/v1/precio-articulo/{idreg}` — ya implementados en `src/tools/articulos.ts` (Fase 1) y no se duplican.

---

## [Unreleased] — módulo pcrm (CRM extendido) completo: lectura y escritura

### Módulo `pcrm` (CRM extendido)

Implementación completa del módulo `/pcrm/` de la API de Freemática (Fase 4). Se añaden **17 tools de solo lectura** y **13 tools de escritura** (condicionadas a `FREEMATICA_ENABLE_WRITES=true`). Cubre actividades CRM (citas y tareas), casos (tickets), catálogos de tipos/subtipos de caso, documentos de portal de usuario (v1/v2), notas CRM y operaciones extendidas sobre oportunidades de negocio (detalle v1, tipos, creates v1/v2, updates v1/v2, datos ampliados).

#### Added (lectura — 17 tools nuevas)

- **`freematica_list_pcrm_actividades`** — `GET /pcrm/v2/actividades`. Lista paginada de actividades CRM (citas y tareas).
- **`freematica_get_pcrm_actividad`** — `GET /pcrm/v2/actividades/{idReg}`. Detalle de una actividad CRM.
- **`freematica_list_pcrm_casos`** — `GET /pcrm/v2/casos`. Lista paginada de casos CRM.
- **`freematica_get_pcrm_caso`** — `GET /pcrm/v2/casos/{idReg}`. Detalle de un caso CRM.
- **`freematica_list_pcrm_tipos_casos`** — `GET /pcrm/v2/tipos-casos`. Catálogo de tipos de caso CRM.
- **`freematica_get_pcrm_tipo_caso`** — `GET /pcrm/v2/tipos-casos/{idReg}`. Detalle de un tipo de caso.
- **`freematica_list_pcrm_subtipos_casos`** — `GET /pcrm/v2/subtipos-casos`. Catálogo de subtipos de caso CRM.
- **`freematica_get_pcrm_subtipo_caso`** — `GET /pcrm/v2/subtipos-casos/{idReg}`. Detalle de un subtipo de caso.
- **`freematica_list_pcrm_documentos_usuario_v1`** — `GET /pcrm/v1/usuarios/{idUsuario}/documentos`. Documentos de portal de usuario (v1, paginado).
- **`freematica_get_pcrm_documento_usuario_v1`** — `GET /pcrm/v1/usuarios/{idUsuario}/documentos/{idDocumento}`. Detalle de documento (v1).
- **`freematica_list_pcrm_documentos_usuario_v2`** — `GET /pcrm/v2/usuarios/{idUsuario}/documentos`. Documentos de portal de usuario (v2, paginado).
- **`freematica_get_pcrm_documento_usuario_v2`** — `GET /pcrm/v2/usuarios/{idUsuario}/documentos/{idDocumento}`. Detalle de documento (v2).
- **`freematica_list_pcrm_notas`** — `GET /pcrm/v2/notas`. Lista paginada de notas CRM.
- **`freematica_get_pcrm_nota`** — `GET /pcrm/v2/notas/{idReg}`. Detalle de una nota CRM.
- **`freematica_get_oportunidad_negocio_v1`** — `GET /pcrm/v1/oportunidades-negocio/{idReg}`. Detalle de oportunidad (v1, complementa las ya existentes v2).
- **`freematica_list_tipos_oportunidad_negocio`** — `GET /pcrm/v2/tipos-oportunidad-negocio`. Catálogo de tipos de oportunidad de negocio.
- **`freematica_get_tipo_oportunidad_negocio`** — `GET /pcrm/v2/tipos-oportunidad-negocio/{idReg}`. Detalle de un tipo de oportunidad.

#### Added (escritura — 13 tools nuevas, solo con `FREEMATICA_ENABLE_WRITES=true`)

- **`freematica_create_pcrm_actividad`** — `POST /pcrm/v2/actividades`. Alta de actividad CRM (cita o tarea).
- **`freematica_update_pcrm_actividad`** — `PUT /pcrm/v2/actividades/{idReg}`. Actualización parcial de actividad CRM.
- **`freematica_create_pcrm_caso`** — `POST /pcrm/v2/casos`. Alta de caso CRM.
- **`freematica_update_pcrm_caso`** — `PUT /pcrm/v2/casos/{idReg}`. Actualización parcial de caso CRM.
- **`freematica_update_pcrm_documento_usuario_v1`** — `PUT /pcrm/v1/usuarios/{idUsuario}/documentos/{idDocumento}`. Actualización de documento de portal (v1, body libre por campos nativos).
- **`freematica_update_pcrm_documento_usuario_v2`** — `PUT /pcrm/v2/usuarios/{idUsuario}/documentos/{idDocumento}`. Actualización de documento de portal (v2, body libre por campos nativos).
- **`freematica_create_pcrm_nota`** — `POST /pcrm/v2/notas`. Alta de nota CRM (body libre por campos nativos).
- **`freematica_create_oportunidad_negocio_v1`** — `POST /pcrm/v1/oportunidades-negocio`. Alta de oportunidad de negocio (v1).
- **`freematica_create_oportunidad_negocio`** — `POST /pcrm/v2/oportunidades-negocio`. Alta de oportunidad de negocio (v2).
- **`freematica_update_oportunidad_negocio_v1`** — `PUT /pcrm/v1/oportunidades-negocio/{idReg}`. Actualización de oportunidad de negocio (v1).
- **`freematica_update_oportunidad_negocio`** — `PUT /pcrm/v2/oportunidades-negocio/{idReg}`. Actualización de oportunidad de negocio (v2).
- **`freematica_update_oportunidad_negocio_datos_ampliados`** — `PUT /pcrm/v2/oportunidades-negocio/{idReg}/datos-ampliados`. Actualización de datos ampliados de oportunidad (COVR\_\*).

#### Not implemented (by design)

- `DELETE /pcrm/v2/actividades/:idReg`, `DELETE /pcrm/v2/casos/:idReg`, `DELETE /pcrm/v2/oportunidades-negocio/:idReg` — borrado de recursos (invariante del repo: sin tools de borrado).
- `GET /pcrm/v2/casos/export`, `GET /pcrm/v2/oportunidades-negocio/export` — exports CSV, no aptos para consumo por LLM; usar tools de lista con filtros para obtener subconjuntos.

---

## [Unreleased] — módulo pemf (e-Movifree / Operativa de Campo) completo: lectura y escritura

### Módulo `pemf` (e-Movifree / Operativa de Campo)

Implementación completa del módulo `/pemf/` de la API de Freemática. Se añaden **28 tools de solo lectura** y **8 tools de escritura** (condicionadas a `FREEMATICA_ENABLE_WRITES=true`). Cubre marcajes de campo, dispositivos NFC/QR/BLE, rondas de vigilancia, servicios de campo (con alarmas, incidencias, trabajos), materiales, configuración de módulos, datos del operario y descubiertos.

#### Added (lectura — 28 tools nuevas)

- **`freematica_list_pemf_marcajes`** — `GET /pemf/v2/marcajes`. Lista paginada de marcajes e-Movifree (v2).
- **`freematica_get_pemf_marcaje`** — `GET /pemf/v2/marcajes/{idReg}`. Detalle de un marcaje.
- **`freematica_list_pemf_tracking`** — `GET /pemf/v1/tracking`. Tracking de posiciones GPS de operarios.
- **`freematica_list_pemf_calls`** — `GET /pemf/v1/calls`. Registro de llamadas de servicio.
- **`freematica_list_pemf_geoposition`** — `GET /pemf/v1/geoposition`. Última geolocalización de operarios (v1).
- **`freematica_list_pemf_geoposition_v2`** — `GET /pemf/v2/geoposition`. Última geolocalización de operarios (v2).
- **`freematica_list_pemf_cna`** — `GET /pemf/v2/cna`. Estado de operarios de campo (CNA).
- **`freematica_list_pemf_devices`** — `GET /pemf/v1/devices`. Lista paginada de dispositivos e-Movifree.
- **`freematica_get_pemf_device`** — `GET /pemf/v1/devices/{idDevice}`. Detalle de un dispositivo.
- **`freematica_list_pemf_rondas`** — `GET /pemf/v1/rounds`. Rondas de vigilancia (v1, paginado).
- **`freematica_list_pemf_rondas_v2`** — `GET /pemf/v2/rounds`. Rondas de vigilancia (v2, paginado).
- **`freematica_list_pemf_ronda_points`** — `GET /pemf/v1/rounds/{idRonda}/points`. Puntos de una ronda (v1).
- **`freematica_list_pemf_ronda_points_v2`** — `GET /pemf/v2/rounds/{idRonda}/points`. Puntos de una ronda (v2).
- **`freematica_list_pemf_services`** — `GET /pemf/v1/services`. Servicios de campo activos (paginado).
- **`freematica_get_pemf_service`** — `GET /pemf/v1/services/{idService}`. Detalle de un servicio.
- **`freematica_list_pemf_service_alarms`** — `GET /pemf/v1/services/{idService}/alarms`. Alarmas de un servicio.
- **`freematica_list_pemf_service_issues`** — `GET /pemf/v1/services/{idService}/issues`. Incidencias de un servicio.
- **`freematica_list_pemf_service_rounds`** — `GET /pemf/v1/services/{idService}/rounds`. Rondas de un servicio.
- **`freematica_list_pemf_service_jobs`** — `GET /pemf/v1/services/{idService}/jobs`. Trabajos de un servicio.
- **`freematica_list_pemf_identificadores_servicio`** — `GET /pemf/v2/identificadores-servicio`. Identificadores (QR/NFC/BLE) paginados.
- **`freematica_list_pemf_rutas`** — `GET /pemf/v2/routes`. Rutas de operarios asignadas (paginado).
- **`freematica_list_pemf_materiales_consumibles`** — `GET /pemf/v2/services/{idReg}/materiales-consumibles`. Materiales consumibles de un servicio.
- **`freematica_list_pemf_materiales_imputados`** — `GET /pemf/v2/services/{idReg}/materiales-imputados`. Materiales imputados a un servicio.
- **`freematica_get_pemf_config_global`** — `GET /pemf/v1/config`. Configuración global de e-Movifree.
- **`freematica_get_pemf_config`** — `GET /pemf/v{1,2}/config/{idConfig}`. Configuración de un módulo (v1/v2 seleccionable).
- **`freematica_list_pemf_usuarios_notificaciones`** — `GET /pemf/v1/usuarios-notificaciones`. Usuarios configurados para notificaciones.
- **`freematica_get_pemf_operario`** — `GET /pemf/v1/users`. Datos del operario autenticado.
- **`freematica_list_pemf_descubiertos`** — `GET /pemf/v1/descubiertos`. Servicios descubiertos (sin operario) del día.

#### Added (escritura — 8 tools nuevas, solo con `FREEMATICA_ENABLE_WRITES=true`)

- **`freematica_create_pemf_marcaje`** — `POST /pemf/v1/servicio/{idServicio}/crear-marcaje`. Crear marcaje e-Movifree en un servicio.
- **`freematica_create_pemf_marcaje_fecha_persona`** — `POST /pemf/v2/marcaje-fechapersona`. Crear marcaje por fecha y persona (v2).
- **`freematica_create_pemf_device`** — `POST /pemf/v1/devices`. Alta de dispositivo e-Movifree.
- **`freematica_update_pemf_device`** — `PUT /pemf/v1/devices/{idDevice}`. Actualización de dispositivo.
- **`freematica_create_pemf_ronda`** — `POST /pemf/v1/rounds`. Alta de ronda de vigilancia.
- **`freematica_save_pemf_config`** — `POST /pemf/v{1,2}/config/{idConfig}`. Guardar configuración de módulo (POST).
- **`freematica_update_pemf_config`** — `PUT /pemf/v{1,2}/config/{idConfig}`. Actualizar configuración de módulo (PUT).
- **`freematica_update_pemf_ruta`** — `PUT /pemf/v2/routes/{idReg}`. Actualizar ruta de operario (asignación, horario, frecuencia).

#### Not implemented (by design)

- `DELETE /pemf/v1/config/:idConfig`, `DELETE /pemf/v2/config/:idConfig`, `DELETE /pemf/v1/devices/:idDevice` — borrado de recursos (invariante del repo: sin tools de borrado).
- `POST/GET /pemf/v1/identificacion-pin`, `POST/GET /pemf/v1/identificacion-tag` — login de operario por PIN/TAG, no es un tool de datos para LLM.
- `GET /pemf/v1/clients` — endpoint de filtros de UI, no expone datos de negocio.
- Endpoints IVR/CCR (Twilio/Vonage: `call`, `ccr-*`, `config/ccr`) — flujos de voz telefónica, no consultas de datos.
- Exports binarios (`GET /pemf/v1/services/{id}/pdf-reporte`, etc.) — binarios PDF, no procesables por LLM.
- Acciones de control de dispositivo (`/device/close`, `/device/reset`) — sin valor de datos para LLM.

---

## [Unreleased] — módulo ppre (Preventivos/Mantenimiento/Instalaciones) completo: lectura y escritura

### Módulo `ppre` (Preventivos / Mantenimiento / Instalaciones)

Implementación completa del módulo `/ppre/` de la API de Freemática. Se añaden **24 tools de solo lectura** y **9 tools de escritura** (condicionadas a `FREEMATICA_ENABLE_WRITES=true`). Cubre contratos de instalación/mantenimiento, órdenes de trabajo, partes, actas de partes, fichas de instalación, marcajes IKAROS y catálogos auxiliares.

#### Added (lectura — 24 tools nuevas)

- **`freematica_list_ppre_contratos`** — `GET /ppre/v1/contratos`. Lista paginada de contratos de instalación/mantenimiento (v1).
- **`freematica_list_ppre_contratos_v2`** — `GET /ppre/v2/contratos`. Lista de contratos vigentes (v2).
- **`freematica_get_ppre_contrato_v1`** — `GET /ppre/v1/contratos/{idreg}`. Detalle de un contrato (v1).
- **`freematica_get_ppre_contrato_v2`** — `GET /ppre/v2/contratos/{idReg}`. Detalle de un contrato (v2).
- **`freematica_list_ppre_contratos_instalacion`** — `GET /ppre/v1/contratosInstalacion`. Contratos por instalación.
- **`freematica_list_ppre_tipos_contrato`** — `GET /ppre/v2/tipos-contrato`. Catálogo de tipos de contrato.
- **`freematica_list_ppre_ordenes_trabajo`** — `GET /ppre/v1/ordenes-trabajo`. Lista de órdenes de trabajo.
- **`freematica_get_ppre_orden_trabajo`** — `GET /ppre/v1/ordenes-trabajo/{idreg}`. Detalle de una OT.
- **`freematica_list_ppre_partes`** — `GET /ppre/v1/partes`. Lista de partes.
- **`freematica_get_ppre_parte`** — `GET /ppre/v1/partes/{idreg}`. Detalle de un parte.
- **`freematica_get_ppre_parte_componentes_ficha_tecnica`** — `GET /ppre/v1/partes/{idreg}/componentes-ficha-tecnica`. Componentes de la ficha técnica del parte.
- **`freematica_list_ppre_parte_ultimas_intervenciones`** — `GET /ppre/v1/partes/{idreg}/ultimas-intervenciones`. Últimas intervenciones de un parte.
- **`freematica_list_ppre_partes_orden_trabajo`** — `GET /ppre/v2/partes/partes-orden-trabajo`. Partes cumplimentados por OT.
- **`freematica_list_ppre_partes_fin_mantenedor`** — `GET /ppre/v2/partes/partes-fin-mantenedor`. Partes finalizados por el mantenedor.
- **`freematica_list_ppre_cabecera_actas_partes`** — `GET /ppre/v2/partes/cabecera-actas-partes`. Cabecera de actas de partes.
- **`freematica_list_ppre_lineas_actas_partes`** — `GET /ppre/v2/partes/lineas-actas-partes`. Líneas de actas de partes.
- **`freematica_list_ppre_fichas_instalacion`** — `GET /ppre/v1/fichas-instalacion/{idReg}`. Lista de fichas de instalación (idReg en path, opcional).
- **`freematica_get_ppre_ficha_tecnica`** — `GET /ppre/v1/ficha-tecnica/{idReg}`. Ficha técnica de una instalación.
- **`freematica_list_ppre_componentes_ficha_tecnica`** — `GET /ppre/v1/fichas-tecnicas/{idreg}/componentes`. Componentes de una ficha técnica.
- **`freematica_list_ppre_marcajes`** — `GET /ppre/v1/marcajes`. Marcajes IKAROS (v1).
- **`freematica_list_ppre_marcajes_v2`** — `GET /ppre/v2/marcajes`. Marcajes IKAROS (v2).
- **`freematica_list_ppre_incidencias_anomalias`** — `GET /ppre/v1/incidencias-anomalias`. Catálogo de incidencias y anomalías.
- **`freematica_list_ppre_tipo_instalacion`** — `GET /ppre/v1/tipo-instalacion`. Catálogo de tipos de instalación.

#### Added (escritura — 9 tools nuevas, solo con `FREEMATICA_ENABLE_WRITES=true`)

- **`freematica_create_ppre_contrato`** — `POST /ppre/v2/contratos`. Alta de contrato con campos CON\_\*.
- **`freematica_create_ppre_orden_trabajo`** — `POST /ppre/v1/ordenes-trabajo`. Alta de orden de trabajo con campos AVI\_\* y PPC\_\*.
- **`freematica_update_ppre_orden_trabajo`** — `PUT /ppre/v1/ordenes-trabajo/{idreg}`. Actualización de orden de trabajo.
- **`freematica_update_ppre_lineas_actas_partes`** — `PUT /ppre/v2/partes/importar-lineas-actas-partes/{idReg}`. Importar líneas de actas de partes.
- **`freematica_create_ppre_ficha_instalacion_material`** — `POST /ppre/v1/fichas-instalacion-material`. Alta de material en ficha de instalación.
- **`freematica_update_ppre_ficha_instalacion`** — `PUT /ppre/v1/fichas-instalacion/{idReg}`. Actualización de ficha de instalación.
- **`freematica_create_ppre_marcaje`** — `POST /ppre/v1/guardar`. Grabar marcaje IKAROS.
- **`freematica_update_ppre_marcaje_v1`** — `PUT /ppre/v1/actualizar/{idReg}`. Actualizar marcaje (v1).
- **`freematica_update_ppre_marcaje_v2`** — `PUT /ppre/v2/actualizar/{idReg}`. Actualizar marcaje (v2).

#### Not implemented (by design)

- `DELETE /ppre/v2/contratos/opcionales/{idReg}` — borrado de opcionales (fuera de alcance, sin tool de borrado en este repo).
- `DELETE /ppre/v1/eliminar/{idReg}` y `DELETE /ppre/v2/eliminar/{idReg}` — borrado de marcajes (fuera de alcance).
- `DELETE /ppre/v1/ordenes-trabajo/{idreg}` — borrado de OT (fuera de alcance).
- `POST /ppre/v1/control/entrada` y `POST /ppre/v2/control/entrada` — login de la app móvil, no es un tool de datos.
- `GET /ppre/v1/clients` — endpoint de filtros de UI, no expone datos de negocio.

---

## [Unreleased] — módulo pers (RRHH) completo: lectura y escritura

### Módulo `pers` (RRHH / Personal) — Fase 1 completa

Implementación completa del módulo `/pers/` de la API de Freemática, tanto en lectura como en escritura. Se añaden **36 tools de solo lectura** y **29 tools de escritura** (condicionadas a `FREEMATICA_ENABLE_WRITES=true`). Cubre todos los sub-módulos: Personal maestro, Notas, Experiencia, Formación, Contratos laborales, Tramos de horario, Datos de pago, Campos adicionales, Anticipos, Calendario personal, CPD (documentos del empleado), IRPF, Sesiones de formación, Incidencias VSS y Preventor.

#### Added (lectura — 36 tools nuevas)

- **`freematica_list_personal_v2`** — `GET /pers/v2/personal`. Sincronización incremental de personas; param `fchmodificacion` (YYYY-MM-DD) opcional.
- **`freematica_list_personal_identificacion`** — `GET /pers/v2/personal-identificacion`. Datos de identificación del personal.
- **`freematica_list_personal_notas`** — `GET /pers/v2/personal-notas`. Notas del personal; param `idReg` nativo para filtrar por persona.
- **`freematica_get_personal_nota`** — `GET /pers/v2/personal-notas/{idReg}`. Detalle de una nota.
- **`freematica_list_personal_experiencias`** — `GET /pers/v1/personal-experiencias`. Historial de experiencia laboral.
- **`freematica_get_personal_experiencia`** — `GET /pers/v1/personal-experiencias/{idreg}`. Detalle de una experiencia.
- **`freematica_list_personal_formaciones`** — `GET /pers/v1/personal-formaciones`. Historial de formaciones.
- **`freematica_get_personal_formacion`** — `GET /pers/v1/personal-formaciones/{idReg}`. Detalle de una formación.
- **`freematica_list_personal_contratos`** — `GET /pers/v1/personal_contratos`. Contratos laborales (PERCTRAB\_\*).
- **`freematica_get_personal_contrato`** — `GET /pers/v1/personal_contratos/{idreg}`. Detalle de un contrato laboral.
- **`freematica_list_personal_tramos`** — `GET /pers/v1/personal_tramos`. Tramos de horario v1 (PERHH\_\*).
- **`freematica_get_personal_tramo`** — `GET /pers/v1/personal_tramos/{idreg}`. Detalle de un tramo v1.
- **`freematica_list_personal_tramos_sync`** — `GET /pers/v2/personal/tramos`. Sincronización incremental de tramos; param `fchmodificacion` opcional.
- **`freematica_get_personal_tramo_v2`** — `GET /pers/v2/personal/tramos/{idreg}`. Detalle de un tramo v2.
- **`freematica_list_personal_pago`** — `GET /pers/v1/personal_pago`. Datos bancarios del personal.
- **`freematica_get_personal_pago`** — `GET /pers/v1/personal_pago/{idreg}`. Detalle de datos bancarios.
- **`freematica_list_personal_adicionales`** — `GET /pers/v2/personal-adicionales`. Campos adicionales del personal (VSSPERA\_\*).
- **`freematica_list_personal_prorroga`** — `GET /pers/v1/personal-prorroga`. Prórrogas de contratos.
- **`freematica_get_personal_prorroga`** — `GET /pers/v1/personal-prorroga/{idreg}`. Detalle de una prórroga.
- **`freematica_list_incidencias_personal`** — `GET /pers/v2/incidencias`. Incidencias del personal.
- **`freematica_get_agenda_persona`** — `GET /pers/v1/agenda-persona`. Agenda de citas y eventos.
- **`freematica_list_equipamiento_ficha_seguridad`** — `GET /pers/v2/equipamiento-ficha-seguridad`. Equipamiento de fichas de seguridad.
- **`freematica_list_anticipos_personal`** — `GET /pers/v2/personal/anticipos`. Anticipos de nómina.
- **`freematica_get_anticipo_personal`** — `GET /pers/v2/personal/anticipos/{idReg}`. Detalle de un anticipo.
- **`freematica_list_calendario_personal`** — `GET /pers/v2/personal-cal`. Calendario personal (vacaciones, permisos, ausencias).
- **`freematica_get_calendario_personal`** — `GET /pers/v2/personal-cal/{idReg}`. Detalle de una entrada del calendario.
- **`freematica_list_cpd`** — `GET /pers/v1/cpd`. Documentos del empleado (nóminas, comunicaciones…).
- **`freematica_get_cpd`** — `GET /pers/v1/cpd/{idreg}`. Detalle de un CPD.
- **`freematica_list_cpd_movimientos`** — `GET /pers/v1/cpd/{idreg}/movimientos`. Historial de estados de un CPD.
- **`freematica_list_cpd_firmados_vid`** — `GET /pers/v1/cpd/firmados-vid`. CPDs firmados mediante Viafirma (VID).
- **`freematica_list_personal_irpf`** — `GET /pers/v2/personal_irpf`. Datos IRPF del personal.
- **`freematica_get_personal_irpf`** — `GET /pers/v2/personal_irpf/{idreg}`. Detalle de IRPF de una persona.
- **`freematica_list_sesiones_formacion`** — `GET /pers/v1/sesiones-formacion`. Sesiones de formación.
- **`freematica_get_sesion_formacion`** — `GET /pers/v1/sesiones-formacion/{idreg}`. Detalle de una sesión de formación.
- **`freematica_list_vss_incidencias`** — `GET /pers/v2/vss-incidencias`. Incidencias del personal (módulo VSS).
- **`freematica_get_vss_incidencia`** — `GET /pers/v2/vss-incidencias/{idReg}`. Detalle de una incidencia VSS.

#### Added (escritura — 29 tools nuevas, solo con `FREEMATICA_ENABLE_WRITES=true`)

- **`freematica_create_persona`** — `POST /pers/v1/personal`. Alta de persona con campos VSSPER\_\* + camposAdicionales.
- **`freematica_update_persona`** — `PUT /pers/v1/personal/{idReg}`. Actualización parcial de persona (fetch+merge).
- **`freematica_create_personal_identificacion`** — `POST /pers/v1/personal-identificacion/{idreg}`. Alta de datos de identificación.
- **`freematica_create_personal_nota`** — `POST /pers/v2/personal-notas`. Alta de nota (PERNOT\_\*).
- **`freematica_update_personal_nota`** — `PUT /pers/v2/personal-notas/{idReg}`. Actualización de nota (fetch+merge).
- **`freematica_create_personal_experiencia`** — `POST /pers/v2/personal-experiencia`. Alta de experiencia laboral (PEREX\_\*).
- **`freematica_create_personal_formacion`** — `POST /pers/v2/personal-formaciones`. Alta de formación del personal.
- **`freematica_update_personal_formacion`** — `PUT /pers/v2/personal-formaciones/{idReg}`. Actualización de formación.
- **`freematica_create_incidencia_base`** — `POST /pers/v2/incidencias-base`. Alta de incidencia base.
- **`freematica_update_incidencia_base_fecha_fin`** — `PUT /pers/v2/incidencias-base/{idReg}`. Actualización de fecha fin de incidencia base.
- **`freematica_create_personal_pago`** — `POST /pers/v1/personal_pago`. Alta de datos bancarios de persona.
- **`freematica_update_personal_pago`** — `PUT /pers/v1/personal_pago/{idreg}`. Actualización de datos bancarios.
- **`freematica_create_personal_tramo`** — `POST /pers/v1/personal_tramos`. Alta de tramo de horario (PERHH\_\*).
- **`freematica_update_personal_tramo`** — `PUT /pers/v1/personal_tramos/{idreg}`. Actualización de tramo de horario.
- **`freematica_create_personal_contrato`** — `POST /pers/v1/personal_contratos`. Alta de contrato laboral (PERCTRAB\_\*).
- **`freematica_update_personal_contrato`** — `PUT /pers/v1/personal_contratos/{idreg}`. Actualización de contrato laboral.
- **`freematica_create_personal_adicional`** — `POST /pers/v2/personal-adicionales`. Alta de campo adicional (VSSPERA\_\*).
- **`freematica_update_personal_adicional`** — `PUT /pers/v2/personal-adicionales/{idReg}`. Actualización de campo adicional.
- **`freematica_create_anticipo_personal`** — `POST /pers/v2/personal/anticipos`. Alta de anticipo de nómina.
- **`freematica_create_calendario_personal`** — `POST /pers/v2/personal-cal`. Alta de entrada en calendario personal.
- **`freematica_update_calendario_personal`** — `PUT /pers/v2/personal-cal/{idReg}`. Actualización de entrada en calendario.
- **`freematica_update_cpd_bulk`** — `POST /pers/v1/cpd/actualizar`. Actualización masiva de CPDs.
- **`freematica_update_cpd_gestion`** — `PUT /pers/v1/cpd/{idreg}/gestion`. Gestión de estado de un CPD (campos: accionCpd, fechaGestion, noComunicar, documentoCPD, usuarioGestion, obsError, obsRechazado, noVerifEstado).
- **`freematica_create_personal_irpf`** — `POST /pers/v2/personal_irpf`. Alta de datos IRPF.
- **`freematica_update_personal_irpf`** — `PUT /pers/v2/personal_irpf/{idreg}`. Actualización de datos IRPF.
- **`freematica_create_personal_irpf_ad`** — `POST /pers/v2/personal_irpf_ad/{idreg}`. Alta de IRPF ascendientes/descendientes.
- **`freematica_update_personal_irpf_ad`** — `PUT /pers/v2/personal_irpf_ad/{idreg}`. Actualización de IRPF ascendientes/descendientes.
- **`freematica_update_preventor`** — `PUT /pers/v1/control/preventor`. Actualización de estado en Preventor.
- **`freematica_update_preventor_estado`** — `POST /pers/v2/preventor/actualizar-estado`. Actualización de estado Preventor (v2).

#### Not implemented (by design)

- `DELETE /pers/v2/personal/{idreg}` — borrado de persona (fuera de alcance, sin tool de borrado)
- `DELETE /pers/v2/personal-notas/{idReg}` — borrado de nota (fuera de alcance)
- `DELETE /pers/v2/incidencias-base/{idReg}` — borrado de incidencia base (fuera de alcance)
- `DELETE /pers/v1/cpd/eliminar-vid` — borrado VID de CPD (fuera de alcance)
- `GET /pers/v1/cpd/download` — descarga ZIP binaria; no compatible con el protocolo MCP JSON

## [0.10.0] — 2026-08-11

### Vínculos persona↔servicio, habilitaciones CAE, cuadrantes y módulos PVSS de solo lectura

Soporte completo de los módulos de seguridad CAE (Coordinación de Actividades Empresariales): vínculos persona↔servicio y feeds incrementales de habilitaciones (alta/baja de servicios-personal y de licencias del personal). Añadidos también cuadrantes, cómputos de persona, cierres de cuadrante y los módulos PVSS auxiliares (clases de servicio, inspectores, claves de facturación, incidencias, codes de incidencia). 33 tools de solo lectura nuevas.

#### Added

- **`freematica_list_vinculos_personas_servicios`** — `GET /pvss/v2/vinculos-personas-servicios`. Lista paginada de vínculos persona↔servicio. Permite resolver la relación centro/servicio → trabajador, clave para la integración CAE.
- **`freematica_get_vinculo_persona_servicio`** — `GET /pvss/v2/vinculos-personas-servicios/{idreg}`. Detalle de un vínculo persona-servicio.
- **`freematica_list_habilitaciones_servicios_alta`** — `GET /peqv/v2/habilitaciones/servicios/alta`. Feed incremental de altas de servicios-personal en el módulo de habilitaciones CAE. Soporta param `desde` (YYYY-MM-DD) para sincronización incremental.
- **`freematica_list_habilitaciones_servicios_baja`** — `GET /peqv/v2/habilitaciones/servicios/baja`. Feed incremental de bajas de servicios-personal.
- **`freematica_list_habilitaciones_personal_alta`** — `GET /peqv/v2/habilitaciones/personal/alta`. Feed incremental de altas de licencias del personal.
- **`freematica_list_habilitaciones_personal_baja`** — `GET /peqv/v2/habilitaciones/personal/baja`. Feed incremental de bajas de licencias del personal.
- **`freematica_list_cuadrantes`** — `GET /pvss/v1/cuadrantes`. Lista paginada de cuadrantes.
- **`freematica_list_cuadrantes_detalles`** — `GET /pvss/v1/cuadrantes-detalles`. Detalles de cuadrantes.
- **`freematica_list_cuadrantes_observaciones`** — `GET /pvss/v1/cuadrantes-observaciones`. Observaciones de cuadrantes.
- **`freematica_list_cuadrantes_auditoria`** — `GET /pvss/v1/cuadrantes-auditoria`. Feed de auditoría de cuadrantes (nuevos/modificados/eliminados). Soporta param `desde` para sincronización incremental.
- **`freematica_list_cuadrantes_tareas`** — `GET /pvss/v2/cuadrantes-tareas`. Tareas de cuadrantes.
- **`freematica_list_computos_pers`** — `GET /pvss/v2/computos-pers`. Lista paginada de cómputos de personas; enlazan persona↔contrato↔servicio (campos `CONFCP_*`).
- **`freematica_get_computos_pers`** — `GET /pvss/v2/computos-pers/{idReg}`. Detalle de un cómputo de persona.
- **`freematica_get_computos_pers_h`** — `GET /pvss/v2/computos-pers-h/{idReg}`. Detalle de cómputo con histórico (campos `CONFCPH_PERS`, `CONFCPH_H_CTRT`, `CONFCPH_H_SERV`).
- **`freematica_list_cuadrantes_cierre_personas`** — `GET /pvss/v1/cuadrantes-cierre-personas`. Lista de cierres de cuadrante por persona.
- **`freematica_get_cuadrante_cierre_persona`** — `GET /pvss/v1/cuadrantes-cierre-personas/{idreg}`. Detalle.
- **`freematica_list_cuadrantes_cierre_personas_complementos`** — `GET /pvss/v1/cuadrantes-cierre-personas-complementos`. Lista de complementos de cierre.
- **`freematica_get_cuadrante_cierre_persona_complemento`** — `GET /pvss/v1/cuadrantes-cierre-personas-complementos/{idreg}`. Detalle.
- **`freematica_list_cuadrantes_cierre_personas_especiales`** — `GET /pvss/v1/cuadrantes-cierre-personas-especiales`. Lista de especiales de cierre.
- **`freematica_get_cuadrante_cierre_persona_especial`** — `GET /pvss/v1/cuadrantes-cierre-personas-especiales/{idreg}`. Detalle.
- **`freematica_list_cuadrantes_cierre_personas_incidencias`** — `GET /pvss/v1/cuadrantes-cierre-personas-incidencias`. Lista de incidencias de cierre.
- **`freematica_get_cuadrante_cierre_persona_incidencia`** — `GET /pvss/v1/cuadrantes-cierre-personas-incidencias/{idreg}`. Detalle.
- **`freematica_list_contratos_servicios_global`** — `GET /pvss/v1/contratos-servicios`. Lista global de servicios de todos los contratos (sin filtro por contrato; diferente de `freematica_list_servicios_contrato` que requiere un `idContrato` específico).
- **`freematica_list_contratos_turnos`** — `GET /pvss/v1/contratos-turnos`. Turnos de contratos.
- **`freematica_list_contratos_horarios_operativa`** — `GET /pvss/v1/contratos-horarios-operativa`. Horarios de operativa.
- **`freematica_list_clases_servicios`** — `GET /pvss/v1/clases-servicios`. Catálogo de clases de servicio.
- **`freematica_list_inspectores`** — `GET /pvss/v1/inspectores`. Lista de inspectores.
- **`freematica_get_inspector_empresa`** — `GET /pvss/v1/inspector-empresa`. Inspector de empresa.
- **`freematica_list_claves_facturacion`** — `GET /pvss/v2/claves-facturacion`. Claves de facturación.
- **`freematica_list_incidencias_servicios`** — `GET /pvss/v2/incidencias-servicios`. Lista paginada de incidencias en servicios.
- **`freematica_get_incidencia_servicio`** — `GET /pvss/v2/incidencias-servicios/{idReg}`. Detalle de una incidencia.
- **`freematica_list_incidencecode`** — `GET /pvss/v2/incidencecode`. Catálogo de códigos de incidencia (v2; v1 también disponible en el API pero se usa v2 como canónico).
- **`freematica_get_contratos_servicios_material`** — `GET /pvss/v2/contratos-servicios-material/{idreg}`. Detalle de material asignado a un servicio de contrato por idReg (la lista global ya existía como `freematica_list_materiales_asignados_servicios`).

## [0.9.0] — 2026-07-10

### Catálogo de artículos + reparación integral de los filtros FIQL de lectura

Origen: dos issues reportados por usuarios finales — `freematica_list_personal` devolvía 400 sistemático y no existía forma de consultar el catálogo de materiales para ofertas de consumibles. La investigación destapó además que la mayoría de filtros FIQL del conector estaban rotos o eran silenciosamente ignorados por el API. Todos los cambios están verificados contra el API real de producción (38 comprobaciones de smoke test con datos reales).

#### Added

- **`freematica_list_articulos`** — `GET /part/v1/articulos`. Catálogo completo de artículos/materiales/consumibles (6.304 referencias en producción) con paginación y filtros exactos: `codArticulo`, `tipoCodigo`, `codProveedor`, `linea`, `familia`, `subfamilia`, `descripcion`, `codigoBarras` y `activo` (mapea a `MOTIVO_BAJA` vacío/no vacío — las columnas de fecha no permiten comparar con vacío).
- **`freematica_get_articulo`** — `GET /part/v1/articulos/{idreg}`. El API devuelve un envelope de lista con un único item; la tool lo desenvuelve.
- **`freematica_get_precio_articulo`** — `GET /pgrl/v1/precio-articulo/{idreg}`. Devuelve `PRECIO_VENTA`, `DESCUENTO` y `FACTURABLE`.

#### Fixed

- **`freematica_list_personal` devolvía 400 SIEMPRE**: `/pers/v2/personal` es un endpoint de sincronización incremental que exige el parámetro `fchmodificacion` (400 "Parámetro [fchmodificacion] obligatorio") y además devuelve un subconjunto del dataset (3.984 vs 5.482 personas). Se cambia a **`/pers/v1/personal`** (dataset completo, con `idReg`), mismo precedente que el catálogo `delegaciones` en v0.6.x. Se elimina el filtro `activo` (la columna `VSSPER_ACTIVO` no existe en v1) y se documentan todos los filtros como coincidencia exacta (el endpoint no soporta `=lk=` ni wildcards).
- **Quoting global de valores FIQL** (`fiql-builder`): el API exige comillas simples en los valores (`CAMPO=='valor'`). Sin ellas, las columnas de texto responden 400 "Error al ejecutar sentencia" (cuentas `COD_PLAN`, proveedores `NOMBRE_PRO`, personal) y **las columnas de fecha ignoran el filtro silenciosamente devolviendo el dataset completo** (cartera `CARCL_FECDOC=ge=…` devolvía 72.054 docs en vez de 16.165). El quoting se acepta también en columnas numéricas (verificado en todos los endpoints FIQL). El espacio deja de percent-encodearse dentro de valores: escapado rompía el match por doble encoding (`VSSPER_NOM=='ELIZABETH SUSANA'` funciona tal cual).
- **`freematica_list_facturas_cabecera`: TODOS los filtros respondían 500** por usar nombres de columna inexistentes. Mapeo corregido contra la vista real: `FVC_EMP→FVC_CODEMP`, `FVC_CODAUX→FVC_CODCLI`, `FVC_CODREP→FVC_CODREPRES`, `FVC_SERFAC→FVC_SERIEFRA`, `FVC_NUMFAC→FVC_NUMFRA`, `FVC_CODFPAG→FVC_FPAGO`, `FVC_FECFAC→FVC_FCHFAC`, `FVC_TRSCONT (S/N)→FVC_TRASP_CONTAB (1/0)`.
- **Subrecursos de factura con columnas inexistentes**: líneas `FVL_CODART→FVL_CODARTIC`, `FVL_CODFAM→FVL_COD_FAMILIA`, `FVL_CODSFAM→FVL_COD_SUBFAM`; IVA `FVI_TIPIVA→FVI_TIPO_IVA`; vencimientos `FVV_CODMPAG→FVV_MODOPAGO`, `FVV_FECVCTO→FVV_FCH_VTO`.
- **`freematica_list_proveedores`**: el filtro `nombre` usaba `=lk=` (400 en el API real) — pasa a coincidencia exacta quoted. El filtro `activo` usaba el centinela `null` (devolvía 0 resultados): `activo=false` pasa a `FECHA_BAJA=ge='1900-01-01'` (7 bajas de 898 en producción); `activo=true` se resuelve post-filtrando la página en cliente (el FIQL de Freemática no tiene IS NULL: `==null` → 0 resultados, `=='null'` → 500).
- **`freematica_list_cartera_clientes`**: `soloImpagados` usaba `CARCL_FECIMPAG!=null` (0 resultados) — pasa a `CARCL_FECIMPAG=ge='1900-01-01'` (382 impagados reales de 72.054 documentos).
- **`freematica_list_localizaciones_servicio_clientes`**: se elimina el filtro `activo` — la vista no tiene columna `FECHA_BAJA` y filtrar por ella responde 400.

- **`freematica_list_vigilancia_salud`: todos sus filtros FIQL eran placebo** — el endpoint ignora el parámetro `rquery` por completo (cualquier FIQL, incluso con campos inexistentes, responde 200 con el dataset íntegro sin filtrar). Se eliminan los 7 filtros FIQL (empresa, delegación, codPersona, tipoRevision, resultado, fechaCita desde/hasta) y queda `idRegPersona` (query param nativo, verificado: filtra correctamente por persona).
- **`freematica_list_localizaciones_factura_clientes` devolvía 404 SIEMPRE** (desde v0.8.0): la lista solo existe en `/pgrl/v1/...` — el v2 de ese recurso es solo POST/PUT. Se cambia el endpoint a v1 (291 localizaciones en producción; filtro por COD_CLI verificado).
- **Fecha-hasta rota en facturas-cabecera, cartera y export-asientos**: el operador `=le=` responde 400/500 en esos endpoints (en compras, vencimientos y artículos funciona). Se emula con `=lt=` del día siguiente (verificado). Además, **combinar fecha-desde y fecha-hasta sobre el mismo campo devuelve 0 filas** (bug del API, probado con paréntesis, orden inverso y rquery duplicado): esas tools ahora rechazan la combinación con un error claro en vez de devolver un resultado vacío engañoso.
- **`fechaVencimientoHasta` de cartera eliminado**: el API ignora `=le=`/`=lt=` sobre CARCL_FECVCTO devolviendo el dataset completo (`=ge=` sí funciona y se mantiene como fechaVencimientoDesde).

#### Changed

- `server-instructions.ts`: nuevas secciones Artículos y Personal; aviso de que `freematica_list_materiales_asignados_servicios` es material ya asignado (para el catálogo usar `freematica_list_articulos`); documentado que la composición OR (`,`) de FIQL responde 400 (usar `=in=`).

**Total tools registradas: 56 read-only (72 con escrituras)** (vs 53/69 en v0.8.0).
**Tests: 818** (vs 807 en v0.8.0).

## [0.8.0] — 2026-07-03

### Escritura de clientes, contactos y localizaciones de cliente (create/update, sin delete)

#### Added

**Escritura (6 tools, solo con `FREEMATICA_ENABLE_WRITES=true`):**

- **`freematica_create_cliente`** / **`freematica_update_cliente`** — `POST/PUT /pgrl/v2/clientes`. El alta calcula el `idReg` requerido (Base64 "GRUPO\_\_COD"); el update es parcial: recupera el cliente actual, aplica los cambios y envía el objeto completo (fetch+merge).
- **`freematica_create_contacto_cliente`** / **`freematica_update_contacto_cliente`** — `POST/PUT /pgrl/v2/contactos-clientes`. El update hace fetch+merge usando el GET singular v1 (mismas columnas CC\_\*).
- **`freematica_create_localizacion_cliente`** / **`freematica_update_localizacion_cliente`** — una pareja de tools genérica con parámetro `tipo` (cobro | envio | factura | servicio) que cubre los 4 endpoints `POST/PUT /pgrl/v2/localizaciones-{tipo}-clientes`. Valida por tipo: `formaPago` obligatorio en cobro, `nombre` obligatorio salvo en envío. El update de factura usa el GET singular v1 (no existe en v2).

**Lectura (2 tools):**

- **`freematica_list_localizaciones_envio_clientes`** / **`freematica_list_localizaciones_factura_clientes`** — completan los listados de localizaciones (necesarios para obtener el `idReg` en los updates).

**Infraestructura:**

- Builders con nombres amigables + passthrough `camposAdicionales` (VoClientes tiene 109 columnas) en `src/schemas/clientes.ts` y `src/schemas/localizaciones.ts` (tabla `LOC_FIELD_MAP` con el mapeo de columnas por tipo).
- `mergeForUpdate()`: patrón fetch+merge para updates parciales, eliminando metadatos de presentación (RowNumber, \_id, \_cellSettings) antes del PUT. El estado previo queda en el log de auditoría (debug).
- `RegisterOptions` movido a `src/tools/helpers.ts` (compartido por todos los grupos con escritura).

**Total tools registradas: 53 read-only (69 con escrituras)** (vs 51/61 en v0.7.0).
**Tests: 807** (vs 764 en v0.7.0).

## [0.7.0] — 2026-07-02

### Contratos y Servicios: lectura + escritura (create/update, sin delete)

Primera incorporación de operaciones de escritura al MCP. El grupo Contratos (módulos `pvss` y `ppre`) pasa de 1 tool a 17.

#### Added

**Lectura (6 tools, siempre registradas):**

- **`freematica_list_contratos`** — cabeceras de contratos desde `GET /pvss/v1/contratos`. Solo filtros nativos empresa/delegación: verificado empíricamente que el API ignora `rQuery` (FIQL) en este endpoint.
- **`freematica_get_contrato`** — búsqueda por códigos naturales (empresa + codContrato) con paginación interna y filtrado en cliente (no existe endpoint singular).
- **`freematica_list_servicios_contrato`** / **`freematica_get_servicio_contrato`** — servicios de un contrato (`GET /pvss/v1/contratos/{id}/servicios`, `GET /pvss/v2/contratos-servicios/{idreg}`).
- **`freematica_list_contratos_opcionales`** / **`freematica_get_contrato_opcionales`** — opcionales de contratos (`GET /ppre/v2/contratos/opcionales`).

**Escritura (10 tools, solo con `FREEMATICA_ENABLE_WRITES=true`; no se implementa borrado):**

- **`freematica_create_contrato`** / **`freematica_update_contrato`** — `POST/PUT /pvss/v2/contratos`.
- **`freematica_create_servicio_contrato`** — `POST /pvss/v2/contratos/{idReg}/servicios`. Los campos requeridos (CTRTS_EMP/DELEG/CTRT) se derivan automáticamente del idReg del contrato.
- **`freematica_update_servicio_fechas`** — `PUT /pvss/v2/contratos/{id}/servicio/{id}` (solo fechas inicio/fin; es el mecanismo de baja de servicios).
- **`freematica_create_servicio_historico_precios`** / **`freematica_update_servicio_historico_precios`** — histórico versionado de precios del servicio.
- **`freematica_create_servicio_facturacion_txt`** — líneas de texto de facturación.
- **`freematica_update_servicio_facturacion`** — datos de facturación; campos comunes con nombre amigable y resto vía `camposAdicionales` (CTRTF\_\*).
- **`freematica_create_contrato_opcionales`** / **`freematica_update_contrato_opcionales`** — `POST/PUT /ppre/v2/contratos/opcionales`.

**Infraestructura:**

- Nueva variable `FREEMATICA_ENABLE_WRITES` (default `false`): el servidor sigue siendo de solo lectura salvo activación explícita. Las tools de escritura no se registran sin ella.
- Helper `src/utils/idreg.ts` para decodificar los idReg opacos (`Base64("EMP__DELEG__COD")` contratos, 4 partes servicios).
- Log de auditoría en todas las escrituras: operación + endpoint + campos (info) y body completo (debug).
- Anotaciones MCP: creates con `destructiveHint: false`, updates con `destructiveHint: true` e `idempotentHint: true`.
- `src/tools/contratos.ts` dividido en `src/tools/contratos/{cabecera,servicios,opcionales,materiales}.ts` al superar el umbral de ~15 tools.

**Total tools registradas: 51 read-only (61 con escrituras)** (vs 45 en v0.6.4).
**Tests: 764** (vs 720 en v0.6.x).

## [0.6.4] — 2026-06-28

### Branding y descubribilidad (npm/README)

- `package.json`: descripción enriquecida, `homepage` y `author.url` apuntando a [nubiia.es](https://nubiia.es), y `keywords` ampliadas (erp, invoicing, facturación, accounting, cartera, claude, anthropic, ai, llm, automation) para mejorar la descubribilidad en npm.
- README: badges (npm, license, by Nubiia), tagline con CTA y secciones **About Nubiia**, **Author** y **Links**.
- Sin cambios funcionales en las tools.

## [0.6.3] — 2026-06-28

### Actualización de dependencias mayores

- `zod` 3 → 4 (runtime). Migrado `ZodError.errors` → `ZodError.issues`. Compatible con `@modelcontextprotocol/sdk` (acepta `zod ^3.25 || ^4.0`).
- `nock` 13 → 14 (dev). Migrados los `replyWithError` de objeto plano a `Error` real (requisito de nock 14).
- `eslint` 9 → 10 (dev) y `@types/node` 20 → 26 (dev), sin cambios de código necesarios.
- GitHub Actions: `actions/checkout` 4→7, `actions/setup-node` 4→6, `github/codeql-action` 3→4, `@typescript-eslint/parser` 8.59→8.62.

## [0.6.2] — 2026-06-28

### Hardening de seguridad

- Versión del servidor leída dinámicamente de `package.json` (handshake MCP, `/health`, logs de arranque); elimina versiones hardcodeadas desincronizadas (`/health` devolvía `0.4.1`).
- Aviso en el log al arrancar en transporte HTTP si `MCP_ALLOWED_ORIGINS="*"`.
- Rate limiting aplicado también al endpoint `/health` (antes solo `/mcp`).
- Nueva sección **Seguridad** en el README: el endpoint `/mcp` no autentica al cliente y debe desplegarse tras un gateway con autenticación, restringiendo los orígenes permitidos.

## [0.6.1] — 2026-06-28

### Rebrand y publicación pública

- Paquete renombrado de `@serlimar/mcp-freematica` a `@nubiia/mcp-freematica`.
- Repositorio movido a `nubiia-dev/mcp-freematica` y publicado como open source.
- Publicación migrada de GitHub Packages (restricted) al registry público de npm (`--access public`).
- Eliminadas las referencias internas a Serlimar; el servidor es ahora una API genérica para cualquier consumidor del API REST de Freemática.

## [0.6.0] — 2026-06-12

### Release de la épica TD-153 — Cierre del ciclo de facturación

Cierra el ciclo de lectura financiera del MCP añadiendo facturación electrónica (Facturae/EDICOM/FACe) y albaranes (ventas + factura-albarán + resultados de facturación de vigilancia). Tras esta release el flujo cubierto es: **pedido → albarán → factura interna → factura electrónica → cartera/cobro**.

- **TD-154** Facturas electrónicas: 6 tools (list, get, documento, log, edicom-info, download). Guardrail de tamaño para documentos PDF/XML grandes (Facturae base64).
- **TD-155** Albaranes + resultados facturación: 5 tools (albaranes-ventas list+get, albaranes-facturas list+get, resultados facturación vigilancia).

**Total tools registradas: 45** (vs 34 en v0.5.1).
**Tests: 720** (vs 648 en v0.5.1).

---

## [Unreleased] — TD-155 (branch feat/TD-155-albaranes)

### Tools albaranes ventas + albaranes-facturas + resultados facturación vigilancia

#### Added

- **`freematica_list_albaranes_ventas`** (`src/tools/albaranes.ts`): lista paginada de albaranes de ventas desde `GET /pven/v2/albaranes-ventas`.
  - Todos los filtros son query params **nativos** del endpoint (no FIQL): `empresa` → `codEmpresa` (requerido), `delegacion` → `codDelegacion`, `codCliente`, `codDocumento`, `fechaDesde` → `desdeFecha`, `fechaHasta` → `hastaFecha`, `order`.
  - Campos de respuesta: prefijo `ALVC_*` (cabecera) y `ALVL_*` (líneas).

- **`freematica_get_albaran_venta`** (`src/tools/albaranes.ts`): detalle de un albarán de venta por `idReg` opaco. Endpoint: `GET /pven/v2/albaranes-ventas/{idReg}`.

- **`freematica_list_albaranes_factura`** (`src/tools/albaranes.ts`): lista paginada de vinculaciones albarán↔factura desde `GET /pven/v2/albaranes-facturas`.
  - Filtro `idReg` como query param nativo.
  - Filtros FIQL: `empresa` (FVCA_CODEMP), `serie` (FVCA_SERIEFRA), `numFactura` (FVCA_NUMFRA), `codCliente` (FVCA_CODCLI).

- **`freematica_get_albaran_factura`** (`src/tools/albaranes.ts`): detalle de una vinculación albarán-factura por `idReg` opaco. Endpoint: `GET /pven/v2/albaranes-facturas/{idReg}`.

- **`freematica_list_resultados_facturacion`** (`src/tools/albaranes.ts`): lista paginada de resultados del proceso batch de facturación automática de vigilancia desde `GET /pvss/v1/facturacion-resultados`.
  - Todos los filtros se envían como FIQL en `rquery`: `empresa` (FACT_EMP), `delegacion` (FACT_DELEG), `codCliente` (FACT_COD_CLI), `calendario` (FACT_CAL), `mes` (FACT_MES), `contrato` (FACT_CTRT), `servicio` (FACT_SERV), `tipoFac` (FACT_TIPFAC), `traspasado` (FACT_TRASP).
  - Param `order` es nativo del endpoint.

- **`src/schemas/albaranes.ts`**: `ListAlbaranesVentasFiltersSchema`, `ListAlbaranesFacturaFiltersSchema`, `ListResultadosFacturacionFiltersSchema` con tipos exportados para las 3 familias. Decisión de unificar en un archivo al ser 3 dominios relacionados del ciclo albarán→factura.

- **`FreematicaClient`** (`src/clients/freematica-client.ts`): métodos `listAlbaranesVentas`, `getAlbaranVenta`, `listAlbaranesFactura`, `getAlbaranFactura`, `listResultadosFacturacion`.

#### Tests

- `tests/tools/albaranes.test.ts`: 27 tests (registro, happy paths con filtros nativos y FIQL, errores 404/500/401 para las 5 tools).
- `tests/server.test.ts`: actualizado de 34 → 39 tools registradas.
- **Total: 675 tests, todos en verde**.

#### Coverage

- `src/schemas/albaranes.ts`: 100% statements, 100% branches
- `src/tools/albaranes.ts`: 100% statements, 61.53% branches (consistente con el resto de tools)
- Global statements: 99.55%

**Total tools registradas:** 39 (vs 34 en v0.5.1).

---

## [0.5.1] — 2026-06-09

### Added — Tools de facturas electrónicas (TD-154)

- `freematica_list_facturas_electronicas` — list facturas Facturae/EDICOM via `GET /pven/v1/facturas`
- `freematica_get_factura_electronica` — detalle por idReg
- `freematica_get_factura_documento` — devuelve VoFacturasDocumento (JSON, no binario). Aplica truncate si excede `FREEMATICA_MAX_RESPONSE_SIZE_MB`
- `freematica_get_factura_log` — log de eventos (auditoría)
- `freematica_get_edicom_info` — estado integración EDICOM (contiene credenciales — usar con precaución)
- `freematica_list_facturas_documentos` — descarga masiva con guardrail de tamaño

Tests: 42 nuevos. Coverage `src/tools/facturas-electronicas.ts`: 99.61% stmts.

---

### Tools de pedidos de compra (TD-152)

#### Added

- **`freematica_list_pedidos_compra`** (`src/tools/pedidos-compras.ts`): lista paginada de pedidos de compra desde `GET /pcmp/v2/pedidos`.
  - Parámetros nativos: `empresa` (codEmpresa), `codProveedor`, `fechaPedidoDesde` (desdeFecha), `fechaPedidoHasta` (hastaFecha).
  - Filtros FIQL: `numPedido` (ALCC_NUMDOC), `codDocumento` (ALCC_CODDOC), `delegacion` (ALCC_DELEG), `formaPago` (ALCC_FPAGO), `tipoIva` (ALCC_TIPO_IVA), `codCliente` (ALCC_COD_CLIENTE), `codInstalador` (ALCC_COD_INSTALADOR), `codMantenedor` (ALCC_COD_MANTENEDOR), `referencia` (ALCC_REFERENCIA), `rango fechaEntregaDesde/Hasta` (ALCC_FCHENTREGA).
  - Filtro `estado`: enum `pendiente | bloqueado | recibido` mapeado a FIQL compuesto sobre `ALCC_PED_BLOQ` y `ALCC_PED_RECIB` usando la convención empírica `''` (empty string) como centinela de null.

- **`freematica_get_pedido_compra`** (`src/tools/pedidos-compras.ts`): detalle de un pedido por `idReg` opaco. Devuelve estructura compuesta `{ VoPedidosCompraCab, cabecera_proveedor, lineas[] }`. Endpoint: `GET /pcmp/v2/pedidos/{idReg}`.

- **`src/schemas/pedidos-compras.ts`**: `EstadoPedidoEnum`, `buildEstadoPedidoFiql()` y `ListPedidosCompraFiltersSchema` con constraints tipados (empresa=4 chars exactos, delegacion=4, formaPago=3, tipoIva=4).

- **`FreematicaClient`** (`src/clients/freematica-client.ts`): métodos `listPedidosCompra(opts)` y `getPedidoCompra(idReg)`.

#### Tests

- `tests/tools/pedidos-compras.test.ts`: 31 tests (registro, happy path con todos los filtros nativos y FIQL, estado enum, errores 404/500/401).
- `tests/clients/freematica-client.test.ts`: +17 tests de los 2 métodos nuevos del cliente.
- `tests/coverage-gaps.test.ts`: +4 tests de ramas `catch (err instanceof Error)` de ambas tools.
- **Total: 648 tests, todos en verde**.

#### Coverage

- `src/schemas/pedidos-compras.ts`: 100% statements, 100% branches
- `src/tools/pedidos-compras.ts`: 100% statements, 84.61% branches
- `src/tools/**`: 71.28% branches (umbral mínimo: 70%)

**Total tools registradas:** 34 (vs 32 en v0.5.0).

---

## [0.5.0] — 2026-06-10

### Release de la épica TD-116 — Ampliación dominio financiero/PRL + hardening

Promueve `0.5.0-rc.2` a versión estable tras integrar las 8 stories de la épica TD-116:

- **TD-117** Foundation: FIQL builder + HardenedBaseClient (timeout, retry+backoff, circuit breaker, 429 honor Retry-After) + logging estructurado pino con sanitización de credenciales.
- **TD-118** Tools de cartera clientes + facturas de ventas (7 tools).
- **TD-119** Tools de facturas de compras + proveedores + localizaciones (7 tools). Incluye fix funcional crítico: `FCC_FCHFAC_HASTA` reemplazado por composición AND con el campo real `FCC_FCHFAC`.
- **TD-120** Tools de contabilidad (cuentas, cuentas analíticas, export-asientos con protección de tamaño 10MB).
- **TD-121** Tools de PRL + personal + calendarios (7 tools).
- **TD-122** 6 nuevos catálogos en master-data (18 → 24).
- **TD-123** Coverage global 99.4% (clients 98.12%, schemas 99.68%, tools 100%). Property-based tests del FIQL builder. 595 tests totales.
- **TD-124** Documentación completa (README ampliado, 3 ADRs, examples ejecutables) + CI/CD hardening (GitHub Actions, Dependabot, CodeQL) + pre-commit husky/lint-staged + Dockerfile production-ready + TypeScript strict flags (`noImplicitOverride`, `noFallthroughCasesInSwitch`).

**Total tools registradas:** 25 (vs 8 en v0.4.1).

---

## [0.5.0-rc.2] — 2026-06-09

### Testing gap + property-based tests + coverage (TD-123)

#### Tests añadidos

- `tests/pagination-edge-cases.test.ts`: edge cases del adapter de paginación (página vacía, total=0, items=null, page más allá del último).
- `tests/coverage-gaps.test.ts`: tests para los métodos `post`, `put`, `delete` del `BaseClient` y para las ramas `catch (err instanceof Error)` genéricas de todas las tools.
- `tests/fiql-builder.property.test.ts`: properties adicionales — idempotencia de escape, presencia literal de keys, separadores AND/OR en composiciones, operadores en output, safety con inputs maliciosos, manejo de `in` con array vacío.
- `docs/testing-e2e.md`: documentación manual para verificación con MCP Inspector.

#### Coverage

- Global statements: **99.4%** (antes 95.36%)
- `src/clients/`: **98.12%** statements / 87.76% branch
- `src/schemas/`: **99.68%** statements / 100% branch
- `src/tools/`: **100%** statements / 70.37% branch

#### Total tests

- **595** tests (antes 548), todos en verde.

#### Limpieza

- Eliminados marcadores residuales de conflict en `CHANGELOG.md` provenientes de merges anteriores de la épica TD-116.

---

### Fixes post code-review (TD-121)

#### Fixed

- **Tests fecha range `fechaCitaDesde/Hasta`** (`tests/clients/freematica-client.test.ts`, `tests/tools/prl.test.ts`): añadidos 3 tests de client-level y 1 test tool-level verificando que `listVigilanciaSalud` genera correctamente `PERVS_FCH_CITA=ge=`, `PERVS_FCH_CITA=le=` y la combinación `ge+le;` al pasar `fechaCitaDesde`, `fechaCitaHasta` o ambos.

- **Version mismatch**: `package.json`, `src/server.ts` y `src/index.ts` alineados a `0.5.0-rc.2`.

- **README tools table**: añadidas 7 filas para las tools de PRL, Personal y Calendarios introducidas en TD-121 (`freematica_get_ficha_prev_cliente`, `freematica_list_vigilancia_salud`, `freematica_get_vigilancia_salud`, `freematica_list_personal`, `freematica_get_persona`, `freematica_list_calendarios`, `freematica_list_calendario_periodos`).

#### Tests summary (post-fix)

- Tests nuevos: +4 (3 client-level + 1 tool-level fecha range)
- Total: 303 tests, todos en verde

### Fixed — Post code-review (TD-120)

- **Version mismatch** (`package.json`, `src/server.ts`, `src/index.ts`): alineadas las tres referencias de versión a `0.5.0-rc.2`. El log de stdio también actualizado de `v0.4.1` a `v0.5.0-rc.2`.

- **`loadMaxResponseSizeMb()` no respetaba validación Zod** (`src/clients/freematica-client.ts`): la función leía `FREEMATICA_MAX_RESPONSE_SIZE_MB` sin aplicar las restricciones `min(1).max(500).int()` del schema en `config.ts`. Añadidos bounds check (`< 1 || > 500`) y validación `Number.isInteger()`. Valores fuera de rango devuelven el default de 10 MB.

- **Asunción `borrador` FIQL sin documentar** (`src/clients/freematica-client.ts`): añadido JSDoc prominente en el bloque `if (opts.borrador !== undefined)` explicando que `ASI_BORR != ''` / `ASI_BORR == ''` es la convención empíricamente observada para campos nullable en Freemática FIQL, no verificada contra la API real. Añadido TODO para verificación futura.

- **Respuesta truncada no incluía campo `total`** (`src/tools/contabilidad.ts`): el payload del branch truncado omitía `total`, impidiendo que el cliente supiera cuántos registros existen en la API. Añadido `total: result.total` al payload. Nuevo test `respuesta truncada incluye campo total con el total real de la API` verifica el comportamiento.

---

## [0.5.0] — 2026-06-09

### PRL + Personal + Calendarios (TD-121)

#### Added

- **PRL tools** (`src/tools/prl.ts`): 3 nuevas tools de Prevención de Riesgos Laborales.
  - `freematica_get_ficha_prev_cliente` — ficha PRL de un cliente. Filtros nativos (NO FIQL): codCliente, grupoCliente, codLocalizacionServicio, codigoFicha. Validación `.refine()` interna exige al menos un identificador para evitar devolver el dataset completo.
  - `freematica_list_vigilancia_salud` — lista paginada de registros VS con filtros FIQL (empresa, delegación, codPersona, tipoRevision, resultado, rango fechaCita) e idRegPersona como query param nativo.
  - `freematica_get_vigilancia_salud` — detalle por idReg opaco.

- **Personal tools** (`src/tools/personal.ts`): 2 nuevas tools de RRHH.
  - `freematica_list_personal` — lista paginada con filtros FIQL: empresa, delegación, codPersona, nombre (parcial), apellido (parcial), NIF, situación, departamento, sección, activo (boolean → `VSSPER_ACTIVO==S/N`).
  - `freematica_get_persona` — detalle por idReg opaco.

- **Calendarios tools** (`src/tools/calendarios.ts`): 2 nuevas tools de calendarios laborales.
  - `freematica_list_calendarios` — lista paginada de calendarios.
  - `freematica_list_calendario_periodos` — periodos de un calendario concreto (path param idCalendario + paginación).

- **FreematicaClient** (`src/clients/freematica-client.ts`): 7 nuevos métodos:
  `getFichaPrevCliente`, `listVigilanciaSalud`, `getVigilanciaSalud`,
  `listPersonal`, `getPersona`, `listCalendarios`, `listCalendarioPeriodos`.

- **Tests** (`tests/tools/prl.test.ts`, `tests/tools/personal.test.ts`, `tests/tools/calendarios.test.ts`): suites completas con nock — happy path + 4xx/5xx por tool. Test específico del `.refine()` de `FichaPrevClienteRefinedSchema` (8 casos).

- **Tests cliente** (`tests/clients/freematica-client.test.ts`): 25 nuevos tests de los 7 métodos nuevos del cliente.

- **server.ts**: versión bumped a `0.5.0`, se registran los 3 grupos nuevos de tools (15 tools totales).

#### Tests summary

- Total: 299 tests, todos en verde
- Coverage de archivos nuevos: 100% statements/lines

### Added — Contabilidad (TD-120)

#### Tools nuevas

- **`freematica_list_cuentas_contables`** (`src/tools/contabilidad.ts`): lista el plan de cuentas contables desde `GET /pcon/v2/cuentas`. Soporta filtros FIQL: `codPlan` (COD_PLAN), `prefijoCuenta` (prefix match léxico sobre COD_CTA usando `=ge=`/`=lt=`), `activa` (CTA_ACTIVA==1 o ==0), `grupoCuenta` (COD_GRUPO_CTA).

- **`freematica_list_cuentas_analiticas`** (`src/tools/contabilidad.ts`): lista el catálogo de cuentas analíticas desde `GET /pcon/v2/cuentas-analiticas`. Filtros FIQL: `codPlan`, `prefijoCuenta` (sobre COD_CTA_ANL), `activa` (CTA_ACTIVA_ANL), `grupoCuenta` (COD_GRUPO_ANL), `area` (AREA_ANL), `delegacion` (DELEG).

- **`freematica_export_asientos`** (`src/tools/contabilidad.ts`): exporta asientos contables en batch desde `GET /pcon/v2/export-asientos`.
  - Parámetros nativos obligatorios: `empresa` (4 chars exactos), `cal` (4 chars exactos).
  - Parámetro nativo opcional: `periodo` (max 2 chars).
  - Filtros FIQL: `fechaDesde`/`fechaHasta` (sobre ASI_FCHASI), `diario` (ASI_DIARIO), `borrador` (ASI_BORR).
  - **Protección de tamaño**: si la respuesta JSON supera `FREEMATICA_MAX_RESPONSE_SIZE_MB` (default 10 MB), los items se truncan con búsqueda binaria y se añade `warning` a la respuesta. Se loguea `warn` con metadatos.
  - Description advierte explícitamente de usar rangos de fecha cortos.

#### Nuevos métodos en FreematicaClient

- `listCuentasContables(opts)` → `GET /pcon/v2/cuentas`
- `listCuentasAnaliticas(opts)` → `GET /pcon/v2/cuentas-analiticas`
- `exportAsientos(opts)` → `GET /pcon/v2/export-asientos` con validación de tamaño y truncado

#### Nueva variable de entorno

- **`FREEMATICA_MAX_RESPONSE_SIZE_MB`** (default: 10, min: 1, max: 500): límite de tamaño de respuesta para `freematica_export_asientos`. Si se supera, los datos se truncan con warning en lugar de error. Documentada en `src/config.ts` y README.

#### Tests

- `tests/tools/contabilidad.test.ts`: 36 tests (happy path, filtros FIQL, Zod schema, truncado, 500s).
- `tests/clients/contabilidad-client.test.ts`: 30 tests (client methods, filtros, edge cases, truncado por env var).
- Cobertura de `src/tools/contabilidad.ts`: 100% statements/lines/functions.
- Cobertura de `src/clients/freematica-client.ts`: 99.44%.
- Total tests: 298 (todos en verde).

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

### Master-data verification + new catalogs (TD-122)

#### Verified

- **`lineas-negocio`** (`/pgrl/v2/lineas-negocio`): confirmado presente en `MASTER_DATA_CATALOGS` desde v0.4.1. Test unitario y documentación README ya reflejaban el catálogo correctamente.

#### Added — 6 new master-data catalogs

Nuevos catálogos identificados en la Postman collection que cumplen el criterio de "sin parámetros requeridos adicionales":

| Catálogo             | Endpoint                          | Sección                    |
| -------------------- | --------------------------------- | -------------------------- |
| `incidencecode`      | `GET /pvss/v2/incidencecode`      | Tipos / clasificaciones    |
| `claves-facturacion` | `GET /pvss/v2/claves-facturacion` | Tipos / clasificaciones    |
| `calendarios`        | `GET /pgrl/v1/calendarios`        | Organizativos              |
| `series`             | `GET /pgrl/v2/series`             | Organizativos              |
| `lineas`             | `GET /part/v1/lineas`             | Inventario                 |
| `bancos`             | `GET /pgrl/v2/bancos`             | Financiero (nueva sección) |

Total de catálogos: 18 → **24**.

#### Changed

- `src/schemas/master-data.ts`: enum reordenado en secciones con comentarios (tipos, geográficos, organizativos, inventario, **financiero**). Añadido JSDoc con instrucciones para añadir futuros catálogos.
- `src/tools/master-data.ts`: `CATALOG_DESCRIPTIONS` ampliado con los 6 nuevos catálogos. Comentario JSDoc actualizado (18 → 24).
- `README.md`: tabla "Datos maestros disponibles" actualizada (18 → 24 filas, nueva sección "Financiero"). Header de tools actualizado (19 → 24 endpoints).

#### Tests

- `tests/schemas/master-data.test.ts`: actualizado a 24 catálogos. Añadidos tests de presencia para `lineas-negocio` y los 6 nuevos. Añadido test exhaustivo de endpoints.
- `tests/tools/master-data.test.ts`: añadidos 4 tests de integración nock (lineas-negocio, bancos, calendarios, incidencecode) + test exhaustivo que mocka y verifica cada uno de los 24 catálogos.
- **Total tests: 254 (todos en verde)**

### Added — Cartera Clientes + Facturas Ventas (TD-118)

#### Nuevas tools (7)

- **`freematica_list_cartera_clientes`** (`GET /pcar/v1/cartera-clientes`): lista paginada de documentos de cartera de clientes con filtros FIQL completos.
  - Filtros: `empresa` (CARCL_EMP), `codCliente` (CARCL_CODAUX), `grupoCliente` (CARCL_GRUPAUX), `representante` (CARCL_CODREP), `formaPago` (CARCL_CODFPAG), `modoPago` (CARCL_CODMPAG)
  - Rangos de fecha: `fechaDocDesde/Hasta` (CARCL_FECDOC), `fechaVencimientoDesde/Hasta` (CARCL_FECVCTO)
  - `estado`: enum `pendiente | cancelado | derivado` → `CARCL_SITCAR==1/2/3`
  - `soloImpagados`: boolean → `CARCL_FECIMPAG!=null`
  - `referencia`: exacto → `CARCL_REFCAR`
- **`freematica_get_cartera_cliente`** (`GET /pcar/v1/cartera-clientes/{idreg}`): detalle de un documento por `idReg` opaco.
- **`freematica_list_facturas_cabecera`** (`GET /pven/v1/facturas-cabecera`): lista paginada de cabeceras de facturas de ventas con filtros FIQL.
  - Filtros: `empresa` (FVC_EMP), `codCliente` (FVC_CODAUX), `representante` (FVC_CODREP), `serie` (FVC_SERFAC), `numFactura` (FVC_NUMFAC), `formaPago` (FVC_CODFPAG), `delegacion` (FVC_DELEG)
  - Rangos de fecha: `fechaFacturaDesde/Hasta` (FVC_FECFAC)
  - `traspasadoContabilidad`: boolean → `FVC_TRSCONT==S/N`
- **`freematica_get_factura_cabecera`** (`GET /pven/v1/facturas-cabecera/{idreg}`): detalle de una factura por `idReg` opaco.
- **`freematica_list_factura_lineas`** (`GET /pven/v1/facturas-cabecera/{idreg}/lineas`): líneas de detalle de una factura. Filtros: `codArticulo` (FVL_CODART), `codFamilia` (FVL_CODFAM), `codSubfamilia` (FVL_CODSFAM), `delegacion` (FVL_DELEG).
- **`freematica_list_factura_iva`** (`GET /pven/v1/facturas-cabecera/{idreg}/iva`): líneas de IVA de una factura. Filtro: `tipoIva` (FVI_TIPIVA).
- **`freematica_list_factura_vencimientos`** (`GET /pven/v1/facturas-cabecera/{idreg}/vencimientos`): vencimientos de cobro de una factura. Filtros: `fechaVencimientoDesde/Hasta` (FVV_FECVCTO), `modoPago` (FVV_CODMPAG).

#### Nuevos schemas Zod

- **`src/schemas/cartera.ts`**: `ListCarteraFiltersSchema` con `EstadoCarteraEnum` (pendiente/cancelado/derivado) y mapa FIQL `ESTADO_CARTERA_FIQL_MAP`.
- **`src/schemas/facturas-ventas.ts`**: `ListFacturasCabeceraFiltersSchema`, `ListFacturaLineasFiltersSchema`, `ListFacturaIvaFiltersSchema`, `ListFacturaVencimientosFiltersSchema`.

#### Tests

- `tests/tools/cartera.test.ts`: 13 tests (registro, happy path con filtros FIQL, errores 404 + 500)
- `tests/tools/facturas-ventas.test.ts`: 23 tests (registro, happy path con filtros FIQL para las 5 tools, errores 404 + 500)
- `tests/clients/freematica-client-cartera.test.ts`: 34 tests (métodos del cliente: list/get cartera, list/get facturas cabecera, lineas, iva, vencimientos)
- **Total: 302 tests, todos en verde**

#### Coverage nuevos archivos

| Archivo                            | Statements | Functions | Lines |
| ---------------------------------- | ---------- | --------- | ----- |
| `src/schemas/cartera.ts`           | 100%       | 100%      | 100%  |
| `src/schemas/facturas-ventas.ts`   | 100%       | 100%      | 100%  |
| `src/tools/cartera.ts`             | 100%       | 100%      | 100%  |
| `src/tools/facturas-ventas.ts`     | 100%       | 100%      | 100%  |
| `src/clients/freematica-client.ts` | 100%       | 100%      | 100%  |

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
- Publicación del paquete como `@nubiia/mcp-freematica`.
