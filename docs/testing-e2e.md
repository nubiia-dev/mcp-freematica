# Testing E2E con MCP Inspector

Guía para verificar manualmente el servidor MCP de Freemática usando [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

## Prerrequisitos

- Node.js ≥ 20 instalado
- El proyecto compilado: `npm run build` (genera `dist/index.js`)
- Variables de entorno de autenticación Freemática disponibles
- MCP Inspector: `npm install -g @modelcontextprotocol/inspector` o usar `npx`

## 1. Arrancar el servidor en modo stdio

El servidor por defecto usa transporte `stdio`, que es el requerido por MCP Inspector.

```bash
# Compilar primero si no está compilado
npm run build

# Arrancar el servidor con variables de entorno de autenticación
FREEMATICA_AUTH_TOKEN="tu-token" \
FREEMATICA_AUTH_COMPANY="tu-empresa" \
FREEMATICA_AUTH_ORGANIZATION="tu-organizacion" \
FREEMATICA_AUTH_APP="tu-app" \
FREEMATICA_AUTH_SESSION="tu-session" \
FREEMATICA_BASE_URL="https://api.freematica.es/restsat/api" \
node dist/index.js
```

El servidor no produce output visible por stdout cuando arranca — comunica por stdio con el cliente MCP.

## 2. Arrancar MCP Inspector

En una **terminal diferente**, lanza MCP Inspector apuntando al servidor compilado:

```bash
# Opción A: usando npx (sin instalación global)
npx @modelcontextprotocol/inspector \
  node dist/index.js \
  FREEMATICA_AUTH_TOKEN="tu-token" \
  FREEMATICA_AUTH_COMPANY="tu-empresa" \
  FREEMATICA_AUTH_ORGANIZATION="tu-organizacion" \
  FREEMATICA_AUTH_APP="tu-app" \
  FREEMATICA_AUTH_SESSION="tu-session" \
  FREEMATICA_BASE_URL="https://api.freematica.es/restsat/api"

# Opción B: si tienes MCP Inspector instalado globalmente
mcp-inspector node dist/index.js -- \
  FREEMATICA_AUTH_TOKEN="tu-token" \
  FREEMATICA_AUTH_COMPANY="tu-empresa" \
  FREEMATICA_AUTH_ORGANIZATION="tu-organizacion" \
  FREEMATICA_AUTH_APP="tu-app" \
  FREEMATICA_AUTH_SESSION="tu-session"
```

MCP Inspector abrirá automáticamente `http://localhost:5173` (o el puerto disponible) en tu navegador.

## 3. Tools que deberían aparecer

Al conectar MCP Inspector, en la pestaña **Tools** deberían aparecer las siguientes 25 tools:

| # | Tool | Descripción |
|---|------|-------------|
| 1 | `freematica_list_materiales_asignados_servicios` | Lista material asignado a servicios |
| 2 | `freematica_get_master_data` | Catálogos de datos maestros (24 tipos) |
| 3 | `freematica_list_clientes` | Lista paginada de clientes |
| 4 | `freematica_get_cliente` | Detalle de un cliente por idReg |
| 5 | `freematica_list_contactos_clientes` | Lista paginada de contactos |
| 6 | `freematica_list_oportunidades_negocio` | Lista paginada de oportunidades CRM |
| 7 | `freematica_get_oportunidad_negocio` | Detalle de oportunidad |
| 8 | `freematica_get_oportunidad_negocio_datos_ampliados` | Datos ampliados de oportunidad |
| 9 | `freematica_get_ficha_prev_cliente` | Ficha PRL de un cliente |
| 10 | `freematica_list_vigilancia_salud` | Lista de registros de Vigilancia de la Salud |
| 11 | `freematica_get_vigilancia_salud` | Detalle de Vigilancia de la Salud |
| 12 | `freematica_list_personal` | Lista paginada de personas (RRHH) |
| 13 | `freematica_get_persona` | Detalle de una persona |
| 14 | `freematica_list_calendarios` | Lista de calendarios laborales |
| 15 | `freematica_list_calendario_periodos` | Periodos de un calendario |
| 16 | `freematica_list_cartera_clientes` | Lista de cartera de clientes |
| 17 | `freematica_get_cartera_cliente` | Detalle de documento de cartera |
| 18 | `freematica_list_facturas_cabecera` | Lista de facturas de ventas |
| 19 | `freematica_get_factura_cabecera` | Detalle de una factura |
| 20 | `freematica_list_factura_lineas` | Líneas de detalle de una factura |
| 21 | `freematica_list_factura_iva` | Líneas de IVA de una factura |
| 22 | `freematica_list_factura_vencimientos` | Vencimientos de cobro de una factura |
| 23 | `freematica_list_localizaciones_cobro_clientes` | Localizaciones de cobro |
| 24 | `freematica_list_localizaciones_pago_proveedores` | Localizaciones de pago proveedores |
| 25 | `freematica_list_localizaciones_servicio_clientes` | Localizaciones de servicio |

Si alguna tool no aparece, revisar:
1. Que el build está actualizado: `npm run build`
2. Que las variables de entorno son correctas
3. Los logs de stderr del servidor (MCP Inspector los muestra en la consola)

## 4. Ejemplos de tool calls manuales

Los siguientes ejemplos muestran inputs esperados para cada tool. Estos son **no-ejecutables** — deben introducirse manualmente en MCP Inspector.

### Ejemplo 1: Listar clientes (primera página)

**Tool:** `freematica_list_clientes`

```json
{
  "page": 1,
  "items": 20
}
```

**Output esperado (estructura):**
```json
{
  "items": [...],
  "count": 20,
  "total": 2007,
  "page": 1,
  "items_per_page": 20
}
```

Cada item contiene ~87 campos (COD_CLI, NOMBRE_CLI, NIF, FECHA_ALTA, etc.) más `idReg` opaco.

---

### Ejemplo 2: Obtener detalle de un cliente

**Prerequisito:** ejecutar `freematica_list_clientes` y copiar el campo `idReg` de un item.

**Tool:** `freematica_get_cliente`

```json
{
  "id": "MV9fMTAwMA=="
}
```

El valor `id` DEBE ser el `idReg` opaco del listado, no el `COD_CLI`.

---

### Ejemplo 3: Listar facturas con filtro por cliente

**Tool:** `freematica_list_facturas_cabecera`

```json
{
  "page": 1,
  "items": 10,
  "codCliente": "001234"
}
```

**Output esperado:** facturas filtradas por el cliente `001234`, paginadas.

---

### Ejemplo 4: Obtener catálogo de formas de cobro (master data)

**Tool:** `freematica_get_master_data`

```json
{
  "catalog": "formas-cobro"
}
```

**Valores válidos para `catalog`:** ver la descripción de la tool en MCP Inspector para la lista completa de catálogos disponibles.

---

### Ejemplo 5: Listar cartera con filtro de impagados

**Tool:** `freematica_list_cartera_clientes`

```json
{
  "page": 1,
  "items": 20,
  "soloImpagados": true
}
```

**Output esperado:** documentos de cartera marcados como impagados.

## 5. Verificación del circuit breaker

Para verificar que el circuit breaker funciona:

1. Configurar `FREEMATICA_BASE_URL` apuntando a un servidor inexistente
2. Ejecutar 5+ tool calls seguidas
3. A partir de la 6ª llamada (threshold default=5), el servidor debe responder inmediatamente con:
   ```json
   {
     "error": "server_error",
     "message": "Circuit breaker is open: too many consecutive failures. Retry later."
   }
   ```

Resetear el circuit breaker reiniciando el servidor.

## 6. Verificación de sanitización de headers

Los headers `x-auth-*` NUNCA deben aparecer en los logs del servidor.

Para verificar:
1. Activar logs de nivel `debug`: `LOG_LEVEL=debug node dist/index.js`
2. Ejecutar cualquier tool call
3. Revisar los logs de stderr — no deben contener valores de `x-auth-token`, `x-auth-company`, etc.

Los logs muestran solo `method`, `path`, `duration_ms`, `status` y `requestId`.
