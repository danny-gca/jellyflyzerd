import { Command } from 'commander';
import ora from 'ora';
import { getConfig } from '../config/config.js';
import { DockerComposeService } from '../services/DockerComposeService.js';
import { Logger } from '../utils/logger.js';

export const statusCommand = new Command('status')
  .description('Afficher le statut des services Jellyflyzerd')
  .option('-j, --json', 'Sortie au format JSON')
  .option('-v, --verbose', 'Affichage détaillé')
  .action(async (options) => {
    const spinner = ora('Vérification du statut...').start();

    try {
      const config = getConfig();
      const dockerService = new DockerComposeService(process.cwd());

      // Récupérer le statut des services
      const servicesStatus = await dockerService.getStatus();

      spinner.stop();

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              services: servicesStatus,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
        return;
      }

      // Affichage formaté
      Logger.box('🎬 JELLYFLYZERD STATUS', [
        `Version: 2.0.0-alpha.1`,
        `Environnement: ${process.env.NODE_ENV || 'development'}`,
      ]);

      console.log();

      // Statut des services
      console.log('🎬 Services Docker:');
      if (servicesStatus.extra?.services) {
        const { jellyfin, nginx } = servicesStatus.extra.services;
        console.log(
          `  🎬 Jellyfin: ${jellyfin ? '🟢 EN MARCHE' : '🔴 ARRÊTÉ'}`,
        );
        console.log(`  🟦 Nginx: ${nginx ? '🟢 EN MARCHE' : '🔴 ARRÊTÉ'}`);
        console.log(
          `  📈 Services actifs: ${servicesStatus.extra.runningCount}/2`,
        );
      } else {
        if (servicesStatus.isRunning) {
          Logger.success('  Statut: EN MARCHE');
        } else {
          Logger.error('  Statut: ARRÊTÉ');
        }
      }

      console.log();

      // Accès
      console.log('🌐 Accès:');
      console.log(
        `  🏠 Local: http://${config.network.localIP}:${config.jellyfin.port}`,
      );
      if (config.network.externalDomain) {
        console.log(`  🌍 Externe: https://${config.network.externalDomain}`);
      }

      console.log();

      // Infos détaillées si demandées
      if (options.verbose) {
        console.log('🔧 Configuration:');
        console.log(`  📁 Conteneur: ${config.docker.containerName}`);
        console.log(`  🐳 Image: ${config.docker.imageName}`);
        console.log(`  🔌 Port: ${config.jellyfin.port}`);
      }
    } catch (error) {
      spinner.fail('Erreur lors de la vérification du statut');
      Logger.error(
        'Impossible de récupérer le statut',
        error instanceof Error ? error : undefined,
      );
      process.exit(1);
    }
  });
