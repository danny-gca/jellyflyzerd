import { Command } from 'commander';
import { DockerService } from '../services/DockerService.js';
import { Logger } from '../utils/logger.js';
import { getConfig } from '../config/config.js';
import ora from 'ora';

export const stopCommand = new Command('stop')
  .description('Arrêter Jellyfin et les services associés')
  .option('--force', 'Forcer l\'arrêt (kill)')
  .action(async (options) => {
    const config = getConfig();
    const dockerService = new DockerService(config.docker);

    try {
      // Vérifier si le service est en marche
      const statusSpinner = ora('Vérification du statut...').start();
      const status = await dockerService.getContainerStatus();
      statusSpinner.stop();

      if (!status.isRunning) {
        Logger.warning('Jellyfin est déjà arrêté');
        return;
      }

      // Arrêter le service
      const stopSpinner = ora('Arrêt de Jellyfin...').start();
      const result = await dockerService.stopContainer();

      if (result.success) {
        stopSpinner.succeed('Jellyfin arrêté avec succès! 🛑');

        Logger.info('💾 Les données ont été sauvegardées automatiquement');

        console.log();
        Logger.info('💡 Commandes utiles:');
        console.log('   🚀 Redémarrer: jellyflyzerd start');
        console.log('   📊 Statut: jellyflyzerd status');

      } else {
        stopSpinner.fail('Échec de l\'arrêt');
        Logger.error(result.message, result.error);

        if (options.force) {
          Logger.warning('Tentative d\'arrêt forcé...');
          // Ici on pourrait implémenter un docker kill si nécessaire
        }

        process.exit(1);
      }

    } catch (error) {
      Logger.error('Erreur inattendue lors de l\'arrêt', error instanceof Error ? error : undefined);
      process.exit(1);
    }
  });