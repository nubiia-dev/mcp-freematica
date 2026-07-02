import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { FreematicaClient } from '../clients/freematica-client.js';
import { loadWritesConfig } from '../config.js';
import { createFreematicaServer } from '../server.js';

export interface StartStdioOptions {
  client: FreematicaClient;
  /** Override del flag de escrituras; si se omite se lee FREEMATICA_ENABLE_WRITES. */
  enableWrites?: boolean;
}

/**
 * Arranca el MCP server sobre el transport stdio.
 *
 * Mantiene el proceso vivo mientras el transport esté abierto (Claude
 * Desktop / Claude Code cierran stdin cuando terminan, lo que dispara
 * el `onclose` del transport y libera el proceso).
 */
export async function startStdio(opts: StartStdioOptions): Promise<void> {
  const enableWrites = opts.enableWrites ?? loadWritesConfig().FREEMATICA_ENABLE_WRITES;
  const server = createFreematicaServer({ client: opts.client, enableWrites });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
