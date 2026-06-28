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
import { loadAuthConfig, loadHardeningConfig } from '../src/config.js';

const auth = loadAuthConfig();     // lanza si falta alguna var obligatoria
const harden = loadHardeningConfig();

// 2. Crear cliente Freemática con BaseClientConfig
const client = new FreematicaClient({
  baseUrl: auth.FREEMATICA_BASE_URL,
  authHeaders: {
    'x-auth-token': auth.FREEMATICA_AUTH_TOKEN,
    'x-auth-company': auth.FREEMATICA_AUTH_COMPANY,
    'x-auth-organization': auth.FREEMATICA_AUTH_ORGANIZATION,
    'x-auth-app': auth.FREEMATICA_AUTH_APP,
    'x-auth-session': auth.FREEMATICA_AUTH_SESSION,
  },
  timeoutMs: harden.FREEMATICA_TIMEOUT_MS,
});

// 3. Llamar a los endpoints necesarios
const result = await client.listCarteraClientes({ soloImpagados: true, ... });

// 4. Procesar y mostrar resultados
console.table(result.items.slice(0, 10));
```

## Verificacion de tipos

Los examples usan `dotenv` (devDependency) para cargar el `.env`. Para verificar que compilan sin errores de TypeScript:

```bash
# Verificar todos los examples de una vez
npx tsc --noEmit --moduleResolution bundler --module esnext --target esnext \
  examples/01-analisis-morosidad.ts

# O usar tsx (que ignora errores de tipo pero valida imports):
npx tsx examples/01-analisis-morosidad.ts
```

Los examples estan excluidos del tsconfig.test.json para no afectar la cobertura de tests.

## Variables de entorno necesarias

```bash
FREEMATICA_AUTH_TOKEN=...
FREEMATICA_AUTH_COMPANY=...
FREEMATICA_AUTH_ORGANIZATION=...
FREEMATICA_AUTH_APP=...
FREEMATICA_AUTH_SESSION=...
FREEMATICA_BASE_URL=https://api-p01.clientservicepanel.com/restsat/api  # opcional
```
