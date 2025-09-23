import { Command } from 'commander';
import { DockerService } from '../services/DockerService.js';
import { Logger } from '../utils/logger.js';
import { getConfig } from '../config/config.js';
import ora from 'ora';

export const logsCommand = new Command('logs')
  .description('Afficher les logs de Jellyfin')
  .option('-f, --follow', 'Suivre les logs en temps réel')
  .option('-n, --tail <number>', 'Nombre de lignes à afficher', '100')
  .option('--no-timestamps', 'Masquer les timestamps')
  .action(async (options) => {
    const config = getConfig();
    const dockerService = new DockerService(config.docker);

    try {
      // Vérifier si le conteneur existe
      const statusSpinner = ora('Vérification du conteneur...').start();
      const status = await dockerService.getContainerStatus();
      statusSpinner.stop();

      if (!status.isRunning) {
        Logger.warning('Le conteneur Jellyfin n\'est pas en cours d\'exécution');
        Logger.info('Démarrez-le avec: jellyflyzerd start');
        return;
      }

      const tailNumber = parseInt(options.tail, 10);
      if (isNaN(tailNumber) || tailNumber < 1) {
        Logger.error('Le nombre de lignes doit être un entier positif');
        process.exit(1);
      }

      if (options.follow) {
        Logger.info('📋 Logs Jellyfin (en temps réel) - Ctrl+C pour arrêter');
        console.log('─'.repeat(60));

        // TODO: Implémenter le suivi en temps réel avec stream
        // Pour l'instant, affichage périodique
        Logger.warning('Le mode --follow sera implémenté dans une prochaine version');
        Logger.info('Affichage des derniers logs...');
      }

      const logSpinner = ora(`Récupération des ${tailNumber} dernières lignes...`).start();
      const logs = await dockerService.getLogs(tailNumber);
      logSpinner.stop();

      if (!logs.trim()) {
        Logger.info('Aucun log disponible');
        return;
      }

      console.log('📋 Logs Jellyfin:');
      console.log('─'.repeat(60));

      // Nettoyer et formater les logs
      const logLines = logs.split('\n').filter(line => line.trim());

      logLines.forEach(line => {
        // Nettoyer les caractères de contrôle Docker
        const cleanLine = line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

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
      Logger.error('Erreur lors de la récupération des logs', error instanceof Error ? error : undefined);
      process.exit(1);
    }
  });