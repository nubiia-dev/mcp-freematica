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

| Tool                                                      | Endpoint Freemática                                            | Descripción                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `freematica_list_articulos`                               | `GET /part/v1/articulos`                                       | Catálogo de artículos/materiales/consumibles (referencias, familias, proveedores)                  |
| `freematica_get_articulo`                                 | `GET /part/v1/articulos/{idreg}`                               | Detalle de un artículo                                                                             |
| `freematica_get_precio_articulo`                          | `GET /pgrl/v1/precio-articulo/{idreg}`                         | Precios de venta de un artículo (PRECIO_VENTA, DESCUENTO, FACTURABLE)                              |
| `freematica_list_materiales_asignados_servicios`          | `GET /pvss/v2/contratos-servicios-material`                    | Lista de material asignado a servicios                                                             |
| `freematica_get_master_data`                              | (24 endpoints según `catalog`)                                 | Devuelve un catálogo de datos maestros (tipos, geográficos, organizativos, inventario, financiero) |
| `freematica_list_clientes`                                | `GET /pgrl/v2/clientes`                                        | Lista paginada de clientes                                                                         |
| `freematica_get_cliente`                                  | `GET /pgrl/v2/clientes/{idReg}`                                | Detalle de un cliente                                                                              |
| `freematica_list_contactos_clientes`                      | `GET /pgrl/v2/contactos-clientes`                              | Lista paginada de contactos                                                                        |
| `freematica_list_oportunidades_negocio`                   | `GET /pcrm/v2/oportunidades-negocio`                           | Lista paginada de oportunidades                                                                    |
| `freematica_get_oportunidad_negocio`                      | `GET /pcrm/v2/oportunidades-negocio/{idReg}`                   | Detalle de oportunidad                                                                             |
| `freematica_get_oportunidad_negocio_datos_ampliados`      | `GET /pcrm/v2/oportunidades-negocio/{idReg}/datos-ampliados`   | Datos ampliados (puede 404)                                                                        |
| `freematica_get_ficha_prev_cliente`                       | `GET /pprl/v2/ficha-prev-cliente`                              | Ficha PRL de un cliente                                                                            |
| `freematica_list_vigilancia_salud`                        | `GET /pprl/v1/vigilancia-salud`                                | Lista paginada de registros de Vigilancia de la Salud                                              |
| `freematica_get_vigilancia_salud`                         | `GET /pprl/v1/vigilancia-salud/{idreg}`                        | Detalle de un registro de Vigilancia de la Salud                                                   |
| `freematica_list_personal`                                | `GET /pers/v1/personal`                                        | Lista paginada de personas (RRHH)                                                                  |
| `freematica_get_persona`                                  | `GET /pers/v2/personal/{idreg}`                                | Detalle de una persona                                                                             |
| `freematica_list_calendarios`                             | `GET /pgrl/v1/calendarios`                                     | Lista paginada de calendarios laborales                                                            |
| `freematica_list_calendario_periodos`                     | `GET /pgrl/v1/calendarios/{idreg}/periodos`                    | Periodos de un calendario laboral                                                                  |
| `freematica_list_cartera_clientes`                        | `GET /pcar/v1/cartera-clientes`                                | Lista paginada de cartera de clientes (cobros, impagados)                                          |
| `freematica_get_cartera_cliente`                          | `GET /pcar/v1/cartera-clientes/{idReg}`                        | Detalle de un documento de cartera                                                                 |
| `freematica_list_facturas_cabecera`                       | `GET /pven/v1/facturas-cabecera`                               | Lista paginada de facturas de ventas (cabecera)                                                    |
| `freematica_get_factura_cabecera`                         | `GET /pven/v1/facturas-cabecera/{idReg}`                       | Detalle de una factura de venta                                                                    |
| `freematica_list_factura_lineas`                          | `GET /pven/v1/facturas-cabecera/{idReg}/lineas`                | Líneas de detalle de una factura de venta                                                          |
| `freematica_list_factura_iva`                             | `GET /pven/v1/facturas-cabecera/{idReg}/iva`                   | Líneas de IVA de una factura de venta                                                              |
| `freematica_list_factura_vencimientos`                    | `GET /pven/v1/facturas-cabecera/{idReg}/vencimientos`          | Vencimientos de cobro de una factura de venta                                                      |
| `freematica_list_facturas_compras`                        | `GET /pcom/v1/facturas-cabecera`                               | Lista paginada de facturas de compras                                                              |
| `freematica_get_factura_compra`                           | `GET /pcom/v1/facturas-cabecera/{idReg}`                       | Detalle de una factura de compra                                                                   |
| `freematica_list_proveedores`                             | `GET /pgrl/v2/proveedores`                                     | Lista paginada de proveedores                                                                      |
| `freematica_get_proveedor`                                | `GET /pgrl/v2/proveedores/{idReg}`                             | Detalle de un proveedor                                                                            |
| `freematica_list_localizaciones_cobro_clientes`           | `GET /pgrl/v2/localizaciones-cobro-clientes`                   | Localizaciones de cobro de clientes (SEPA, domiciliaciones)                                        |
| `freematica_list_localizaciones_pago_proveedores`         | `GET /pgrl/v2/localizaciones-pago-proveedores`                 | Localizaciones de pago de proveedores                                                              |
| `freematica_list_localizaciones_servicio_clientes`        | `GET /pgrl/v2/localizaciones-servicio-clientes`                | Localizaciones de servicio de clientes                                                             |
| `freematica_list_cuentas_contables`                       | `GET /pcon/v2/cuentas`                                         | Plan de cuentas contables (COD_CTA, COD_PLAN, etc.)                                                |
| `freematica_list_cuentas_analiticas`                      | `GET /pcon/v2/cuentas-analiticas`                              | Catálogo de cuentas analíticas                                                                     |
| `freematica_export_asientos`                              | `GET /pcon/v2/asientos`                                        | Exporta asientos contables de un período (CSV/JSON)                                                |
| `freematica_list_pedidos_compra`                          | `GET /pcmp/v2/pedidos`                                         | Lista paginada de pedidos de compra (filtros nativos + FIQL + estado enum)                         |
| `freematica_get_pedido_compra`                            | `GET /pcmp/v2/pedidos/{idReg}`                                 | Detalle de un pedido de compra (cabecera + proveedor + líneas)                                     |
| `freematica_list_albaranes_ventas`                        | `GET /pven/v2/albaranes-ventas`                                | Lista paginada de albaranes de ventas (filtros todos nativos, empresa requerido)                   |
| `freematica_get_albaran_venta`                            | `GET /pven/v2/albaranes-ventas/{idReg}`                        | Detalle de un albarán de venta                                                                     |
| `freematica_list_albaranes_factura`                       | `GET /pven/v2/albaranes-facturas`                              | Lista paginada de vinculaciones albarán↔factura (idReg nativo + FIQL)                              |
| `freematica_get_albaran_factura`                          | `GET /pven/v2/albaranes-facturas/{idReg}`                      | Detalle de una vinculación albarán-factura                                                         |
| `freematica_list_resultados_facturacion`                  | `GET /pvss/v1/facturacion-resultados`                          | Resultados del proceso batch de facturación automática de vigilancia (FIQL)                        |
| `freematica_list_contratos`                               | `GET /pvss/v1/contratos`                                       | Lista paginada de cabeceras de contratos (solo filtros nativos: el API ignora FIQL aquí)           |
| `freematica_get_contrato`                                 | `GET /pvss/v1/contratos` (scan)                                | Busca un contrato por empresa + código natural (paginación interna + filtrado en cliente)          |
| `freematica_list_servicios_contrato`                      | `GET /pvss/v1/contratos/{idReg}/servicios`                     | Servicios de un contrato                                                                           |
| `freematica_get_servicio_contrato`                        | `GET /pvss/v2/contratos-servicios/{idReg}`                     | Detalle de un servicio de contrato                                                                 |
| `freematica_list_contratos_opcionales`                    | `GET /ppre/v2/contratos/opcionales`                            | Lista paginada de opcionales de contratos                                                          |
| `freematica_get_contrato_opcionales`                      | `GET /ppre/v2/contratos/opcionales/{idReg}`                    | Detalle de un registro de opcionales                                                               |
| `freematica_list_localizaciones_envio_clientes`           | `GET /pgrl/v2/localizaciones-envio-clientes`                   | Localizaciones de envío de clientes                                                                |
| `freematica_list_localizaciones_factura_clientes`         | `GET /pgrl/v2/localizaciones-factura-clientes`                 | Localizaciones de factura de clientes                                                              |
| `freematica_list_vinculos_personas_servicios`             | `GET /pvss/v2/vinculos-personas-servicios`                     | Lista paginada de vínculos persona↔servicio (mapping centro → trabajador, clave para CAE)          |
| `freematica_get_vinculo_persona_servicio`                 | `GET /pvss/v2/vinculos-personas-servicios/{idreg}`             | Detalle de un vínculo persona-servicio                                                             |
| `freematica_list_habilitaciones_servicios_alta`           | `GET /peqv/v2/habilitaciones/servicios/alta`                   | Feed incremental: altas de servicios-personal en habilitaciones CAE                                |
| `freematica_list_habilitaciones_servicios_baja`           | `GET /peqv/v2/habilitaciones/servicios/baja`                   | Feed incremental: bajas de servicios-personal en habilitaciones CAE                                |
| `freematica_list_habilitaciones_personal_alta`            | `GET /peqv/v2/habilitaciones/personal/alta`                    | Feed incremental: altas de licencias del personal en habilitaciones CAE                            |
| `freematica_list_habilitaciones_personal_baja`            | `GET /peqv/v2/habilitaciones/personal/baja`                    | Feed incremental: bajas de licencias del personal en habilitaciones CAE                            |
| `freematica_list_cuadrantes`                              | `GET /pvss/v1/cuadrantes`                                      | Lista paginada de cuadrantes                                                                       |
| `freematica_list_cuadrantes_detalles`                     | `GET /pvss/v1/cuadrantes-detalles`                             | Detalles de cuadrantes                                                                             |
| `freematica_list_cuadrantes_observaciones`                | `GET /pvss/v1/cuadrantes-observaciones`                        | Observaciones de cuadrantes                                                                        |
| `freematica_list_cuadrantes_auditoria`                    | `GET /pvss/v1/cuadrantes-auditoria`                            | Feed de auditoría de cuadrantes (nuevos/modificados/eliminados); soporta param `desde`             |
| `freematica_list_cuadrantes_tareas`                       | `GET /pvss/v2/cuadrantes-tareas`                               | Tareas de cuadrantes                                                                               |
| `freematica_list_computos_pers`                           | `GET /pvss/v2/computos-pers`                                   | Lista paginada de cómputos de personas (persona↔contrato↔servicio)                                 |
| `freematica_get_computos_pers`                            | `GET /pvss/v2/computos-pers/{idReg}`                           | Detalle de un cómputo de persona (campos CONFCP\_\*)                                               |
| `freematica_get_computos_pers_h`                          | `GET /pvss/v2/computos-pers-h/{idReg}`                         | Detalle de cómputo de persona con histórico (campos CONFCPH\_\*)                                   |
| `freematica_list_cuadrantes_cierre_personas`              | `GET /pvss/v1/cuadrantes-cierre-personas`                      | Lista de cierres de cuadrante por persona                                                          |
| `freematica_get_cuadrante_cierre_persona`                 | `GET /pvss/v1/cuadrantes-cierre-personas/{idreg}`              | Detalle de cierre de cuadrante por persona                                                         |
| `freematica_list_cuadrantes_cierre_personas_complementos` | `GET /pvss/v1/cuadrantes-cierre-personas-complementos`         | Lista de complementos de cierre de cuadrante                                                       |
| `freematica_get_cuadrante_cierre_persona_complemento`     | `GET /pvss/v1/cuadrantes-cierre-personas-complementos/{idreg}` | Detalle de complemento de cierre                                                                   |
| `freematica_list_cuadrantes_cierre_personas_especiales`   | `GET /pvss/v1/cuadrantes-cierre-personas-especiales`           | Lista de especiales de cierre de cuadrante                                                         |
| `freematica_get_cuadrante_cierre_persona_especial`        | `GET /pvss/v1/cuadrantes-cierre-personas-especiales/{idreg}`   | Detalle de especial de cierre                                                                      |
| `freematica_list_cuadrantes_cierre_personas_incidencias`  | `GET /pvss/v1/cuadrantes-cierre-personas-incidencias`          | Lista de incidencias de cierre de cuadrante                                                        |
| `freematica_get_cuadrante_cierre_persona_incidencia`      | `GET /pvss/v1/cuadrantes-cierre-personas-incidencias/{idreg}`  | Detalle de incidencia de cierre                                                                    |
| `freematica_list_contratos_servicios_global`              | `GET /pvss/v1/contratos-servicios`                             | Lista global de servicios de todos los contratos (sin filtro por contrato)                         |
| `freematica_list_contratos_turnos`                        | `GET /pvss/v1/contratos-turnos`                                | Turnos de contratos                                                                                |
| `freematica_list_contratos_horarios_operativa`            | `GET /pvss/v1/contratos-horarios-operativa`                    | Horarios de operativa de contratos                                                                 |
| `freematica_list_clases_servicios`                        | `GET /pvss/v1/clases-servicios`                                | Catálogo de clases de servicio                                                                     |
| `freematica_list_inspectores`                             | `GET /pvss/v1/inspectores`                                     | Lista de inspectores                                                                               |
| `freematica_get_inspector_empresa`                        | `GET /pvss/v1/inspector-empresa`                               | Inspector de empresa                                                                               |
| `freematica_list_claves_facturacion`                      | `GET /pvss/v2/claves-facturacion`                              | Claves de facturación                                                                              |
| `freematica_list_incidencias_servicios`                   | `GET /pvss/v2/incidencias-servicios`                           | Lista paginada de incidencias en servicios                                                         |
| `freematica_get_incidencia_servicio`                      | `GET /pvss/v2/incidencias-servicios/{idReg}`                   | Detalle de una incidencia en servicio                                                              |
| `freematica_list_incidencecode`                           | `GET /pvss/v2/incidencecode`                                   | Catálogo de códigos de incidencia (v2)                                                             |
| `freematica_get_contratos_servicios_material`             | `GET /pvss/v2/contratos-servicios-material/{idreg}`            | Detalle de material asignado a un servicio de contrato por idReg                                   |
| `freematica_list_personal_v2`                             | `GET /pers/v2/personal`                                        | Sincronización incremental de personas (param `fchmodificacion` opcional)                          |
| `freematica_list_personal_identificacion`                 | `GET /pers/v2/personal-identificacion`                         | Datos de identificación del personal                                                               |
| `freematica_list_personal_notas`                          | `GET /pers/v2/personal-notas`                                  | Notas del personal (filtrables por `idReg` de persona)                                             |
| `freematica_get_personal_nota`                            | `GET /pers/v2/personal-notas/{idReg}`                          | Detalle de una nota de personal                                                                    |
| `freematica_list_personal_experiencias`                   | `GET /pers/v1/personal-experiencias`                           | Historial de experiencia laboral del personal                                                      |
| `freematica_get_personal_experiencia`                     | `GET /pers/v1/personal-experiencias/{idreg}`                   | Detalle de una experiencia laboral                                                                 |
| `freematica_list_personal_formaciones`                    | `GET /pers/v1/personal-formaciones`                            | Historial de formaciones del personal                                                              |
| `freematica_get_personal_formacion`                       | `GET /pers/v1/personal-formaciones/{idReg}`                    | Detalle de una formación del personal                                                              |
| `freematica_list_personal_contratos`                      | `GET /pers/v1/personal_contratos`                              | Contratos laborales del personal                                                                   |
| `freematica_get_personal_contrato`                        | `GET /pers/v1/personal_contratos/{idreg}`                      | Detalle de un contrato laboral                                                                     |
| `freematica_list_personal_tramos`                         | `GET /pers/v1/personal_tramos`                                 | Tramos de horario del personal (v1)                                                                |
| `freematica_get_personal_tramo`                           | `GET /pers/v1/personal_tramos/{idreg}`                         | Detalle de un tramo de horario (v1)                                                                |
| `freematica_list_personal_tramos_sync`                    | `GET /pers/v2/personal/tramos`                                 | Sincronización incremental de tramos de horario (param `fchmodificacion` opcional)                 |
| `freematica_get_personal_tramo_v2`                        | `GET /pers/v2/personal/tramos/{idreg}`                         | Detalle de un tramo de horario (v2)                                                                |
| `freematica_list_personal_pago`                           | `GET /pers/v1/personal_pago`                                   | Datos bancarios y de pago del personal                                                             |
| `freematica_get_personal_pago`                            | `GET /pers/v1/personal_pago/{idreg}`                           | Detalle de datos bancarios de una persona                                                          |
| `freematica_list_personal_adicionales`                    | `GET /pers/v2/personal-adicionales`                            | Campos adicionales personalizables del personal                                                    |
| `freematica_list_personal_prorroga`                       | `GET /pers/v1/personal-prorroga`                               | Prórrogas de contratos del personal                                                                |
| `freematica_get_personal_prorroga`                        | `GET /pers/v1/personal-prorroga/{idreg}`                       | Detalle de una prórroga de contrato                                                                |
| `freematica_list_incidencias_personal`                    | `GET /pers/v2/incidencias`                                     | Incidencias del personal                                                                           |
| `freematica_get_agenda_persona`                           | `GET /pers/v1/agenda-persona`                                  | Agenda de citas y eventos de personas                                                              |
| `freematica_list_equipamiento_ficha_seguridad`            | `GET /pers/v2/equipamiento-ficha-seguridad`                    | Equipamiento de fichas de seguridad del personal                                                   |
| `freematica_list_anticipos_personal`                      | `GET /pers/v2/personal/anticipos`                              | Anticipos de nómina del personal                                                                   |
| `freematica_get_anticipo_personal`                        | `GET /pers/v2/personal/anticipos/{idReg}`                      | Detalle de un anticipo de nómina                                                                   |
| `freematica_list_calendario_personal`                     | `GET /pers/v2/personal-cal`                                    | Entradas del calendario personal (vacaciones, permisos, ausencias)                                 |
| `freematica_get_calendario_personal`                      | `GET /pers/v2/personal-cal/{idReg}`                            | Detalle de una entrada del calendario personal                                                     |
| `freematica_list_cpd`                                     | `GET /pers/v1/cpd`                                             | Documentos del empleado (CPD: nóminas, comunicaciones, etc.)                                       |
| `freematica_get_cpd`                                      | `GET /pers/v1/cpd/{idreg}`                                     | Detalle de un CPD                                                                                  |
| `freematica_list_cpd_movimientos`                         | `GET /pers/v1/cpd/{idreg}/movimientos`                         | Movimientos/historial de estados de un CPD                                                         |
| `freematica_list_cpd_firmados_vid`                        | `GET /pers/v1/cpd/firmados-vid`                                | CPDs firmados vía viafirma (VID)                                                                   |
| `freematica_list_personal_irpf`                           | `GET /pers/v2/personal_irpf`                                   | Datos de IRPF del personal                                                                         |
| `freematica_get_personal_irpf`                            | `GET /pers/v2/personal_irpf/{idreg}`                           | Detalle de datos IRPF de una persona                                                               |
| `freematica_list_sesiones_formacion`                      | `GET /pers/v1/sesiones-formacion`                              | Sesiones de formación del personal                                                                 |
| `freematica_get_sesion_formacion`                         | `GET /pers/v1/sesiones-formacion/{idreg}`                      | Detalle de una sesión de formación                                                                 |
| `freematica_list_vss_incidencias`                         | `GET /pers/v2/vss-incidencias`                                 | Incidencias de personal (módulo VSS)                                                               |
| `freematica_get_vss_incidencia`                           | `GET /pers/v2/vss-incidencias/{idReg}`                         | Detalle de una incidencia VSS del personal                                                         |
| `freematica_list_ppre_contratos`                          | `GET /ppre/v1/contratos`                                       | Lista paginada de contratos de instalación/mantenimiento (v1)                                      |
| `freematica_list_ppre_contratos_v2`                       | `GET /ppre/v2/contratos`                                       | Lista de contratos de instalación/mantenimiento vigentes (v2)                                      |
| `freematica_get_ppre_contrato_v1`                         | `GET /ppre/v1/contratos/{idreg}`                               | Detalle de un contrato (v1)                                                                        |
| `freematica_get_ppre_contrato_v2`                         | `GET /ppre/v2/contratos/{idReg}`                               | Detalle de un contrato (v2)                                                                        |
| `freematica_list_ppre_contratos_instalacion`              | `GET /ppre/v1/contratosInstalacion`                            | Contratos agrupados por instalación                                                                |
| `freematica_list_ppre_tipos_contrato`                     | `GET /ppre/v2/tipos-contrato`                                  | Catálogo de tipos de contrato (ppre)                                                               |
| `freematica_list_ppre_ordenes_trabajo`                    | `GET /ppre/v1/ordenes-trabajo`                                 | Lista paginada de órdenes de trabajo                                                               |
| `freematica_get_ppre_orden_trabajo`                       | `GET /ppre/v1/ordenes-trabajo/{idreg}`                         | Detalle de una orden de trabajo                                                                    |
| `freematica_list_ppre_partes`                             | `GET /ppre/v1/partes`                                          | Lista paginada de partes                                                                           |
| `freematica_get_ppre_parte`                               | `GET /ppre/v1/partes/{idreg}`                                  | Detalle de un parte                                                                                |
| `freematica_get_ppre_parte_componentes_ficha_tecnica`     | `GET /ppre/v1/partes/{idreg}/componentes-ficha-tecnica`        | Componentes de la ficha técnica asociada a un parte                                                |
| `freematica_list_ppre_parte_ultimas_intervenciones`       | `GET /ppre/v1/partes/{idreg}/ultimas-intervenciones`           | Últimas intervenciones de un parte                                                                 |
| `freematica_list_ppre_partes_orden_trabajo`               | `GET /ppre/v2/partes/partes-orden-trabajo`                     | Partes cumplimentados asociados a órdenes de trabajo                                               |
| `freematica_list_ppre_partes_fin_mantenedor`              | `GET /ppre/v2/partes/partes-fin-mantenedor`                    | Partes finalizados por el mantenedor                                                               |
| `freematica_list_ppre_cabecera_actas_partes`              | `GET /ppre/v2/partes/cabecera-actas-partes`                    | Cabecera de actas de partes                                                                        |
| `freematica_list_ppre_lineas_actas_partes`                | `GET /ppre/v2/partes/lineas-actas-partes`                      | Líneas de actas de partes                                                                          |
| `freematica_list_ppre_fichas_instalacion`                 | `GET /ppre/v1/fichas-instalacion/{idReg}`                      | Fichas de instalación (idReg en path, opcional para listar todas)                                  |
| `freematica_get_ppre_ficha_tecnica`                       | `GET /ppre/v1/ficha-tecnica/{idReg}`                           | Ficha técnica de una instalación                                                                   |
| `freematica_list_ppre_componentes_ficha_tecnica`          | `GET /ppre/v1/fichas-tecnicas/{idreg}/componentes`             | Componentes de una ficha técnica                                                                   |
| `freematica_list_ppre_marcajes`                           | `GET /ppre/v1/marcajes`                                        | Marcajes IKAROS (v1)                                                                               |
| `freematica_list_ppre_marcajes_v2`                        | `GET /ppre/v2/marcajes`                                        | Marcajes IKAROS (v2)                                                                               |
| `freematica_list_ppre_incidencias_anomalias`              | `GET /ppre/v1/incidencias-anomalias`                           | Catálogo de incidencias y anomalías (ppre)                                                         |
| `freematica_list_ppre_tipo_instalacion`                   | `GET /ppre/v1/tipo-instalacion`                                | Catálogo de tipos de instalación                                                                   |

