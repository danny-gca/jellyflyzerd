import { Command } from 'commander';
import ora from 'ora';
import { getConfig } from '../config/config.js';
import { DockerComposeService } from '../services/DockerComposeService.js';
import { Logger } from '../utils/logger.js';

export const startCommand = new Command('start')
  .description('Démarrer Jellyfin et les services associés')
  .option('--no-check', 'Ne pas vérifier si le service est déjà en marche')
  .option('--force', 'Forcer le redémarrage si déjà en marche')
  .action(async (options) => {
    const config = getConfig();
    const dockerService = new DockerComposeService(process.cwd());

    try {
      // Vérifier le statut actuel
      if (!options.noCheck) {
        const spinner = ora('Vérification du statut actuel...').start();
        const status = await dockerService.getStatus();
        spinner.stop();

        if (status.isRunning && !options.force) {
          Logger.warning("Les services sont déjà en cours d'exécution");
          Logger.info(
            'Utilisez --force pour redémarrer ou "jellyflyzerd stop" pour les arrêter',
          );
          return;
        }

        if (status.isRunning && options.force) {
          Logger.info('Redémarrage forcé demandé...');
          const stopSpinner = ora('Arrêt des services...').start();
          await dockerService.stop();
          stopSpinner.succeed('Services arrêtés');
        }
      }

      // Démarrer les services
      const startSpinner = ora(
        'Démarrage des services (Jellyfin + Nginx)...',
      ).start();
      const result = await dockerService.start();

      if (result.success) {
        startSpinner.succeed('Jellyfin démarré avec succès! 🎉');

        console.log();
        Logger.info('🌐 Accès disponible à:');
        console.log(
          `   🏠 Local: http://${config.network.localIP}:${config.jellyfin.port}`,
        );
        if (config.network.externalDomain) {
          console.log(
            `   🌍 Externe: https://${config.network.externalDomain}`,
          );
        }

        console.log();
        Logger.info('💡 Commandes utiles:');
        console.log('   📊 Statut: jellyflyzerd status');
        console.log('   📋 Logs: jellyflyzerd logs');
        console.log('   🛑 Arrêt: jellyflyzerd stop');
      } else {
        startSpinner.fail('Échec du démarrage');
        Logger.error(result.message, result.error);
        process.exit(1);
      }
    } catch (error) {
      Logger.error(
        'Erreur inattendue lors du démarrage',
        error instanceof Error ? error : undefined,
      );
      process.exit(1);
    }
  });
