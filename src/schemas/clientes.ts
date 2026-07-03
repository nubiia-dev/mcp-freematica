import { z } from 'zod';

/**
 * Zod schemas (raw shapes) y builders de body para las tools de escritura de
 * Clientes y Contactos de Clientes (módulo pgrl, v2).
 *
 * Convención: nombres amigables en castellano traducidos a los campos nativos
 * del API (VoClientes / VoContactosClientes CC_*). Solo se incluyen en el body
 * los campos definidos. Los campos menos comunes se pasan en
 * `camposAdicionales` con su nombre nativo.
 *
 * Límites de longitud según el spec OpenAPI
 * (https://api-config.freefy.cloud/openapi.json).
 */

/** Añade `target[key] = value` solo si value !== undefined. */
function setIf(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) target[key] = value;
}

/** Convierte boolean a los flags '1'/'0' de Freemática. */
function boolFlag(value: boolean): string {
  return value ? '1' : '0';
}

/**
 * Passthrough de campos nativos no expuestos con nombre amigable.
 * Se validan las claves con estilo de columna Freemática (mayúsculas + '_').
 */
const camposAdicionales = (ejemplo: string) =>
  z
    .record(
      z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Las claves deben ser columnas Freemática (MAYUSCULAS_CON_GUION_BAJO)'),
      z.union([z.string(), z.number()]),
    )
    .optional()
    .describe(
      `Campos nativos adicionales del Vo correspondiente (ej: ${ejemplo}). Ver spec OpenAPI para la lista completa.`,
    );

// ---------------------------------------------------------------------------
// Clientes (VoClientes, 109 campos)
// ---------------------------------------------------------------------------

const clienteOptionalFieldsShape = {
  personaFiscal: z.string().max(200).optional().describe('Nombre fiscal (PERSONA_FISCAL, 200c).'),
  contacto: z.string().max(40).optional().describe('Nombre del contacto (CONTACTO, 40c).'),
  cargo: z.string().max(40).optional().describe('Cargo del contacto (CARGO, 40c).'),
  tipoVia: z.string().max(10).optional().describe('Tipo de vía (TIPO_VIA, 10c). Ej: CL, AV.'),
  nombreVia: z.string().max(40).optional().describe('Nombre de la vía (NOMBRE_VIA, 40c).'),
  numero: z.string().max(10).optional().describe('Número de vía (NUMERO, 10c).'),
  codPoblacion: z.string().max(40).optional().describe('Código de población (COD_POBLACION, 40c).'),
  codPostal: z.string().max(10).optional().describe('Código postal (COD_POSTAL, 10c).'),
  codProvincia: z.string().max(5).optional().describe('Código de provincia (COD_PROVINCIA, 5c).'),
  codPais: z.string().max(3).optional().describe('Código de país (COD_PAIS, 3c).'),
  email: z.string().max(100).optional().describe('Correo electrónico (E_MAIL, 100c).'),
  web: z.string().max(100).optional().describe('Página web (WEB, 100c).'),
  telefono1: z.string().max(15).optional().describe('Teléfono 1 (TELEFONO1, 15c).'),
  telefono2: z.string().max(15).optional().describe('Teléfono 2 (TELEFONO2, 15c).'),
  nombreComercial: z.string().max(40).optional().describe('Nombre comercial (NOMBRECOMERCIAL, 40c).'),
  representante: z.string().max(5).optional().describe('Código del comercial (REPRESENTANTE, 5c).'),
  codTipo: z.string().max(2).optional().describe('Código tipo de cliente (COD_TIPO, 2c).'),
  comentarios: z.string().optional().describe('Comentarios libres (COMENTARIOS).'),
  camposAdicionales: camposAdicionales('COD_TARIFA, COD_ZONA, CREDITO, CMC_LINKEDIN'),
};

export const CreateClienteShape = {
  grupoCliente: z.number().int().describe('Código de grupo de cliente (COD_GRUPO_CLI). Requerido.'),
  codCliente: z.string().max(10).describe('Código de cliente (COD_CLI, 10c). Requerido.'),
  nombre: z.string().max(40).describe('Nombre del cliente (NOMBRE_CLI, 40c). Requerido.'),
  nif: z.string().max(15).describe('NIF (15c). Requerido.'),
  tipoImpuesto: z.string().max(4).describe('Tipo de impuesto (TIPO_IMPTO, 4c). Requerido.'),
  divisa: z.string().max(4).describe('Código de divisa (COD_DIVISA, 4c). Ej: EUR. Requerido.'),
  tipoFacturacion: z
    .enum(['D', 'M', 'Q'])
    .describe('Tipo de proceso de facturación (TIPO_FACT): D=Diario, M=Mensual, Q=Quincenal. Requerido.'),
  ...clienteOptionalFieldsShape,
};

