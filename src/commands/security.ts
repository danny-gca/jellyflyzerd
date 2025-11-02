import { writeFileSync } from 'node:fs';
import { Command } from 'commander';
import inquirer from 'inquirer';
import type { AutoFixResult } from '../security/SecurityChecker.js';
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

      // Mode correction automatique
      if (options.fix) {
        await handleAutoFix(checker);
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

// Fonction de gestion de la correction automatique
async function handleAutoFix(checker: SecurityChecker): Promise<void> {
  const fixableChecks = checker.getFixableChecks();

  if (fixableChecks.length === 0) {
    Logger.info('ℹ️  Aucune correction automatique disponible pour le moment.');
    return;
  }

  console.log('\n🔧 CORRECTIONS AUTOMATIQUES DISPONIBLES\n');
  console.log(
    `${fixableChecks.length} problème(s) peuvent être corrigés automatiquement:\n`,
  );

  for (const fixable of fixableChecks) {
    console.log(`  • ${fixable.check.name}: ${fixable.check.message}`);
    if (fixable.check.recommendation) {
      console.log(`    💡 ${fixable.check.recommendation}`);
    }
  }

  console.log('');

  // Demander confirmation globale
  const { confirmFix } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmFix',
      message:
        'Voulez-vous procéder aux corrections automatiques disponibles ?',
      default: false,
    },
  ]);

  if (!confirmFix) {
    Logger.info('Correction automatique annulée.');
    return;
  }

  // Exécuter les corrections
  const results: AutoFixResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const fixable of fixableChecks) {
    console.log(`\n🔄 Correction de: ${fixable.check.name}...`);

    // Confirmation individuelle si requise
    if (fixable.requiresConfirmation) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Confirmer la correction de "${fixable.check.name}" ?`,
          default: true,
        },
      ]);

      if (!confirm) {
        Logger.info(`⏭️  Ignoré: ${fixable.check.name}`);
        continue;
      }
    }

    // Exécuter la correction
    try {
      const result = await fixable.fixFunction();
      results.push(result);

      if (result.success) {
        Logger.success(`✅ ${result.message}`);
        successCount++;
      } else {
        Logger.error(`❌ ${result.message}`);
        if (result.error) {
          Logger.error(`   Erreur: ${result.error}`);
        }
        failCount++;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Logger.error(`❌ Échec: ${errorMsg}`);
      failCount++;
    }
  }

  // Résumé des corrections
  console.log('\n📊 RÉSUMÉ DES CORRECTIONS\n');
  console.log(`  ✅ Réussies: ${successCount}`);
  console.log(`  ❌ Échouées: ${failCount}`);
  console.log(`  📝 Total: ${successCount + failCount}`);

  if (successCount > 0) {
    console.log('\n💡 Relancez un audit pour vérifier les améliorations:');
    console.log('   jellyflyzerd security');
  }
}
