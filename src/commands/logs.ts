import { Command } from 'commander';
import ora from 'ora';
import { DockerComposeService } from '../services/DockerComposeService.js';
import { Logger } from '../utils/logger.js';

export const logsCommand = new Command('logs')
  .description('Afficher les logs des services')
  .option('-f, --follow', 'Suivre les logs en temps réel')
  .option('-n, --tail <number>', 'Nombre de lignes à afficher', '100')
  .option(
    '-s, --service <service>',
    'Service spécifique (jellyfin|nginx)',
    'jellyfin',
  )
  .option('--no-timestamps', 'Masquer les timestamps')
  .action(async (options) => {
    const dockerService = new DockerComposeService(process.cwd());

    try {
      // Vérifier si les services sont actifs
      const statusSpinner = ora('Vérification des services...').start();
      const status = await dockerService.getStatus();
      statusSpinner.stop();

      if (!status.isRunning) {
        Logger.warning("Les services ne sont pas en cours d'exécution");
        Logger.info('Démarrez-les avec: jellyflyzerd start');
        return;
      }

      const tailNumber = parseInt(options.tail, 10);
      if (Number.isNaN(tailNumber) || tailNumber < 1) {
        Logger.error('Le nombre de lignes doit être un entier positif');
        process.exit(1);
      }

      if (options.follow) {
        Logger.info('📋 Logs Jellyfin (en temps réel) - Ctrl+C pour arrêter');
        console.log('─'.repeat(60));

        // TODO: Implémenter le suivi en temps réel avec stream
        // Pour l'instant, affichage périodique
        Logger.warning(
          'Le mode --follow sera implémenté dans une prochaine version',
        );
        Logger.info('Affichage des derniers logs...');
      }

      const serviceName = options.service === 'nginx' ? 'nginx' : 'jellyfin';
      const logSpinner = ora(
        `Récupération des ${tailNumber} dernières lignes de ${serviceName}...`,
      ).start();
      const logs = await dockerService.getLogs(serviceName, tailNumber);
      logSpinner.stop();

      if (!logs.trim()) {
        Logger.info('Aucun log disponible');
        return;
      }

      console.log(
        `📋 Logs ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}:`,
      );
      console.log('─'.repeat(60));

      // Nettoyer et formater les logs
      const logLines = logs.split('\n').filter((line) => line.trim());

      logLines.forEach((line) => {
        // Nettoyer les caractères de contrôle Docker
        const cleanLine = line
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
          .trim();

        if (cleanLine) {
          // Coloration basique selon le niveau
          if (cleanLine.includes('ERROR') || cleanLine.includes('FATAL')) {
            console.log(`🔴 ${cleanLine}`);
          } else if (cleanLine.includes('WARN')) {
            console.log(`🟡 ${cleanLine}`);
          } else if (cleanLine.includes('INFO')) {
            console.log(`🔵 ${cleanLine}`);
          } else {
            console.log(`   ${cleanLine}`);
          }
        }
      });

      console.log('─'.repeat(60));
      Logger.info(`Affichage des ${logLines.length} dernières lignes`);

      if (!options.follow) {
        console.log();
        Logger.info('💡 Commandes utiles:');
        console.log('   📋 Logs temps réel: jellyflyzerd logs --follow');
        console.log('   📊 Statut: jellyflyzerd status');
      }
    } catch (error) {
      Logger.error(
        'Erreur lors de la récupération des logs',
        error instanceof Error ? error : undefined,
      );
      process.exit(1);
    }
  });