export const UpdateClienteShape = {
  idReg: z
    .string()
    .min(1)
    .describe('idReg opaco del cliente (campo "idReg" en freematica_list_clientes).'),
  nombre: z.string().max(40).optional().describe('Nombre del cliente (NOMBRE_CLI, 40c).'),
  nif: z.string().max(15).optional().describe('NIF (15c).'),
  tipoImpuesto: z.string().max(4).optional().describe('Tipo de impuesto (TIPO_IMPTO, 4c).'),
  divisa: z.string().max(4).optional().describe('Código de divisa (COD_DIVISA, 4c).'),
  tipoFacturacion: z
    .enum(['D', 'M', 'Q'])
    .optional()
    .describe('Tipo de proceso de facturación (TIPO_FACT): D/M/Q.'),
  ...clienteOptionalFieldsShape,
};

export type ClienteFields = {
  grupoCliente?: number;
  codCliente?: string;
  nombre?: string;
  nif?: string;
  tipoImpuesto?: string;
  divisa?: string;
  tipoFacturacion?: 'D' | 'M' | 'Q';
  personaFiscal?: string;
  contacto?: string;
  cargo?: string;
  tipoVia?: string;
  nombreVia?: string;
  numero?: string;
  codPoblacion?: string;
  codPostal?: string;
  codProvincia?: string;
  codPais?: string;
  email?: string;
  web?: string;
  telefono1?: string;
  telefono2?: string;
  nombreComercial?: string;
  representante?: string;
  codTipo?: string;
  comentarios?: string;
  camposAdicionales?: Record<string, string | number>;
};

/**
 * Construye el idReg de un cliente a partir de sus códigos naturales.
 * Formato verificado contra el API real: Base64("{GRUPO}__{COD}").
 */
export function buildClienteIdReg(grupoCliente: number, codCliente: string): string {
  return Buffer.from(`${grupoCliente}__${codCliente}`).toString('base64');
}

/** Construye el body VoClientes con los campos definidos. */
export function buildClienteBody(args: ClienteFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'COD_GRUPO_CLI', args.grupoCliente);
  setIf(body, 'COD_CLI', args.codCliente);
  setIf(body, 'NOMBRE_CLI', args.nombre);
  setIf(body, 'NIF', args.nif);
  setIf(body, 'TIPO_IMPTO', args.tipoImpuesto);
  setIf(body, 'COD_DIVISA', args.divisa);
  setIf(body, 'TIPO_FACT', args.tipoFacturacion);
  setIf(body, 'PERSONA_FISCAL', args.personaFiscal);
  setIf(body, 'CONTACTO', args.contacto);
  setIf(body, 'CARGO', args.cargo);
  setIf(body, 'TIPO_VIA', args.tipoVia);
  setIf(body, 'NOMBRE_VIA', args.nombreVia);
  setIf(body, 'NUMERO', args.numero);
  setIf(body, 'COD_POBLACION', args.codPoblacion);
  setIf(body, 'COD_POSTAL', args.codPostal);
  setIf(body, 'COD_PROVINCIA', args.codProvincia);
  setIf(body, 'COD_PAIS', args.codPais);
  setIf(body, 'E_MAIL', args.email);
  setIf(body, 'WEB', args.web);
  setIf(body, 'TELEFONO1', args.telefono1);
  setIf(body, 'TELEFONO2', args.telefono2);
  setIf(body, 'NOMBRECOMERCIAL', args.nombreComercial);
  setIf(body, 'REPRESENTANTE', args.representante);
  setIf(body, 'COD_TIPO', args.codTipo);
  setIf(body, 'COMENTARIOS', args.comentarios);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

// ---------------------------------------------------------------------------
// Contactos de clientes (VoContactosClientes, campos CC_*)
// ---------------------------------------------------------------------------

