import { execSync } from 'child_process';
import { Logger } from '../utils/logger.js';
import type { ServiceStatus, CommandResult } from '../types/index.js';

export class DockerComposeService {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const result = execSync('docker-compose ps --services --filter="status=running"', {
        cwd: this.projectDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const runningServices = result.trim().split('\n').filter(s => s.length > 0);
      const isJellyfinRunning = runningServices.includes('jellyfin');
      const isNginxRunning = runningServices.includes('nginx');

      return {
        isRunning: isJellyfinRunning,
        extra: {
          services: {
            jellyfin: isJellyfinRunning,
            nginx: isNginxRunning
          },
          runningCount: runningServices.length
        }
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
      execSync('docker-compose up -d', {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      Logger.success('Services démarrés avec succès (Jellyfin + Nginx)');

      return {
        success: true,
        message: 'Tous les services démarrés avec succès'
      };
    } catch (error) {
      const errorMsg = `Échec du démarrage: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async stop(): Promise<CommandResult> {
    try {
      Logger.info('Arrêt de tous les services Docker...');

      // Arrêter tous les services (y compris ceux avec profils)
      execSync('docker-compose down --remove-orphans', {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      Logger.success('Tous les services arrêtés avec succès');

      return {
        success: true,
        message: 'Tous les services arrêtés avec succès'
      };
    } catch (error) {
      const errorMsg = `Échec de l'arrêt: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async restart(): Promise<CommandResult> {
    try {
      Logger.info('Redémarrage de tous les services Docker...');

      // Redémarrer avec profil nginx
      execSync('docker-compose restart', {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // S'assurer que tous les services sont démarrés
      execSync('docker-compose up -d', {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      Logger.success('Services redémarrés avec succès');

      return {
        success: true,
        message: 'Tous les services redémarrés avec succès'
      };
    } catch (error) {
      const errorMsg = `Échec du redémarrage: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async getLogs(service?: string, tail: number = 100): Promise<string> {
    try {
      const serviceArg = service ? service : '';
      const result = execSync(`docker-compose logs --tail=${tail} ${serviceArg}`, {
        cwd: this.projectDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return result;
    } catch (error) {
      Logger.error(`Impossible de récupérer les logs: ${error instanceof Error ? error.message : error}`);
      return '';
    }
  }
}