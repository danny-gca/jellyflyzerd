import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { config } from 'dotenv';
import { Logger } from '../utils/logger.js';

// Charger les variables d'environnement
config();

export const sslCommand = new Command('ssl')
  .description('Gestion des certificats SSL')
  .addCommand(
    new Command('renew')
      .description('Renouveler et synchroniser les certificats SSL')
      .option(
        '--force',
        'Forcer le renouvellement même si le certificat est valide',
      )
      .action(async (options) => {
        await renewSSL(options.force);
      }),
  )
  .addCommand(
    new Command('status')
      .description("Afficher l'état du certificat SSL")
      .action(async () => {
        await checkSSLStatus();
      }),
  );

async function checkSSLStatus(): Promise<void> {
  try {
    const projectDir = process.env.PROJECT_DIR || process.cwd();
    const domain = process.env.EXTERNAL_DOMAIN || 'your-domain.com';
    const sslDir = `${projectDir}/docker/nginx/ssl`;
    const certPath = `${sslDir}/cert.pem`;

    if (!existsSync(certPath)) {
      Logger.error('❌ Aucun certificat SSL trouvé');
      return;
    }

    // Vérifier la date d'expiration
    const certInfo = execSync(
      `openssl x509 -in "${certPath}" -text -noout | grep -E "Not Before|Not After|Subject:"`,
      { encoding: 'utf-8' },
    );

    Logger.box('📜 État du certificat SSL', [
      `Domaine: ${domain}`,
      `Chemin: ${certPath}`,
    ]);

    console.log(certInfo);

    // Calculer les jours restants
    const notAfterMatch = certInfo.match(/Not After : (.+)/);
    if (notAfterMatch) {
      const expiryDate = new Date(notAfterMatch[1]);
      const now = new Date();
      const daysLeft = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysLeft < 0) {
        Logger.error(`❌ Certificat EXPIRÉ depuis ${Math.abs(daysLeft)} jours`);
      } else if (daysLeft < 30) {
        Logger.info(`⚠️  Certificat expire dans ${daysLeft} jours`);
      } else {
        Logger.success(`✅ Certificat valide pour ${daysLeft} jours`);
      }
    }
  } catch (error) {
    Logger.error(`Erreur lors de la vérification du certificat: ${error}`);
  }
}

async function renewSSL(force: boolean = false): Promise<void> {
  try {
    const projectDir = process.env.PROJECT_DIR || process.cwd();
    const domain = process.env.EXTERNAL_DOMAIN;

    if (!domain || domain === 'your-domain.com') {
      Logger.error(
        '❌ EXTERNAL_DOMAIN non configuré dans .env. Veuillez le configurer avant de renouveler le certificat.',
      );
      process.exit(1);
    }

    const sslDir = `${projectDir}/docker/nginx/ssl`;
    const letsencryptDir = `/etc/letsencrypt/live/${domain}`;

    Logger.info('🔐 Démarrage du renouvellement SSL...');
    Logger.info(`Domaine: ${domain}`);

    // Étape 1: Arrêter nginx Docker
    Logger.info('📦 Arrêt temporaire de nginx Docker...');
    try {
      execSync(`cd ${projectDir}/docker && docker-compose stop nginx`, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch (_error) {
      Logger.info('⚠️  Nginx Docker non démarré ou déjà arrêté');
    }

    // Étape 2: Renouveler avec certbot
    Logger.info('🔄 Renouvellement du certificat avec certbot...');

    const certbotCmd = force
      ? `sudo certbot certonly --standalone --force-renewal -d ${domain} --non-interactive --agree-tos --email noreply@${domain}`
      : `sudo certbot renew --standalone --preferred-challenges http`;

    try {
      const output = execSync(certbotCmd, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      if (
        output.includes('Successfully received certificate') ||
        output.includes('Certificate not yet due for renewal')
      ) {
        Logger.success('✅ Certificat renouvelé avec succès (ou déjà valide)');
      } else {
        Logger.info(output);
      }
    } catch (error) {
      Logger.error('❌ Échec du renouvellement certbot');
      Logger.error(String(error));

      // Redémarrer nginx même en cas d'échec
      execSync(`cd ${projectDir}/docker && docker-compose up -d nginx`, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
      process.exit(1);
    }

    // Étape 3: Synchroniser les certificats
    Logger.info('📋 Synchronisation des certificats vers Docker...');

    if (!existsSync(`${letsencryptDir}/fullchain.pem`)) {
      Logger.error(
        `❌ Certificat Let's Encrypt introuvable dans ${letsencryptDir}`,
      );
      process.exit(1);
    }

    try {
      // Copier les certificats
      execSync(`sudo cp ${letsencryptDir}/fullchain.pem ${sslDir}/cert.pem`, {
        encoding: 'utf-8',
      });
      execSync(`sudo cp ${letsencryptDir}/privkey.pem ${sslDir}/key.pem`, {
        encoding: 'utf-8',
      });

      // Corriger les permissions
      const systemUser = process.env.SYSTEM_USER || process.env.USER || 'root';
      execSync(`sudo chown ${systemUser}:${systemUser} ${sslDir}/*.pem`, {
        encoding: 'utf-8',
      });
      execSync(`chmod 644 ${sslDir}/cert.pem`, { encoding: 'utf-8' });
      execSync(`chmod 600 ${sslDir}/key.pem`, { encoding: 'utf-8' });

      Logger.success('✅ Certificats synchronisés');
    } catch (error) {
      Logger.error(`❌ Erreur lors de la synchronisation: ${error}`);
      process.exit(1);
    }

    // Étape 4: Redémarrer nginx
    Logger.info('🔄 Redémarrage de nginx Docker...');
    execSync(`cd ${projectDir}/docker && docker-compose up -d nginx`, {
      encoding: 'utf-8',
      stdio: 'inherit',
    });

    // Vérifier la nouvelle date d'expiration
    const newExpiry = execSync(
      `openssl x509 -in ${sslDir}/cert.pem -text -noout | grep "Not After"`,
      { encoding: 'utf-8' },
    ).trim();

    Logger.success('✅ Renouvellement terminé !');
    Logger.info(`📅 ${newExpiry}`);
  } catch (error) {
    Logger.error(`❌ Erreur inattendue: ${error}`);
    process.exit(1);
  }
}