const contactoOptionalFieldsShape = {
  nombreApellidos: z.string().max(100).optional().describe('Nombre y apellidos (CC_NOM_APELL, 100c).'),
  cargo: z.string().max(40).optional().describe('Cargo (CC_CARGO, 40c).'),
  codCargo: z.string().max(4).optional().describe('Código de cargo (CC_COD_CARGO, 4c). Catálogo cargos-clientes.'),
  telefono: z.string().max(15).optional().describe('Teléfono (CC_TELEFONO, 15c).'),
  movil: z.string().max(15).optional().describe('Móvil (CC_MOBIL, 15c).'),
  email: z.string().max(100).optional().describe('Correo electrónico (CC_EMAIL1, 100c).'),
  nif: z.string().max(15).optional().describe('NIF del contacto (CC_NIF, 15c).'),
  comentarios: z.string().max(1000).optional().describe('Comentarios (CC_COMENTARIOS, 1000c).'),
  contactoPrincipal: z
    .boolean()
    .optional()
    .describe('Contacto principal (CC_CONTACTO_PRINCIPAL): true → "1", false → "0".'),
  decisor: z.boolean().optional().describe('Contacto decisor (CC_DECISOR): true → "1", false → "0".'),
  inactivo: z.boolean().optional().describe('Contacto inactivo (CC_INACTIVO): true → "1", false → "0".'),
  localizacion: z
    .number()
    .int()
    .optional()
    .describe('Código de localización del cliente a la que pertenece (CC_LOCALIZ).'),
  linkedin: z.string().max(200).optional().describe('LinkedIn (CC_LINKEDIN, 200c).'),
  camposAdicionales: camposAdicionales('CC_SALUDO, CC_TRATAMIENTO, CC_MAILING'),
};

export const CreateContactoClienteShape = {
  grupoCliente: z.number().int().describe('Código de grupo de cliente (CC_GRUPO_CLI). Requerido.'),
  codCliente: z.string().max(10).describe('Código de cliente (CC_CLI, 10c). Requerido.'),
  ...contactoOptionalFieldsShape,
};

export const UpdateContactoClienteShape = {
  idReg: z
    .string()
    .min(1)
    .describe('idReg opaco del contacto (campo "idReg" en freematica_list_contactos_clientes).'),
  ...contactoOptionalFieldsShape,
};

export type ContactoClienteFields = {
  grupoCliente?: number;
  codCliente?: string;
  nombreApellidos?: string;
  cargo?: string;
  codCargo?: string;
  telefono?: string;
  movil?: string;
  email?: string;
  nif?: string;
  comentarios?: string;
  contactoPrincipal?: boolean;
  decisor?: boolean;
  inactivo?: boolean;
  localizacion?: number;
  linkedin?: string;
  camposAdicionales?: Record<string, string | number>;
};

/** Construye el body VoContactosClientes con los campos definidos. */
export function buildContactoClienteBody(args: ContactoClienteFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  setIf(body, 'CC_GRUPO_CLI', args.grupoCliente);
  setIf(body, 'CC_CLI', args.codCliente);
  setIf(body, 'CC_NOM_APELL', args.nombreApellidos);
  setIf(body, 'CC_CARGO', args.cargo);
  setIf(body, 'CC_COD_CARGO', args.codCargo);
  setIf(body, 'CC_TELEFONO', args.telefono);
  setIf(body, 'CC_MOBIL', args.movil);
  setIf(body, 'CC_EMAIL1', args.email);
  setIf(body, 'CC_NIF', args.nif);
  setIf(body, 'CC_COMENTARIOS', args.comentarios);
  if (args.contactoPrincipal !== undefined) body['CC_CONTACTO_PRINCIPAL'] = boolFlag(args.contactoPrincipal);
  if (args.decisor !== undefined) body['CC_DECISOR'] = boolFlag(args.decisor);
  if (args.inactivo !== undefined) body['CC_INACTIVO'] = boolFlag(args.inactivo);
  setIf(body, 'CC_LOCALIZ', args.localizacion);
  setIf(body, 'CC_LINKEDIN', args.linkedin);
  if (args.camposAdicionales) Object.assign(body, args.camposAdicionales);
  return body;
}

/**
 * Claves de metadatos de presentación que devuelven los GET de Freemática y
 * que no forman parte del Vo de escritura. Se eliminan antes de hacer el
 * merge de un update (fetch + merge + PUT).
 */
const METADATA_KEYS = ['RowNumber', '_id', '_cellSettings'];

/**
 * Fusiona el estado actual de un registro (obtenido por GET) con los cambios
 * a aplicar, eliminando los metadatos de presentación.
 *
 * ASUNCIÓN EMPÍRICA: los endpoints PUT de Freemática aceptan el objeto
 * completo devuelto por el GET (mismos nombres de columna). Si en pruebas
 * funcionales el API rechazara algún campo de solo lectura, habría que
 * añadirlo a METADATA_KEYS.
 */
export function mergeForUpdate(
  current: Record<string, unknown>,
  changes: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...current, ...changes };
  for (const key of METADATA_KEYS) delete merged[key];
  return merged;
}
