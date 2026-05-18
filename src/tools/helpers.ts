import { FreematicaError, type FreematicaErrorCode } from '../clients/base-client.js';

export interface ToolTextContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolTextContent[];
  isError?: boolean;
}

export function ok(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function error(codeOrErr: FreematicaErrorCode | Error, message?: string): ToolResult {
  let code: FreematicaErrorCode;
  let msg: string;

  if (codeOrErr instanceof FreematicaError) {
    code = codeOrErr.code;
    msg = codeOrErr.message;
  } else if (codeOrErr instanceof Error) {
    code = 'unexpected_error';
    msg = codeOrErr.message;
  } else {
    code = codeOrErr;
    msg = message ?? code;
  }

  return {
    content: [{ type: 'text', text: JSON.stringify({ error: code, message: msg }, null, 2) }],
    isError: true,
  };
}
