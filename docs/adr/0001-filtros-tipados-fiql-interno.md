# ADR-0001: Filtros tipados con adapter FIQL interno

**Estado:** Aceptado

**Fecha:** 2026-05-20

**Autores:** Nubiia

---

## Contexto

El API REST de Freemática utiliza la sintaxis **FIQL** (Feed Item Query Language) para los filtros de sus endpoints de listado. Ejemplo de una query real:

```
GET /pcar/v1/cartera-clientes?rquery=CARCL_EMP==0001;CARCL_FECDOC=ge=2026-01-01;CARCL_SITCAR==1
```

Los campos FIQL de Freemática usan:

- Nombres de campo en mayúsculas con prefijos crípticos (`CARCL_`, `FAC_`, `PRO_`).
- Operadores no estándar (`=ge=`, `=lk=`, `=in=`).
- Combinación de condiciones con `;` (AND) o `,` (OR).

El MCP es consumido principalmente por **LLMs** (Claude). Se debatieron dos opciones:

### Opción A: Exponer FIQL raw al consumidor

El LLM recibiría un parámetro libre `rquery` y debería construir la sintaxis FIQL por su cuenta.

### Opción B: Exponer filtros tipados con adapter FIQL interno (elegida)

El MCP define un schema zod con parámetros con nombres semánticos en español. Internamente, el módulo `src/clients/fiql-builder.ts` transforma esos parámetros a la cadena FIQL correcta.

---

## Decisión

Se implementa la **Opción B**: filtros tipados zod + adapter FIQL interno.

Cada tool de listado define su propio `ZodRawShape` con parámetros nombrados semánticamente:

```typescript
// En src/tools/cartera.ts
const LIST_SCHEMA = {
  empresa: z.string().optional().describe('Código de empresa (ej: "0001")'),
  fechaDocDesde: z.string().optional().describe('Fecha mínima del documento (YYYY-MM-DD)'),
  estado: z.enum(['pendiente', 'cobrado', 'vencido']).optional(),
  soloImpagados: z.boolean().optional(),
  // ...
};
```

El builder FIQL (`src/clients/fiql-builder.ts`) toma estos valores tipados y produce la cadena FIQL correcta, gestionando:

- Mapeo de nombres semánticos a nombres de campo Freemática.
- Mapeo de valores enum a valores numéricos Freemática (`'pendiente'` → `1`).
- Operadores correctos por tipo de filtro (`==`, `=ge=`, `=le=`, `=lk=`).
- Combinación con `;` (AND).

---

## Consecuencias

### Ventajas

- **DX para el LLM**: Claude solo necesita conocer parámetros con nombres claros. No necesita aprender la sintaxis FIQL ni los nombres de campo internos de Freemática.
- **Validación fuerte**: zod valida el tipo y rango de cada filtro antes de construir la query. Los errores son mensajes legibles, no errores de parsing FIQL.
- **Abstracción de versiones**: si Freemática cambia un nombre de campo interno, solo hay que actualizar el adapter, no todos los consumidores del MCP.
- **Testabilidad**: el builder FIQL es una función pura que se testea de forma aislada.
- **Seguridad**: no hay riesgo de inyección FIQL desde el LLM (todos los valores se escapan en el builder).

### Desventajas / Trade-offs

- **Mayor código en el MCP**: cada tool de listado requiere definir su schema de filtros y los mappings en el builder. Añadir una nueva tool implica trabajo extra en ambas capas.
- **Expressividad limitada**: los filtros predefinidos no cubren el 100% de las posibilidades FIQL del API Freemática. Filtros avanzados (OR, operadores anidados) no están disponibles para el LLM.
- **Mantenimiento del mapeo**: cuando Freemática añade nuevos campos filtrables, hay que actualizar el schema y el builder del MCP.

### Alternativas descartadas

- **FIQL raw**: descartado por ser poco ergonómico para LLMs y propenso a errores de sintaxis.
- **GraphQL como intermediario**: descartado por complejidad de infraestructura innecesaria para un MCP privado.

---

## Referencias

- `src/clients/fiql-builder.ts` — implementación del adapter FIQL
- `src/schemas/` — definiciones de los schemas de filtros por dominio
- `src/tools/cartera.ts`, `src/tools/facturas-ventas.ts` — uso del patrón
