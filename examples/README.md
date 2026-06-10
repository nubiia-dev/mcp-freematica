# Examples — MCP Freemática

Scripts ejecutables de referencia para casos de uso reales del MCP Freemática.

Estos scripts NO son tests automatizados. Son código de referencia para ejecutar manualmente con credenciales reales de Freemática.

## Requisitos previos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (copiar y rellenar)
cp .env.example .env
# Editar .env con las credenciales reales de Freemática

# 3. Ejecutar cualquier ejemplo con tsx
npx tsx examples/<nombre>.ts
```

## Indice de examples

| Fichero                                                                    | Descripcion                                                     | Tools usadas                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| [01-analisis-morosidad.ts](./01-analisis-morosidad.ts)                     | Analisis de morosidad: lista impagados y agrupa top 10 deudores | `freematica_list_cartera_clientes`  |
| [02-export-asientos-mes.ts](./02-export-asientos-mes.ts)                   | Exporta asientos contables del mes en curso a CSV               | `freematica_export_asientos`        |
| [03-facturas-pendientes-traspaso.ts](./03-facturas-pendientes-traspaso.ts) | Lista facturas de venta pendientes de traspaso a contabilidad   | `freematica_list_facturas_cabecera` |
| [04-search-proveedores.ts](./04-search-proveedores.ts)                     | Busca proveedores activos por nombre parcial                    | `freematica_list_proveedores`       |
| [05-personal-activo-empresa.ts](./05-personal-activo-empresa.ts)           | Lista el personal activo de una empresa y delegacion            | `freematica_list_personal`          |

## Patron de uso

Todos los examples siguen el mismo patron:

```typescript
// 1. Cargar configuracion desde variables de entorno
const config = loadConfig(); // lanza si falta alguna var obligatoria

// 2. Crear cliente Freemática
const client = new FreematicaClient(config);

// 3. Llamar a los endpoints necesarios
const result = await client.listCarteraClientes({ soloImpagados: true, ... });

// 4. Procesar y mostrar resultados
console.table(result.items.slice(0, 10));
```

## Variables de entorno necesarias

```bash
FREEMATICA_AUTH_TOKEN=...
FREEMATICA_AUTH_COMPANY=...
FREEMATICA_AUTH_ORGANIZATION=...
FREEMATICA_AUTH_APP=...
FREEMATICA_AUTH_SESSION=...
FREEMATICA_BASE_URL=https://api-p01.clientservicepanel.com/restsat/api  # opcional
```
