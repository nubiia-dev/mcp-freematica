import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { createFreematicaServer } from '../server.js';

export interface StartStdioOptions {
  client: FreematicaClient;
}

/**
 * Arranca el MCP server sobre el transport stdio.
 *
 * Mantiene el proceso vivo mientras el transport esté abierto (Claude
 * Desktop / Claude Code cierran stdin cuando terminan, lo que dispara
 * el `onclose` del transport y libera el proceso).
 */
export async function startStdio(opts: StartStdioOptions): Promise<void> {
  const server = createFreematicaServer({ client: opts.client });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
