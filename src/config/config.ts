import { config } from 'dotenv';
import { z } from 'zod';
import type { Config } from '../types/index.js';

// Charger les variables d'environnement
config();

// Schéma de validation des variables d'environnement
const envSchema = z.object({
  JELLYFIN_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('8096'),
  JELLYFIN_HTTPS_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('8920'),
  HTTP_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('80'),
  HTTPS_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('443'),
  LOCAL_IP: z.string().optional().default('127.0.0.1'),
  EXTERNAL_DOMAIN: z.string().optional().default(''),
  MEDIA_PATH: z.string().optional().default('/your-media'),
  CONFIG_PATH: z.string().optional().default('/your-config'),
  CACHE_PATH: z.string().optional().default('/your-cache'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  TZ: z.string().optional().default('Europe/Paris'),
});

const env = envSchema.parse(process.env);

export const defaultConfig: Config = {
  jellyfin: {
    port: env.JELLYFIN_PORT,
    dataDir: env.CONFIG_PATH,
    cacheDir: env.CACHE_PATH,
    logDir: './logs',
    configDir: env.CONFIG_PATH,
  },
  docker: {
    containerName: 'jellyflyzerd-jellyfin',
    imageName: 'jellyfin/jellyfin:latest',
    volumes: {
      'jellyflyzerd-config': '/config',
      'jellyflyzerd-cache': '/cache',
      [env.MEDIA_PATH]: '/media:ro',
    },
    ports: {
      [env.JELLYFIN_PORT.toString()]: env.JELLYFIN_PORT.toString(),
      [env.JELLYFIN_HTTPS_PORT.toString()]: env.JELLYFIN_HTTPS_PORT.toString(),
    },
    environment: {
      PUID: '1000',
      PGID: '1000',
      TZ: env.TZ,
    },
  },
  security: {
    enableFirewall: true,
    enableFail2ban: true,
    enableHTTPS: true,
    autoUpdates: true,
  },
  network: {
    localIP: env.LOCAL_IP,
    externalDomain: env.EXTERNAL_DOMAIN,
    httpPort: env.HTTP_PORT,
    httpsPort: env.HTTPS_PORT,
  },
};

export function getConfig(): Config {
  return defaultConfig;
}
