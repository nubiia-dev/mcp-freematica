import { z } from 'zod';

/**
 * Zod schemas (raw shapes) y builders de body para las tools de escritura de
 * Localizaciones de Clientes (módulo pgrl, v2): cobro, envío, factura y
 * servicio.
 *
 * Los cuatro tipos comparten la mayoría de campos (dirección, teléfonos,
 * email, contacto) pero cada uno usa nombres de columna distintos para el
 * código, el nombre, el domicilio y el contacto. `LOC_FIELD_MAP` centraliza
 * ese mapeo.
 */

/** Añade `target[key] = value` solo si value !== undefined. */
function setIf(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) target[key] = value;
}

export type LocalizacionTipo = 'cobro' | 'envio' | 'factura' | 'servicio';

export const LOC_TIPOS: LocalizacionTipo[] = ['cobro', 'envio', 'factura', 'servicio'];

interface LocFieldMap {
  /** Columna del código de localización (requerida por el API). */
  codField: string;
  /** Columna del nombre/denominación. */
  nombreField: string;
  /** Columna del domicilio. */
  domicilioField: string;
  /** Columna de la persona de contacto. */
  contactoField: string;
  /** ¿El API exige el nombre en el alta? */
  nombreRequerido: boolean;
  /** Path del recurso v2 (list/create; update añade /{idReg}). */
  path: string;
  /** Path del GET singular usado en el fetch+merge del update. */
  getPath: string;
  /** Sufijo del nombre de tool: freematica_*_localizacion_<sufijo>_cliente. */
  toolSuffix: string;
}

export const LOC_FIELD_MAP: Record<LocalizacionTipo, LocFieldMap> = {
  cobro: {
    codField: 'LOC_CLI_COB',
    nombreField: 'NOM_LOC_COB',
    domicilioField: 'DOMICILIO',
    contactoField: 'COB_CONTACTO',
    nombreRequerido: true,
    path: '/pgrl/v2/localizaciones-cobro-clientes',
    getPath: '/pgrl/v2/localizaciones-cobro-clientes',
    toolSuffix: 'cobro',
  },
  envio: {
    codField: 'LOC_CLI_ENV',
    nombreField: 'NOM_LOC_ENV',
    domicilioField: 'DOMICILIO_ENVIO',
    contactoField: 'ENV_CONTACTO',
    nombreRequerido: false,
    path: '/pgrl/v2/localizaciones-envio-clientes',
    getPath: '/pgrl/v2/localizaciones-envio-clientes',
    toolSuffix: 'envio',
  },
  factura: {
    codField: 'LOC_CLI_FAC',
    nombreField: 'NOM_LOC_FAC',
    domicilioField: 'DOMICILIO',
    contactoField: 'FAC_CONTACTO',
    nombreRequerido: true,
    path: '/pgrl/v2/localizaciones-factura-clientes',
    // El GET singular v2 no existe para factura; se usa el v1 (mismas columnas).
    getPath: '/pgrl/v1/localizaciones-factura-clientes',
    toolSuffix: 'factura',
  },
  servicio: {
    codField: 'LOC_CLI_SERV',
    nombreField: 'DESCRIPCION',
    domicilioField: 'DOMICILIO',
    contactoField: 'CONTACTO',
    nombreRequerido: true,
    path: '/pgrl/v2/localizaciones-servicio-clientes',
    getPath: '/pgrl/v2/localizaciones-servicio-clientes',
    toolSuffix: 'servicio',
  },
};

const localizacionOptionalFieldsShape = {
  codPais: z.number().int().optional().describe('Código de país (COD_PAIS).'),
  codProvincia: z.string().max(5).optional().describe('Código de provincia (COD_PROVINCIA, 5c).'),
  codPoblacion: z.string().max(40).optional().describe('Código de población (COD_POBLACION, 40c).'),
  codPostal: z.string().max(10).optional().describe('Código postal (COD_POSTAL, 10c).'),
  domicilio: z
    .string()
    .max(100)
    .optional()
    .describe('Domicilio (DOMICILIO / DOMICILIO_ENVIO según el tipo).'),
  email: z.string().max(100).optional().describe('Correo electrónico (E_MAIL, 100c).'),
  telefono1: z.string().max(15).optional().describe('Teléfono 1 (TELEFONO1, 15c).'),
  telefono2: z.string().max(15).optional().describe('Teléfono 2 (TELEFONO2, 15c).'),
  contacto: z
    .string()
    .max(40)
    .optional()
    .describe('Persona de contacto (COB_CONTACTO / ENV_CONTACTO / FAC_CONTACTO / CONTACTO según el tipo).'),
  camposAdicionales: z
    .record(
      z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Las claves deben ser columnas Freemática (MAYUSCULAS_CON_GUION_BAJO)'),
      z.union([z.string(), z.number()]),
    )
    .optional()
    .describe(
      'Campos nativos adicionales del Vo del tipo (ej: cobro → CMCC_IBAN, COD_BANCO; servicio → COD_ZONA, LATITUD_LONGITUD, CMCS_COD_DLG). Ver spec OpenAPI.',
    ),
};