### Tools de escritura (requieren `FREEMATICA_ENABLE_WRITES=true`)

Por defecto el servidor es de **solo lectura**. Con `FREEMATICA_ENABLE_WRITES=true` se registran además estas tools de creación y actualización. **No existe ninguna tool de borrado.** Todas las escrituras dejan log de auditoría (operación + endpoint + campos a nivel info; body completo a nivel debug).

| Tool                                                | Endpoint Freemática                                             | Descripción                                                      |
| --------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `freematica_create_contrato`                        | `POST /pvss/v2/contratos`                                       | Alta de cabecera de contrato                                     |
| `freematica_update_contrato`                        | `PUT /pvss/v2/contratos/{idReg}`                                | Actualización de cabecera de contrato                            |
| `freematica_create_servicio_contrato`               | `POST /pvss/v2/contratos/{idReg}/servicios`                     | Alta de servicio (identificación derivada del idReg)             |
| `freematica_update_servicio_fechas`                 | `PUT /pvss/v2/contratos/{id}/servicio/{id}`                     | Fechas inicio/fin del servicio (mecanismo de baja)               |
| `freematica_create_servicio_historico_precios`      | `POST /pvss/v2/contratos/{id}/servicios-historico-precios/{id}` | Alta de revisión de precios del servicio                         |
| `freematica_update_servicio_historico_precios`      | `PUT /pvss/v2/contratos/{id}/servicios-historico-precios/{id}`  | Actualización de revisión de precios                             |
| `freematica_create_servicio_facturacion_txt`        | `POST /pvss/v2/contratos/{id}/servicios-facturacion-txt/{id}`   | Alta de línea de texto de facturación                            |
| `freematica_update_servicio_facturacion`            | `PUT /pvss/v2/contratos/{id}/servicios-facturacion/{id}`        | Datos de facturación del servicio (precios hora, forma de pago…) |
| `freematica_create_contrato_opcionales`             | `POST /ppre/v2/contratos/opcionales`                            | Alta de opcionales de contrato                                   |
| `freematica_update_contrato_opcionales`             | `PUT /ppre/v2/contratos/opcionales/{idReg}`                     | Actualización de opcionales de contrato                          |
| `freematica_create_cliente`                         | `POST /pgrl/v2/clientes`                                        | Alta de cliente (idReg derivado de grupo+código)                 |
| `freematica_update_cliente`                         | `PUT /pgrl/v2/clientes/{idReg}`                                 | Actualización parcial de cliente (fetch+merge)                   |
| `freematica_create_contacto_cliente`                | `POST /pgrl/v2/contactos-clientes`                              | Alta de contacto de cliente                                      |
| `freematica_update_contacto_cliente`                | `PUT /pgrl/v2/contactos-clientes/{idReg}`                       | Actualización parcial de contacto (fetch+merge)                  |
| `freematica_create_localizacion_cliente`            | `POST /pgrl/v2/localizaciones-{tipo}-clientes`                  | Alta de localización (tipo: cobro/envio/factura/servicio)        |
| `freematica_update_localizacion_cliente`            | `PUT /pgrl/v2/localizaciones-{tipo}-clientes/{idReg}`           | Actualización parcial de localización (fetch+merge)              |
| `freematica_create_persona`                         | `POST /pers/v1/personal`                                        | Alta de persona/empleado (campos VSSPER\_\* + camposAdicionales) |
| `freematica_update_persona`                         | `PUT /pers/v1/personal/{idReg}`                                 | Actualización parcial de persona (fetch+merge)                   |
| `freematica_create_personal_identificacion`         | `POST /pers/v1/personal-identificacion/{idreg}`                 | Alta de datos de identificación de una persona                   |
| `freematica_create_personal_nota`                   | `POST /pers/v2/personal-notas`                                  | Alta de nota de personal (PERNOT\_\*)                            |
| `freematica_update_personal_nota`                   | `PUT /pers/v2/personal-notas/{idReg}`                           | Actualización de nota de personal (fetch+merge)                  |
| `freematica_create_personal_experiencia`            | `POST /pers/v2/personal-experiencia`                            | Alta de experiencia laboral (PEREX\_\*)                          |
| `freematica_create_personal_formacion`              | `POST /pers/v2/personal-formaciones`                            | Alta de formación del personal                                   |
| `freematica_update_personal_formacion`              | `PUT /pers/v2/personal-formaciones/{idReg}`                     | Actualización de formación del personal                          |
| `freematica_create_incidencia_base`                 | `POST /pers/v2/incidencias-base`                                | Alta de incidencia base                                          |
| `freematica_update_incidencia_base_fecha_fin`       | `PUT /pers/v2/incidencias-base/{idReg}`                         | Actualización de fecha fin de incidencia base                    |
| `freematica_create_personal_pago`                   | `POST /pers/v1/personal_pago`                                   | Alta de datos bancarios de persona                               |
| `freematica_update_personal_pago`                   | `PUT /pers/v1/personal_pago/{idreg}`                            | Actualización de datos bancarios de persona                      |
| `freematica_create_personal_tramo`                  | `POST /pers/v1/personal_tramos`                                 | Alta de tramo de horario (PERHH\_\*)                             |
| `freematica_update_personal_tramo`                  | `PUT /pers/v1/personal_tramos/{idreg}`                          | Actualización de tramo de horario (PERHH\_\*)                    |
| `freematica_create_personal_contrato`               | `POST /pers/v1/personal_contratos`                              | Alta de contrato laboral (PERCTRAB\_\*)                          |
| `freematica_update_personal_contrato`               | `PUT /pers/v1/personal_contratos/{idreg}`                       | Actualización de contrato laboral (PERCTRAB\_\*)                 |
| `freematica_create_personal_adicional`              | `POST /pers/v2/personal-adicionales`                            | Alta de campo adicional de personal (VSSPERA\_\*)                |
| `freematica_update_personal_adicional`              | `PUT /pers/v2/personal-adicionales/{idReg}`                     | Actualización de campo adicional de personal (VSSPERA\_\*)       |
| `freematica_create_anticipo_personal`               | `POST /pers/v2/personal/anticipos`                              | Alta de anticipo de nómina                                       |
| `freematica_create_calendario_personal`             | `POST /pers/v2/personal-cal`                                    | Alta de entrada en calendario personal                           |
| `freematica_update_calendario_personal`             | `PUT /pers/v2/personal-cal/{idReg}`                             | Actualización de entrada en calendario personal                  |
| `freematica_update_cpd_bulk`                        | `POST /pers/v1/cpd/actualizar`                                  | Actualización masiva de CPDs                                     |
| `freematica_update_cpd_gestion`                     | `PUT /pers/v1/cpd/{idreg}/gestion`                              | Gestión de estado de un CPD (firmar, validar, rechazar)          |
| `freematica_create_personal_irpf`                   | `POST /pers/v2/personal_irpf`                                   | Alta de datos IRPF de persona                                    |
| `freematica_update_personal_irpf`                   | `PUT /pers/v2/personal_irpf/{idreg}`                            | Actualización de datos IRPF de persona                           |
| `freematica_create_personal_irpf_ad`                | `POST /pers/v2/personal_irpf_ad/{idreg}`                        | Alta de IRPF ascendientes/descendientes de persona               |
| `freematica_update_personal_irpf_ad`                | `PUT /pers/v2/personal_irpf_ad/{idreg}`                         | Actualización de IRPF ascendientes/descendientes                 |
| `freematica_update_preventor`                       | `PUT /pers/v1/control/preventor`                                | Actualización de estado de formación en Preventor                |
| `freematica_update_preventor_estado`                | `POST /pers/v2/preventor/actualizar-estado`                     | Actualización de estado Preventor (nuevo formato v2)             |
| `freematica_create_ppre_contrato`                   | `POST /ppre/v2/contratos`                                       | Alta de contrato de instalación/mantenimiento (CON\_\*)          |
| `freematica_create_ppre_orden_trabajo`              | `POST /ppre/v1/ordenes-trabajo`                                 | Alta de orden de trabajo (AVI\_\*, PPC\_\*)                      |
| `freematica_update_ppre_orden_trabajo`              | `PUT /ppre/v1/ordenes-trabajo/{idreg}`                          | Actualización de orden de trabajo                                |
| `freematica_update_ppre_lineas_actas_partes`        | `PUT /ppre/v2/partes/importar-lineas-actas-partes/{idReg}`      | Importar líneas de actas de partes                               |
| `freematica_create_ppre_ficha_instalacion_material` | `POST /ppre/v1/fichas-instalacion-material`                     | Alta de material en ficha de instalación                         |
| `freematica_update_ppre_ficha_instalacion`          | `PUT /ppre/v1/fichas-instalacion/{idReg}`                       | Actualización de ficha de instalación                            |
| `freematica_create_ppre_marcaje`                    | `POST /ppre/v1/guardar`                                         | Grabar marcaje IKAROS (trackType, serviceTag, lat/lng, etc.)     |
| `freematica_update_ppre_marcaje_v1`                 | `PUT /ppre/v1/actualizar/{idReg}`                               | Actualizar marcaje IKAROS (v1)                                   |
| `freematica_update_ppre_marcaje_v2`                 | `PUT /ppre/v2/actualizar/{idReg}`                               | Actualizar marcaje IKAROS (v2)                                   |

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

