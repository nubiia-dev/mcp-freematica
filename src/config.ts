import { z } from 'zod';

const ConfigSchema = z.object({
  FREEMATICA_BASE_URL: z
    .string()
    .url()
    .default('https://api-p01.clientservicepanel.com/restsat/api'),
  FREEMATICA_AUTH_TOKEN: z.string().min(1),
  FREEMATICA_AUTH_COMPANY: z.string().min(1),
  FREEMATICA_AUTH_ORGANIZATION: z.string().min(1),
  FREEMATICA_AUTH_APP: z.string().min(1),
  FREEMATICA_AUTH_SESSION: z.string().min(1),
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MCP_ALLOWED_ORIGINS: z.string().default('*'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `[freematica-mcp] Invalid configuration:\n${issues}\n\n` +
        `Set the missing/invalid environment variables and restart.`,
    );
  }
  return result.data;
}
