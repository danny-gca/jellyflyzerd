import { Command } from 'commander';
import { DockerService } from '../services/DockerService.js';
import { Logger } from '../utils/logger.js';
import { getConfig } from '../config/config.js';
import ora from 'ora';

export const statusCommand = new Command('status')
  .description('Afficher le statut des services Jellyflyzerd')
  .option('-j, --json', 'Sortie au format JSON')
  .option('-v, --verbose', 'Affichage détaillé')
  .action(async (options) => {
    const spinner = ora('Vérification du statut...').start();

    try {
      const config = getConfig();
      const dockerService = new DockerService(config.docker);

      // Récupérer le statut Jellyfin
      const jellyfinStatus = await dockerService.getContainerStatus();

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify({
          jellyfin: jellyfinStatus,
          timestamp: new Date().toISOString()
        }, null, 2));
        return;
      }

      // Affichage formaté
      Logger.box('🎬 JELLYFLYZERD STATUS', [
        `Version: 2.0.0-alpha.1`,
        `Environnement: ${process.env.NODE_ENV || 'development'}`
      ]);

      console.log();

      // Statut Jellyfin
      console.log('🎬 Jellyfin (Docker):');
      if (jellyfinStatus.isRunning) {
        Logger.success(`  Statut: EN MARCHE`);
        if (jellyfinStatus.pid) {
          console.log(`  🆔 PID: ${jellyfinStatus.pid}`);
        }
        if (jellyfinStatus.uptime) {
          console.log(`  ⏱️  Uptime: ${jellyfinStatus.uptime}`);
        }
        if (jellyfinStatus.user) {
          console.log(`  👤 Utilisateur: ${jellyfinStatus.user === 'root' ? '🔴' : '🟢'} ${jellyfinStatus.user}`);
        }
      } else {
        Logger.error('  Statut: ARRÊTÉ');
      }

      console.log();

      // Accès
      console.log('🌐 Accès:');
      console.log(`  🏠 Local: http://${config.network.localIP}:${config.jellyfin.port}`);
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
      Logger.error('Impossible de récupérer le statut', error instanceof Error ? error : undefined);
      process.exit(1);
    }
  });