/**
 * Shape del alta de localización. `formaPago` solo lo exige el API en el tipo
 * `cobro`; para el resto es ignorable (se valida en el handler).
 */
export const CreateLocalizacionClienteShape = {
  tipo: z
    .enum(['cobro', 'envio', 'factura', 'servicio'])
    .describe('Tipo de localización: cobro, envio, factura o servicio (instalación).'),
  grupoCliente: z.number().int().describe('Código de grupo de cliente (COD_GRUPO_CLI). Requerido.'),
  codCliente: z.string().max(10).describe('Código de cliente (COD_CLI, 10c). Requerido.'),
  codLocalizacion: z
    .number()
    .int()
    .describe('Código de la localización (LOC_CLI_COB/ENV/FAC/SERV según el tipo). Requerido.'),
  nombre: z
    .string()
    .max(80)
    .optional()
    .describe(
      'Denominación (NOM_LOC_COB / NOM_LOC_ENV / NOM_LOC_FAC / DESCRIPCION). Requerido por el API en cobro, factura y servicio.',
    ),
  formaPago: z
    .string()
    .max(3)
    .optional()
    .describe('Código de forma de pago (COD_FORMA_PAGO). Requerido por el API SOLO en tipo cobro.'),
  ...localizacionOptionalFieldsShape,
};

export const UpdateLocalizacionClienteShape = {
  tipo: z
    .enum(['cobro', 'envio', 'factura', 'servicio'])
    .describe('Tipo de localización: cobro, envio, factura o servicio.'),
  idReg: z
    .string()
    .min(1)
    .describe('idReg opaco de la localización (campo "idReg" en la list tool del tipo).'),
  nombre: z.string().max(80).optional().describe('Nueva denominación.'),
  formaPago: z.string().max(3).optional().describe('Código de forma de pago (solo tipo cobro).'),
  ...localizacionOptionalFieldsShape,
};

export type LocalizacionClienteFields = {
  grupoCliente?: number;
  codCliente?: string;
  codLocalizacion?: number;
  nombre?: string;
  formaPago?: string;
  codPais?: number;
  codProvincia?: string;
  codPoblacion?: string;
  codPostal?: string;
  domicilio?: string;
  email?: string;
  telefono1?: string;
  telefono2?: string;
  contacto?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body del Vo de localización correspondiente al tipo. */
export function buildLocalizacionClienteBody(
  tipo: LocalizacionTipo,
  args: LocalizacionClienteFields,
): Record<string, unknown> {
  const map = LOC_FIELD_MAP[tipo];
  const body: Record<string, unknown> = {};
  setIf(body, 'COD_GRUPO_CLI', args.grupoCliente);
  setIf(body, 'COD_CLI', args.codCliente);
  setIf(body, map.codField, args.codLocalizacion);
  setIf(body, map.nombreField, args.nombre);
  if (tipo === 'cobro') setIf(body, 'COD_FORMA_PAGO', args.formaPago);
  setIf(body, 'COD_PAIS', args.codPais);
  setIf(body, 'COD_PROVINCIA', args.codProvincia);
  setIf(body, 'COD_POBLACION', args.codPoblacion);
  setIf(body, 'COD_POSTAL', args.codPostal);
  setIf(body, map.domicilioField, args.domicilio);
  setIf(body, 'E_MAIL', args.email);
  setIf(body, 'TELEFONO1', args.telefono1);
  setIf(body, 'TELEFONO2', args.telefono2);
  setIf(body, map.contactoField, args.contacto);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}
