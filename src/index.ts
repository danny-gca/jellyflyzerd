#!/usr/bin/env node

// Informations du package
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { logsCommand } from './commands/logs.js';
import { securityCommand } from './commands/security.js';
import { startCommand } from './commands/start.js';
// Import des commandes
import { statusCommand } from './commands/status.js';
import { stopCommand } from './commands/stop.js';
import { Logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8'),
);

// Configuration du CLI principal
const program = new Command();

program
  .name('jellyflyzerd')
  .description('🎬 Gestionnaire Jellyfin moderne avec Docker et TypeScript')
  .version(packageJson.version)
  .helpOption('-h, --help', "Afficher l'aide")
  .configureHelp({
    sortSubcommands: true,
    showGlobalOptions: true,
  });

// Ajout des commandes
program.addCommand(statusCommand);
program.addCommand(startCommand);
program.addCommand(stopCommand);
program.addCommand(logsCommand);
program.addCommand(securityCommand);

// Commande par défaut (afficher le statut si aucune commande)
program.action(() => {
  Logger.box('🎬 JELLYFLYZERD', [
    `Version ${packageJson.version}`,
    'Gestionnaire Jellyfin moderne',
    '',
    'Utilisez --help pour voir les commandes disponibles',
  ]);

  console.log();
  Logger.info('🚀 Commandes principales:');
  console.log('  jellyflyzerd start    - Démarrer Jellyfin');
  console.log('  jellyflyzerd stop     - Arrêter Jellyfin');
  console.log('  jellyflyzerd status   - Statut des services');
  console.log('  jellyflyzerd logs     - Afficher les logs');

  console.log();
  Logger.info('💡 Aide détaillée:');
  console.log('  jellyflyzerd --help   - Liste complète des commandes');
  console.log("  jellyflyzerd <cmd> -h - Aide d'une commande spécifique");
});

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  Logger.error('Erreur inattendue:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error(
    'Promise rejetée:',
    reason instanceof Error ? reason : new Error(String(reason)),
  );
  process.exit(1);
});

// Gestion propre de Ctrl+C
process.on('SIGINT', () => {
  console.log();
  Logger.info('👋 Au revoir!');
  process.exit(0);
});

// Parsing des arguments
program.parse();

// Si aucun argument, afficher l'aide par défaut
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
