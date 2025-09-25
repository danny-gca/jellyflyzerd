import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { Logger } from '../utils/logger.js';

export const monitorCommand = new Command('monitor')
  .description('Monitorer les logs et les accès suspects')
  .option('--nginx', 'Monitorer uniquement les logs nginx')
  .option('--jellyfin', 'Monitorer uniquement les logs jellyfin')
  .option('--live', 'Mode temps réel (tail -f)')
  .option('--attacks', 'Afficher uniquement les tentatives d\'attaque')
  .option('--errors', 'Afficher les erreurs de configuration (4xx/5xx)')
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

      if (options.errors) {
        await showErrors(parseInt(options.tail));
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

async function showErrors(tail: number): Promise<void> {
  console.log('❌ ERREURS DE CONFIGURATION DÉTECTÉES:\n');

  try {
    const nginxLogs = execSync(`docker logs jellyflyzerd-nginx 2>/dev/null | tail -${tail * 3}`, { encoding: 'utf-8' });

    if (nginxLogs.trim()) {
      const lines = nginxLogs.split('\n');
      let errorCount = 0;

      for (const line of lines) {
        if (line.trim()) {
          // Détecter les erreurs 4xx et 5xx (sauf 404 normaux)
          if ((line.includes(' 40') || line.includes(' 50')) &&
              !line.includes(' 404 ') &&
              line.includes(' - ')) {

            if (line.includes(' 502 ')) {
              console.log(`🔧 CONFIG: ${line}`);
            } else if (line.includes(' 50')) {
              console.log(`🚨 SERVEUR: ${line}`);
            } else {
              console.log(`⚠️  CLIENT: ${line}`);
            }
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        console.log('✅ Aucune erreur de configuration récente');
      } else {
        console.log(`\n📊 Total: ${errorCount} erreur(s) détectée(s)`);
        if (nginxLogs.includes(' 502 ')) {
          console.log('\n💡 Erreurs 502: Vérifiez que Jellyfin est démarré et accessible');
        }
      }
    } else {
      console.log('Aucun log à analyser');
    }
  } catch (error) {
    console.log('❌ Impossible d\'analyser les erreurs');
  }
}

async function showAttacks(tail: number): Promise<void> {
  console.log('🚨 TENTATIVES D\'ATTAQUE DÉTECTÉES:\n');

  const suspiciousPatterns = [
    // Attaques courantes (fichiers spécifiques)
    'wp-admin',
    'wp-login',
    'phpmyadmin',
    'xmlrpc',
    '\\.env',
    'config\\.php',
    '/admin/login',
    '/administrator',

    // Extensions dangereuses avec 404
    '404.*\\.(php|asp|jsp|cgi)',

    // Scanners (User-Agent)
    'nikto',
    'nmap',
    'sqlmap',
    'gobuster',
    'dirbuster',

    // User agents automatisés suspects (mais pas curl/wget seuls)
    'python-requests',
    '\\bbot\\b',
    'scanner',
    'vulnerability',

    // Tentatives de force brute (POST sur login)
    'POST.*wp-login',
    'POST.*admin.*login',
    'POST.*administrator',
  ];

  try {
    const nginxLogs = execSync(`docker logs jellyflyzerd-nginx 2>/dev/null | tail -${tail * 5}`, { encoding: 'utf-8' });

    if (nginxLogs.trim()) {
      const lines = nginxLogs.split('\n');
      let attackCount = 0;

      for (const line of lines) {
        if (line.trim()) {
          // Ignorer les logs normaux d'initialisation Docker
          if (line.includes('/docker-entrypoint') || line.includes('Sourcing')) {
            continue;
          }

          // Ignorer les erreurs 502 avec navigateurs normaux (problèmes de config, pas d'attaque)
          if (line.includes(' 502 ') && (line.includes('Mozilla/') || line.includes('Chrome/'))) {
            continue;
          }

          // Ignorer les erreurs SSL malformées (scans automatiques normaux)
          if (line.includes(' 400 ') && line.includes('x16\\x03\\x01')) {
            continue;
          }

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
    if (containers.length === 1) {
      // Un seul conteneur : utiliser docker logs -f directement
      const command = `docker logs -f --tail=10 ${containers[0]} 2>&1`;
      console.log(`Suivi: ${containers[0]}\n`);

      execSync(command, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } else {
      // Plusieurs conteneurs : utiliser docker-compose logs si disponible
      try {
        const composeCommand = 'docker-compose -f docker/docker-compose.yml logs -f --tail=10 nginx jellyfin';
        console.log('Suivi: nginx + jellyfin via docker-compose\n');

        execSync(composeCommand, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch {
        // Fallback : surveiller le premier conteneur seulement
        console.log('⚠️ Impossible de surveiller plusieurs conteneurs simultanément');
        console.log(`Surveillance de ${containers[0]} uniquement:\n`);

        const fallbackCommand = `docker logs -f --tail=10 ${containers[0]} 2>&1`;
        execSync(fallbackCommand, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }
    }
  } catch (error) {
    // Normal si l'utilisateur fait Ctrl+C
    console.log('\n⏹️ Monitoring arrêté');
  }
}