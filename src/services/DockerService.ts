import Docker from 'dockerode';
import type {
  CommandResult,
  DockerConfig,
  ServiceStatus,
} from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class DockerService {
  private docker: Docker;
  private config: DockerConfig;

  constructor(config: DockerConfig) {
    this.docker = new Docker();
    this.config = config;
  }

  async getContainerStatus(): Promise<ServiceStatus> {
    try {
      const container = this.docker.getContainer(this.config.containerName);
      const inspect = await container.inspect();

      return {
        isRunning: inspect.State.Running,
        pid: inspect.State.Pid || undefined,
        uptime: this.calculateUptime(inspect.State.StartedAt),
        user: inspect.Config.User || 'root',
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('No such container')
      ) {
        return { isRunning: false };
      }
      throw error;
    }
  }

  async startContainer(): Promise<CommandResult> {
    try {
      Logger.info(`Démarrage du conteneur ${this.config.containerName}...`);

      // Vérifier si le conteneur existe
      let container: Docker.Container;
      try {
        container = this.docker.getContainer(this.config.containerName);
        await container.inspect();
      } catch {
        // Le conteneur n'existe pas, le créer
        container = await this.createContainer();
      }

      await container.start();
      Logger.success(
        `Conteneur ${this.config.containerName} démarré avec succès`,
      );

      return {
        success: true,
        message: 'Conteneur démarré avec succès',
      };
    } catch (error) {
      const errorMsg = `Échec du démarrage du conteneur: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async stopContainer(): Promise<CommandResult> {
    try {
      Logger.info(`Arrêt du conteneur ${this.config.containerName}...`);

      const container = this.docker.getContainer(this.config.containerName);
      await container.stop();

      Logger.success(
        `Conteneur ${this.config.containerName} arrêté avec succès`,
      );

      return {
        success: true,
        message: 'Conteneur arrêté avec succès',
      };
    } catch (error) {
      const errorMsg = `Échec de l'arrêt du conteneur: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async restartContainer(): Promise<CommandResult> {
    try {
      Logger.info(`Redémarrage du conteneur ${this.config.containerName}...`);

      const container = this.docker.getContainer(this.config.containerName);
      await container.restart();

      Logger.success(
        `Conteneur ${this.config.containerName} redémarré avec succès`,
      );

      return {
        success: true,
        message: 'Conteneur redémarré avec succès',
      };
    } catch (error) {
      const errorMsg = `Échec du redémarrage du conteneur: ${error instanceof Error ? error.message : error}`;
      Logger.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getLogs(tail: number = 100): Promise<string> {
    try {
      const container = this.docker.getContainer(this.config.containerName);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: tail,
        timestamps: true,
      });

      return logs.toString();
    } catch (error) {
      Logger.error(
        `Impossible de récupérer les logs: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }
  }

  private async createContainer() {
    Logger.info(`Création du conteneur ${this.config.containerName}...`);

    // Créer les volumes nommés
    await this.ensureVolumes();

    // Configuration du conteneur
    const containerConfig = {
      Image: this.config.imageName,
      name: this.config.containerName,
      // User: '1000:1000', // Temporairement désactivé pour debug
      Env: Object.entries(this.config.environment).map(
        ([key, value]) => `${key}=${value}`,
      ),
      HostConfig: {
        PortBindings: this.formatPortBindings(),
        Binds: this.formatVolumeBind(),
        RestartPolicy: {
          Name: 'unless-stopped',
        },
        SecurityOpt: ['no-new-privileges:true'],
      },
      NetworkingConfig: {
        EndpointsConfig: {
          bridge: {},
        },
      },
    };

    return await this.docker.createContainer(containerConfig);
  }

  private async ensureVolumes() {
    for (const [volumeName] of Object.entries(this.config.volumes)) {
      if (!volumeName.startsWith('/')) {
        // Volume nommé
        try {
          await this.docker.getVolume(volumeName).inspect();
        } catch {
          Logger.info(`Création du volume ${volumeName}...`);
          await this.docker.createVolume({ Name: volumeName });
        }
      }
    }
  }

  private formatPortBindings() {
    const bindings: Record<string, Array<{ HostPort: string }>> = {};
    for (const [containerPort, hostPort] of Object.entries(this.config.ports)) {
      bindings[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
    }
    return bindings;
  }

  private formatVolumeBind() {
    return Object.entries(this.config.volumes).map(([source, target]) => {
      return `${source}:${target}`;
    });
  }

  private calculateUptime(startedAt: string): string {
    const start = new Date(startedAt);
    const now = new Date();
    const uptimeMs = now.getTime() - start.getTime();

    const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor(
      (uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
    );
    const minutes = Math.floor((uptimeMs % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}
