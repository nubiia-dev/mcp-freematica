import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FreematicaClient } from './clients/freematica-client.js';
import { FREEMATICA_MCP_INSTRUCTIONS } from './server-instructions.js';
import { registerClientesTools } from './tools/clientes.js';
import { registerContactosClientesTools } from './tools/contactos-clientes.js';
import { registerContratosTools } from './tools/contratos.js';
import { registerMasterDataTools } from './tools/master-data.js';
import { registerOportunidadesNegocioTools } from './tools/oportunidades-negocio.js';

export interface CreateFreematicaServerOptions {
  client: FreematicaClient;
}

/**
 * Factory that builds a fully wired MCP server.
 *
 * Add a new tool group by importing its register* function and calling it
 * below — no other change is needed for the HTTP transport to pick it up.
 */
export function createFreematicaServer(opts: CreateFreematicaServerOptions): McpServer {
  const server = new McpServer(
    { name: 'freematica-mcp', version: '0.4.1' },
    { instructions: FREEMATICA_MCP_INSTRUCTIONS },
  );

  registerContratosTools(server, opts.client);
  registerMasterDataTools(server, opts.client);
  registerClientesTools(server, opts.client);
  registerContactosClientesTools(server, opts.client);
  registerOportunidadesNegocioTools(server, opts.client);

  return server;
}
