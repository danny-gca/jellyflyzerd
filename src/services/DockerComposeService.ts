import { execSync } from 'node:child_process';
import type { CommandResult, ServiceStatus } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class DockerComposeService {
  private projectDir: string;
  private composeFile: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.composeFile = `${projectDir}/docker/docker-compose.yml`;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      // Utiliser docker ps directement au lieu de docker-compose pour éviter les problèmes de .env
      const result = execSync(
        'docker ps --filter "name=jellyflyzerd-" --format "{{.Names}}"',
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      const runningContainers = result
        .trim()
        .split('\n')
        .filter((s) => s.length > 0);

      const isJellyfinRunning = runningContainers.some((c) =>
        c.includes('jellyfin'),
      );
      const isNginxRunning = runningContainers.some((c) => c.includes('nginx'));
      const isWatchtowerRunning = runningContainers.some((c) =>
        c.includes('watchtower'),
      );
      const isFail2banRunning = runningContainers.some((c) =>
        c.includes('fail2ban'),
      );

      // Compter tous les services
      const servicesCount =
        (isJellyfinRunning ? 1 : 0) +
        (isNginxRunning ? 1 : 0) +
        (isWatchtowerRunning ? 1 : 0) +
        (isFail2banRunning ? 1 : 0);

      return {
        isRunning: isJellyfinRunning || isNginxRunning,
        extra: {
          services: {
            jellyfin: isJellyfinRunning,
            nginx: isNginxRunning,
            watchtower: isWatchtowerRunning,
            fail2ban: isFail2banRunning,
          },
          runningCount: servicesCount,
        },
      };
    } catch (error) {
      Logger.error(`Erreur lors de la vérification du statut: ${error}`);
      return { isRunning: false };
    }
  }

  async start(): Promise<CommandResult> {
    try {
      Logger.info('Démarrage de tous les services Docker...');

      // Démarrer tous les services définis
      execSync(`docker-compose -f "${this.composeFile}" up -d`, {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      Logger.success('Services démarrés avec succès (Jellyfin + Nginx)');

      return {
        success: true,
        message: 'Tous les services démarrés avec succès',
      };
    } catch (error) {
      const errorMsg = `Échec du démarrage: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async stop(): Promise<CommandResult> {
    try {
      Logger.info('Arrêt de tous les services Docker...');

      // Arrêter tous les services (y compris ceux avec profils)
      execSync(
        `docker-compose -f "${this.composeFile}" down --remove-orphans`,
        {
          cwd: this.projectDir,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      Logger.success('Tous les services arrêtés avec succès');

      return {
        success: true,
        message: 'Tous les services arrêtés avec succès',
      };
    } catch (error) {
      const errorMsg = `Échec de l'arrêt: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async restart(): Promise<CommandResult> {
    try {
      Logger.info('Redémarrage de tous les services Docker...');

      // Redémarrer avec profil nginx
      execSync(`docker-compose -f "${this.composeFile}" restart`, {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // S'assurer que tous les services sont démarrés
      execSync(`docker-compose -f "${this.composeFile}" up -d`, {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      Logger.success('Services redémarrés avec succès');

      return {
        success: true,
        message: 'Tous les services redémarrés avec succès',
      };
    } catch (error) {
      const errorMsg = `Échec du redémarrage: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getLogs(service?: string, tail: number = 100): Promise<string> {
    try {
      const serviceArg = service ? service : '';
      const result = execSync(
        `docker-compose -f "${this.composeFile}" logs --tail=${tail} ${serviceArg}`,
        {
          cwd: this.projectDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      return result;
    } catch (error) {
      Logger.error(
        `Impossible de récupérer les logs: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }
  }
}
