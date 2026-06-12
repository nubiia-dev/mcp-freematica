import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FreematicaError } from '../clients/base-client.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { PaginationSchema } from '../schemas/pagination.js';
import {
  ListFacturasElectronicasFiltersSchema,
  ListFacturasDocumentosFiltersSchema,
} from '../schemas/facturas-electronicas.js';
import { error, ok, okList } from './helpers.js';
import { loadMaxResponseSizeMb } from '../utils/size-guardrail.js';

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

const LIST_TOOL_NAME = 'freematica_list_facturas_electronicas';
const GET_TOOL_NAME = 'freematica_get_factura_electronica';
const DOCUMENTO_TOOL_NAME = 'freematica_get_factura_documento';
const LOG_TOOL_NAME = 'freematica_get_factura_log';
const EDICOM_INFO_TOOL_NAME = 'freematica_get_edicom_info';
const LIST_DOCUMENTOS_TOOL_NAME = 'freematica_list_facturas_documentos';

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------

const LIST_DESCRIPTION = [
  'Devuelve la lista paginada de facturas electrónicas (Facturae firmadas / EDICOM / FACe) de Freemática.',
  '',
  'Diferente de freematica_list_facturas_cabecera: ésta expone las facturas firmadas y enviadas a AAPP/portales.',
  'Los campos de respuesta usan el prefijo FACED_* (factura electrónica). Campos clave:',
  '  FACED_CODEMP (empresa), FACED_FCHFAC (fecha), FACED_SERIEFRA (serie), FACED_NUMFRA (número),',
  '  FACED_ESTADO / FACED_ESTADO_DESC (estado firma), FACED_LEIDO (flag leído),',
  '  COD_CLI (código cliente), NIF, NOMBRE_CLI (nombre), TIENE_DOC_PDF / TIENE_DOC_XML (tiene documentos).',
  '',
  'Todos los filtros son query params nativos (NO FIQL). Paginación 1-indexed.',
].join('\n');

