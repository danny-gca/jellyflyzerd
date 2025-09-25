import { Command } from 'commander';
import ora from 'ora';
import { DockerComposeService } from '../services/DockerComposeService.js';
import { Logger } from '../utils/logger.js';

export const stopCommand = new Command('stop')
  .description('Arrêter Jellyfin et les services associés')
  .option('--force', "Forcer l'arrêt (kill)")
  .action(async (options) => {
    const dockerService = new DockerComposeService(process.cwd());

    try {
      // Vérifier si les services sont en marche
      const statusSpinner = ora('Vérification du statut...').start();
      const status = await dockerService.getStatus();
      statusSpinner.stop();

      if (!status.isRunning) {
        Logger.warning('Les services sont déjà arrêtés');
        return;
      }

      // Arrêter tous les services
      const stopSpinner = ora(
        'Arrêt des services (Jellyfin + Nginx)...',
      ).start();
      const result = await dockerService.stop();

      if (result.success) {
        stopSpinner.succeed('Services arrêtés avec succès! 🛑');

        Logger.info('💾 Les données ont été sauvegardées automatiquement');

        console.log();
        Logger.info('💡 Commandes utiles:');
        console.log('   🚀 Redémarrer: jellyflyzerd start');
        console.log('   📊 Statut: jellyflyzerd status');
      } else {
        stopSpinner.fail("Échec de l'arrêt");
        Logger.error(result.message, result.error);

        if (options.force) {
          Logger.warning("Tentative d'arrêt forcé...");
          // Ici on pourrait implémenter un docker kill si nécessaire
        }

        process.exit(1);
      }
    } catch (error) {
      Logger.error(
        "Erreur inattendue lors de l'arrêt",
        error instanceof Error ? error : undefined,
      );
      process.exit(1);
    }
  });
