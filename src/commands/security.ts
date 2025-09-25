import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { SecurityChecker } from '../security/SecurityChecker.js';
import { Logger } from '../utils/logger.js';

export const securityCommand = new Command('security')
  .description('Effectuer un audit de sécurité complet du système')
  .option('--json', 'Afficher le résultat en format JSON')
  .option('--save <file>', 'Sauvegarder le rapport dans un fichier')
  .option('--fix', 'Tentative de correction automatique des problèmes mineurs')
  .action(async (options) => {
    try {
      const checker = new SecurityChecker();
      const report = await checker.runAllChecks();

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        checker.displayReport(report);
      }

      if (options.save) {
        writeFileSync(options.save, JSON.stringify(report, null, 2));
        Logger.success(`Rapport sauvegardé dans: ${options.save}`);
      }

      if (options.fix) {
        Logger.info('🔧 Mode correction automatique non encore implémenté');
        Logger.info(
          'Les corrections manuelles sont recommandées pour la sécurité',
        );
      }

      // Code de sortie basé sur les résultats
      if (report.summary.critical_failed > 0) {
        Logger.error('🚨 Problèmes critiques détectés!');
        process.exit(2);
      } else if (report.summary.failed > 0) {
        Logger.warning('❌ Problèmes de sécurité détectés');
        process.exit(1);
      } else if (report.summary.warnings > 0) {
        Logger.info('⚠️  Améliorations de sécurité recommandées');
      } else {
        Logger.success('✅ Audit de sécurité réussi!');
      }
    } catch (error) {
      Logger.error(
        "Erreur lors de l'audit de sécurité",
        error instanceof Error ? error : undefined,
      );
      process.exit(1);
    }
  });
