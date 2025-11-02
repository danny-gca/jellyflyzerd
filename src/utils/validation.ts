import { z } from 'zod';

export const portSchema = z.number().int().min(1).max(65535);

export const ipSchema = z.string().ip();

export const domainSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
    'Invalid domain format',
  );

export const pathSchema = z.string().min(1);

export function validateConfig(config: unknown) {
  const configSchema = z.object({
    jellyfin: z.object({
      port: portSchema,
      dataDir: pathSchema,
      cacheDir: pathSchema,
      logDir: pathSchema,
      configDir: pathSchema,
    }),
    docker: z.object({
      containerName: z.string().min(1),
      imageName: z.string().min(1),
      volumes: z.record(z.string()),
      ports: z.record(z.string()),
      environment: z.record(z.string()),
    }),
    security: z.object({
      enableFirewall: z.boolean(),
      enableFail2ban: z.boolean(),
      enableHTTPS: z.boolean(),
      autoUpdates: z.boolean(),
    }),
    network: z.object({
      localIP: z.string(),
      externalDomain: z.string(),
      httpPort: portSchema,
      httpsPort: portSchema,
    }),
  });

  return configSchema.parse(config);
}