// El MCP construye internamente (valores siempre entre comillas simples):
// rquery=CARCL_EMP=='0001';CARCL_FECDOC=ge='2026-01-01';CARCL_SITCAR=='1'
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
// → rquery=FVC_CODEMP=='0001';FVC_TRASP_CONTAB=='0'

// Proveedor por nombre EXACTO (el API no soporta búsqueda parcial: =lk=
// responde 400 y los wildcards % devuelven 0 resultados). El filtro activo
// de proveedores post-filtra las bajas en cliente (FIQL no tiene IS NULL):
freematica_list_proveedores({
  nombre: 'LEJIAS PONS S.A.',
  activo: true,
});
// → rquery=NOMBRE_PRO=='LEJIAS PONS S.A.'
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

| Variable                                | Default                                              | Descripción                                                                                                                                                |
| --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FREEMATICA_BASE_URL`                   | `https://api-p01.clientservicepanel.com/restsat/api` | Base URL del API de Freemática. Cambiar solo si Freemática cambia el host o se usa un entorno alternativo.                                                 |
| `FREEMATICA_TIMEOUT_MS`                 | `30000`                                              | Timeout por petición en milisegundos. Si el upstream no responde en este tiempo, el request se cancela con `network_error`.                                |
| `FREEMATICA_MAX_RETRIES`                | `3`                                                  | Número máximo de reintentos para errores 5xx y errores de red. Los errores 4xx nunca se reintentan.                                                        |
| `FREEMATICA_CIRCUIT_BREAKER_THRESHOLD`  | `5`                                                  | Número de operaciones lógicas fallidas consecutivas (post-retry-exhaustion) necesarias para abrir el circuit breaker.                                      |
| `FREEMATICA_CIRCUIT_BREAKER_TIMEOUT_MS` | `30000`                                              | Tiempo en ms que el circuit breaker permanece abierto antes de pasar a half-open.                                                                          |
| `FREEMATICA_MAX_RESPONSE_SIZE_MB`       | `10`                                                 | Tamaño máximo de respuesta aceptada del upstream en MB. Respuestas mayores se truncan con aviso en el campo `truncated`.                                   |
| `FREEMATICA_ENABLE_WRITES`              | `false`                                              | Registra las tools de escritura (`freematica_create_*` / `freematica_update_*`). Sin ella el servidor es de solo lectura. Valores: `true`/`false`/`1`/`0`. |
| `MCP_TRANSPORT`                         | `stdio`                                              | Transporte: `stdio` (para Claude Desktop/Code) o `http` (para Nubiia). Equivale al flag `--transport=`.                                                    |
| `MCP_PORT`                              | `3000`                                               | Puerto TCP donde el servidor MCP expone `/mcp` y `/health`. Ignorado en modo stdio.                                                                        |
| `MCP_ALLOWED_ORIGINS`                   | `*`                                                  | CORS: lista de orígenes permitidos separados por coma, o `*` para todos. En producción restringir al dominio de Nubiia. Ignorado en modo stdio.            |
| `LOG_LEVEL`                             | `info`                                               | Nivel de log para pino: `fatal`, `error`, `warn`, `info`, `debug`, `trace`. En producción usar `info`. En desarrollo usar `debug`.                         |

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