const GET_DESCRIPTION = [
  'Devuelve el detalle completo de una factura electrónica (Facturae/EDICOM/FACe).',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` (string opaco base64) que aparece en los items de',
  'freematica_list_facturas_electronicas. NO usar FACED_NUMFRA ni otro código natural.',
].join('\n');

const DOCUMENTO_DESCRIPTION = [
  'Devuelve el documento binario (PDF o XML Facturae firmado) de una factura electrónica.',
  '',
  'El documento se devuelve como objeto JSON con los campos de VoFacturasDocumento (FACED_DOCUMENTO_PDF,',
  'FACED_DOCUMENTO_XML, FACED_DOCUMENTO_XML2, etc.) que contienen el contenido codificado en base64.',
  '',
  'Si el tamaño del response supera FREEMATICA_MAX_RESPONSE_SIZE_MB, se devuelve `truncated: true`',
  'con `warning` y `sizeBytes` pero sin el contenido del documento.',
  '',
  'Parámetros opcionales:',
  '  - documentType: tipo de documento a recuperar (ej. "PDF", "XML")',
  '  - actualizaLeido: si true, marca la factura como leída al recuperar el documento',
].join('\n');

const LOG_DESCRIPTION = [
  'Devuelve el log de auditoría de una factura electrónica: envío, recepción, aceptación AAPP, etc.',
  '',
  'El parámetro `id` DEBE ser el campo `idReg` opaco de freematica_list_facturas_electronicas.',
  'Campos de respuesta con prefijo FVCTRLE_*:',
  '  FVCTRLE_CODEMP (empresa), FVCTRLE_FCHFRA (fecha factura), FVCTRLE_SERIEFRA (serie),',
  '  FVCTRLE_NUMFRA (número), FVCTRLE_FCH_MOV (fecha movimiento), FVCTRLE_CODCLI (cliente).',
].join('\n');

const EDICOM_INFO_DESCRIPTION = [
  'Devuelve la configuración de integración con EDICOM (empresa emisora, aplicación, credenciales, URLs).',
  '',
  'Útil para diagnosticar el estado de la integración EDICOM/FACe y verificar la configuración.',
  'Campos de respuesta: EDICOM_COMPANY_ID, EDICOM_APPLICATION, EDICOM_CLIENT_ID, EDICOM_DOMAIN,',
  'EDICOM_SERVER_URL, EDICOM_RAZON_SOCIAL, EDICOM_MESSAGE_FORMAT, entre otros.',
  '',
  'NOTA: incluye campos sensibles (EDICOM_USER, EDICOM_PASSWORD). Usar con precaución.',
].join('\n');

const LIST_DOCUMENTOS_DESCRIPTION = [
  'Descarga masiva de documentos de facturas electrónicas (PDF/XML/ERROR).',
  '',
  'Permite recuperar múltiples documentos a la vez filtrando por identificadores y tipo de documento.',
  'Los documentos se devuelven en formato base64 dentro de los campos documentoPdf, documentoXml, etc.',
  '',
  'CUIDADO: este endpoint puede devolver respuestas muy grandes. Si supera FREEMATICA_MAX_RESPONSE_SIZE_MB',
  'los items se truncarán y se añadirá `truncated: true` + `warning` en la respuesta.',
  '',
  'Campos de respuesta (prefijo VoEFraDoc): empresa, fecha, serie, numFra, documentoPdf, documentoXml,',
  'documentoXml2, decError, decError2, documentoError, documentoGuid, documentoFSDir.',
].join('\n');

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registra las tools de facturas electrónicas (Facturae/EDICOM/FACe) en el servidor MCP.
 *
 * Tools registradas:
 * - `freematica_list_facturas_electronicas`: lista paginada con filtros nativos (NO FIQL).
 * - `freematica_get_factura_electronica`: detalle por idReg opaco.
 * - `freematica_get_factura_documento`: documento binario en base64 con size guardrail.
 * - `freematica_get_factura_log`: log de auditoría de eventos de una factura.
 * - `freematica_get_edicom_info`: configuración de integración EDICOM.
 * - `freematica_list_facturas_documentos`: descarga masiva de documentos con size guardrail.
 *
 * @param server - Instancia del servidor MCP.
 * @param client - Cliente Freemática autenticado.
 */
export function registerFacturasElectronicasTools(server: McpServer, client: FreematicaClient): void {
  // -------------------------------------------------------------------------
  // 1. freematica_list_facturas_electronicas
  // -------------------------------------------------------------------------

  server.tool(
    LIST_TOOL_NAME,
    LIST_DESCRIPTION,
    ListFacturasElectronicasFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({
      page,
      items,
      empresa,
      codCliente,
      fechaDesde,
      fechaHasta,
      estado,
      leido,
      order,
    }): Promise<CallToolResult> => {
      try {
        const result = await client.listFacturasElectronicas({
          page,
          items,
          empresa,
          codCliente,
          fechaDesde,
          fechaHasta,
          estado,
          leido,
          order,
        });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 2. freematica_get_factura_electronica
  // -------------------------------------------------------------------------

  server.tool(
    GET_TOOL_NAME,
    GET_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la factura electrónica (campo "idReg" en los items de freematica_list_facturas_electronicas).',
        ),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const factura = await client.getFacturaElectronica(id);
        return ok(factura) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. freematica_get_factura_documento
  // -------------------------------------------------------------------------

  server.tool(
    DOCUMENTO_TOOL_NAME,
    DOCUMENTO_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la factura electrónica (campo "idReg" en freematica_list_facturas_electronicas).',
        ),
      documentType: z
        .string()
        .optional()
        .describe('Tipo de documento a recuperar: "PDF", "XML". Si no se especifica, devuelve el tipo por defecto.'),
      actualizaLeido: z
        .boolean()
        .optional()
        .describe('Si true, marca la factura como leída al recuperar el documento. Por defecto: false.'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id, documentType, actualizaLeido }): Promise<CallToolResult> => {
      try {
        const result = await client.getFacturaDocumento(id, { documentType, actualizaLeido });
        return ok(result) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. freematica_get_factura_log
  // -------------------------------------------------------------------------

  server.tool(
    LOG_TOOL_NAME,
    LOG_DESCRIPTION,
    {
      id: z
        .string()
        .min(1)
        .describe(
          'idReg opaco de la factura electrónica (campo "idReg" en freematica_list_facturas_electronicas).',
        ),
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ id, page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.getFacturaLog(id, { page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 5. freematica_get_edicom_info
  // -------------------------------------------------------------------------

  server.tool(
    EDICOM_INFO_TOOL_NAME,
    EDICOM_INFO_DESCRIPTION,
    {
      ...PaginationSchema,
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ page, items }): Promise<CallToolResult> => {
      try {
        const result = await client.getEdicomInfo({ page, items });
        return okList({ items: result.items, total: result.total, page, itemsPerPage: items }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. freematica_list_facturas_documentos
  // -------------------------------------------------------------------------

  server.tool(
    LIST_DOCUMENTOS_TOOL_NAME,
    LIST_DOCUMENTOS_DESCRIPTION,
    ListFacturasDocumentosFiltersSchema,
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async ({ documents, documentType }): Promise<CallToolResult> => {
      try {
        const maxMb = loadMaxResponseSizeMb();
        const maxBytes = maxMb * 1024 * 1024;

        const result = await client.listFacturasDocumentos({ documents, documentType });

        // Size guardrail for bulk document download
        const serialized = JSON.stringify(result.items);
        const sizeBytes = Buffer.byteLength(serialized, 'utf8');

        if (sizeBytes > maxBytes) {
          // Truncate items using binary search
          const truncatedItems = truncateItemsToLimit(result.items, maxBytes);
          return ok({
            items: truncatedItems,
            count: truncatedItems.length,
            total: result.total,
            truncated: true,
            warning: [
              `La respuesta ha sido truncada porque superaba el límite de ${maxMb} MB.`,
              `Items devueltos: ${truncatedItems.length} de ${result.items.length} totales.`,
              `Usa el parámetro "documents" con menos identificadores para obtener datos completos.`,
            ].join(' '),
          }) as CallToolResult;
        }

        return okList({ items: result.items, total: result.total }) as CallToolResult;
      } catch (err) {
        if (err instanceof FreematicaError) return error(err) as CallToolResult;
        return error(err instanceof Error ? err : new Error(String(err))) as CallToolResult;
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Trunca un array de items para que su JSON serializado no supere `maxBytes`.
 *
 * Utiliza búsqueda binaria para encontrar eficientemente el número máximo de
 * items que caben dentro del límite.
 *
 * @param items - Items originales.
 * @param maxBytes - Límite en bytes.
 * @returns Subarray de items que cabe dentro del límite.
 */
function truncateItemsToLimit(
  items: Record<string, unknown>[],
  maxBytes: number,
): Record<string, unknown>[] {
  if (items.length === 0) return [];

  // Búsqueda binaria: encuentra el máximo n tal que JSON([0..n-1]) <= maxBytes
  let lo = 0;
  let hi = items.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const size = Buffer.byteLength(JSON.stringify(items.slice(0, mid + 1)), 'utf8');
    if (size <= maxBytes) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return items.slice(0, lo);
}
