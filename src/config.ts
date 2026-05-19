import { z } from 'zod';

const AuthConfigSchema = z.object({
  FREEMATICA_BASE_URL: z
    .string()
    .url()
    .default('https://api-p01.clientservicepanel.com/restsat/api'),
  FREEMATICA_AUTH_TOKEN: z.string().min(1),
  FREEMATICA_AUTH_COMPANY: z.string().min(1),
  FREEMATICA_AUTH_ORGANIZATION: z.string().min(1),
  FREEMATICA_AUTH_APP: z.string().min(1),
  FREEMATICA_AUTH_SESSION: z.string().min(1),
});

const HttpConfigSchema = z.object({
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MCP_ALLOWED_ORIGINS: z.string().default('*'),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type HttpConfig = z.infer<typeof HttpConfigSchema>;
export type Config = AuthConfig & HttpConfig;

function formatZodError(err: z.ZodError): string {
  const issues = err.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  return (
    `[freematica-mcp] Invalid configuration:\n${issues}\n\n` +
    `Set the missing/invalid environment variables and restart.`
  );
}

export function loadAuthConfig(): AuthConfig {
  const result = AuthConfigSchema.safeParse(process.env);
  if (!result.success) throw new Error(formatZodError(result.error));
  return result.data;
}

export function loadHttpConfig(): HttpConfig {
  const result = HttpConfigSchema.safeParse(process.env);
  if (!result.success) throw new Error(formatZodError(result.error));
  return result.data;
}

export function loadConfig(): Config {
  return { ...loadAuthConfig(), ...loadHttpConfig() };
}
