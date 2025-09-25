import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { Logger } from '../utils/logger.js';

export const monitorCommand = new Command('monitor')
  .description('Monitorer les logs et les accès suspects')
  .option('--nginx', 'Monitorer uniquement les logs nginx')
  .option('--jellyfin', 'Monitorer uniquement les logs jellyfin')
  .option('--live', 'Mode temps réel (tail -f)')
  .option('--attacks', 'Afficher uniquement les tentatives d\'attaque')
  .option('--stats', 'Afficher les statistiques d\'accès')
  .option('--tail <n>', 'Nombre de lignes à afficher', '100')
  .action(async (options) => {
    try {
      Logger.info('📊 Démarrage du monitoring des logs...');

      if (options.stats) {
        await showStats();
        return;
      }

      if (options.attacks) {
        await showAttacks(parseInt(options.tail));
        return;
      }

      if (options.live) {
        await startLiveMonitoring(options);
        return;
      }

      // Mode par défaut : afficher les logs récents
      await showRecentLogs(options, parseInt(options.tail));

    } catch (error) {
      Logger.error('Erreur lors du monitoring', error instanceof Error ? error : undefined);
      process.exit(1);
    }
  });

async function showRecentLogs(options: any, tail: number): Promise<void> {
  console.log('📋 LOGS RÉCENTS:\n');

  // Logs Nginx
  if (!options.jellyfin) {
    console.log('🟦 === NGINX ACCESS LOGS ===');
    try {
      const nginxAccessLogs = execSync(`docker logs jellyflyzerd-nginx 2>/dev/null | tail -${tail}`, { encoding: 'utf-8' });
      if (nginxAccessLogs.trim()) {
        console.log(nginxAccessLogs);
      } else {
        console.log('Aucun log nginx récent');
      }
    } catch {
      console.log('❌ Impossible de récupérer les logs nginx');
    }
    console.log('');
  }

  // Logs Jellyfin
  if (!options.nginx) {
    console.log('🎬 === JELLYFIN LOGS ===');
    try {
      const jellyfinLogs = execSync(`docker logs jellyflyzerd-jellyfin 2>/dev/null | tail -${tail}`, { encoding: 'utf-8' });
      if (jellyfinLogs.trim()) {
        console.log(jellyfinLogs);
      } else {
        console.log('Aucun log jellyfin récent');
      }
    } catch {
      console.log('❌ Impossible de récupérer les logs jellyfin');
    }
  }
}

async function showAttacks(tail: number): Promise<void> {
  console.log('🚨 TENTATIVES D\'ATTAQUE DÉTECTÉES:\n');

  const suspiciousPatterns = [
    // Attaques courantes
    '404.*\\.(php|asp|jsp)',
    'admin',
    'wp-admin',
    'wp-login',
    'phpmyadmin',
    'xmlrpc',
    '\\.env',
    'config\\.php',

    // Scanners
    'nikto',
    'nmap',
    'sqlmap',
    'gobuster',
    'dirbuster',

    // User agents suspects
    'python-requests',
    'curl',
    'wget',
    'scanner',

    // Status codes suspects
    ' (40[0-9]|50[0-9]) ',

    // Tentatives de force brute
    'POST.*login',
    'POST.*admin',
  ];

  try {
    const nginxLogs = execSync(`docker logs jellyflyzerd-nginx 2>/dev/null | tail -${tail * 5}`, { encoding: 'utf-8' });

    if (nginxLogs.trim()) {
      const lines = nginxLogs.split('\n');
      let attackCount = 0;

      for (const line of lines) {
        if (line.trim()) {
          for (const pattern of suspiciousPatterns) {
            if (new RegExp(pattern, 'i').test(line)) {
              console.log(`🚨 ${line}`);
              attackCount++;
              break;
            }
          }
        }
      }

      if (attackCount === 0) {
        console.log('✅ Aucune tentative d\'attaque récente détectée');
      } else {
        console.log(`\n📊 Total: ${attackCount} tentative(s) d'attaque détectée(s)`);
      }
    } else {
      console.log('Aucun log à analyser');
    }
  } catch (error) {
    console.log('❌ Impossible d\'analyser les logs d\'attaque');
  }
}

async function showStats(): Promise<void> {
  console.log('📊 STATISTIQUES D\'ACCÈS:\n');

  try {
    const nginxLogs = execSync('docker logs jellyflyzerd-nginx 2>/dev/null | tail -1000', { encoding: 'utf-8' });

    if (nginxLogs.trim()) {
      const lines = nginxLogs.split('\n').filter(line => line.trim());

      // Compter les IPs
      const ips = new Map<string, number>();
      const statusCodes = new Map<string, number>();
      const userAgents = new Map<string, number>();

      for (const line of lines) {
        // Extraire IP (premier élément généralement)
        const ipMatch = line.match(/^(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
          const ip = ipMatch[1];
          ips.set(ip, (ips.get(ip) || 0) + 1);
        }

        // Extraire status code
        const statusMatch = line.match(/" (\d{3}) /);
        if (statusMatch) {
          const status = statusMatch[1];
          statusCodes.set(status, (statusCodes.get(status) || 0) + 1);
        }

        // Extraire User-Agent (entre guillemets, généralement le dernier)
        const uaMatch = line.match(/"([^"]+)"$/);
        if (uaMatch) {
          const ua = uaMatch[1].substring(0, 50); // Tronquer pour lisibilité
          userAgents.set(ua, (userAgents.get(ua) || 0) + 1);
        }
      }

      // Afficher les tops IPs
      console.log('🌐 TOP IPs:');
      const topIps = Array.from(ips.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [ip, count] of topIps) {
        console.log(`  ${ip}: ${count} requêtes`);
      }

      // Afficher les status codes
      console.log('\n📈 STATUS CODES:');
      const sortedStatus = Array.from(statusCodes.entries()).sort((a, b) => b[1] - a[1]);
      for (const [status, count] of sortedStatus) {
        const emoji = status.startsWith('2') ? '✅' : status.startsWith('4') ? '⚠️' : status.startsWith('5') ? '❌' : '📊';
        console.log(`  ${emoji} ${status}: ${count} requêtes`);
      }

      // Afficher les tops User-Agents
      console.log('\n🤖 TOP USER-AGENTS:');
      const topUAs = Array.from(userAgents.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [ua, count] of topUAs) {
        console.log(`  ${count}x: ${ua}`);
      }

      console.log(`\n📊 Total analysé: ${lines.length} requêtes`);

    } else {
      console.log('Aucune donnée à analyser');
    }
  } catch (error) {
    console.log('❌ Impossible de générer les statistiques');
  }
}

async function startLiveMonitoring(options: any): Promise<void> {
  console.log('🔴 MONITORING EN TEMPS RÉEL (Ctrl+C pour arrêter):\n');

  const containers = [];
  if (!options.jellyfin) containers.push('jellyflyzerd-nginx');
  if (!options.nginx) containers.push('jellyflyzerd-jellyfin');

  if (containers.length === 0) {
    containers.push('jellyflyzerd-nginx', 'jellyflyzerd-jellyfin');
  }

  try {
    // Utiliser docker logs -f pour le suivi en temps réel
    const command = `docker logs -f --tail=10 ${containers.join(' ')} 2>&1`;

    console.log(`Commande: ${command}\n`);

    // Exécuter en mode synchrone pour le streaming
    execSync(command, {
      stdio: 'inherit', // Afficher directement dans le terminal
      cwd: process.cwd()
    });
  } catch (error) {
    // Normal si l'utilisateur fait Ctrl+C
    console.log('\n⏹️ Monitoring arrêté');
  }
}