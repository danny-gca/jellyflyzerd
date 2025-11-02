import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { config } from 'dotenv';
import { Logger } from '../utils/logger.js';

// Charger les variables d'environnement depuis .env
config();

export interface SecurityCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'not_applicable';
  message: string;
  recommendation?: string;
  critical: boolean;
}

export interface SecurityReport {
  timestamp: string;
  hostname: string;
  checks: SecurityCheck[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
    critical_failed: number;
  };
}

export interface AutoFixResult {
  checkName: string;
  success: boolean;
  message: string;
  error?: string;
}

export interface FixableCheck {
  check: SecurityCheck;
  fixFunction: () => Promise<AutoFixResult>;
  requiresConfirmation: boolean;
}

export class SecurityChecker {
  private checks: SecurityCheck[] = [];
  private fixableChecks: FixableCheck[] = [];

  async runAllChecks(): Promise<SecurityReport> {
    Logger.info("🔒 Démarrage de l'audit de sécurité...");

    this.checks = [];

    // Vérifications système
    await this.checkFirewall();
    await this.checkFail2ban();
    await this.checkSSH();
    await this.checkUsers();
    await this.checkPermissions();

    // Vérifications Docker
    await this.checkDockerSecurity();
    await this.checkContainerPrivileges();
    await this.checkDockerNetworking();

    // Vérifications réseau
    await this.checkOpenPorts();
    await this.checkSSLCertificates();

    // Vérifications Jellyfin spécifiques
    await this.checkJellyfinSecurity();
    await this.checkExternalAccess();

    // Vérifications système
    await this.checkSystemUpdates();
    await this.checkLogRotation();

    return this.generateReport();
  }

  private async checkFirewall(): Promise<void> {
    try {
      // Vérifier UFW
      try {
        const ufwStatus = execSync('ufw status 2>/dev/null', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (ufwStatus.includes('Status: active')) {
          this.addCheck(
            'UFW Firewall',
            'pass',
            'UFW est actif et configuré',
            '',
            false,
          );
        } else {
          this.addCheck(
            'UFW Firewall',
            'warn',
            "UFW n'est pas actif",
            'Activez UFW: sudo ufw enable',
            false,
          );
        }
      } catch {
        // Vérifier iptables (sans afficher les erreurs)
        try {
          const iptables = execSync(
            'sudo iptables -L 2>/dev/null | head -20 || echo "no_access"',
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
          );
          if (
            iptables.includes('no_access') ||
            iptables.includes('Permission denied')
          ) {
            this.addCheck(
              'Firewall',
              'warn',
              'Impossible de vérifier le firewall (permissions)',
              'Vérifiez UFW avec: sudo ufw status',
              false,
            );
          } else if (iptables.includes('DROP') || iptables.includes('REJECT')) {
            this.addCheck(
              'Firewall',
              'pass',
              'Règles de firewall détectées (iptables)',
              '',
              false,
            );
          } else {
            this.addCheck(
              'Firewall',
              'warn',
              'Aucune règle de firewall restrictive détectée',
              'Configurez un firewall (ufw/iptables)',
              false,
            );
          }
        } catch {
          this.addCheck(
            'Firewall',
            'warn',
            'Vérification firewall impossible (WSL/permissions)',
            'Vérifiez manuellement: sudo ufw status',
            false,
          );
        }
      }
    } catch (_error) {
      this.addCheck(
        'Firewall',
        'warn',
        'Erreur lors de la vérification du firewall',
        'Vérifiez manuellement le firewall',
        false,
      );
    }
  }

  private async checkFail2ban(): Promise<void> {
    try {
      // Même en Docker local, fail2ban est utile pour l'accès externe via domaine configuré
      try {
        execSync('which fail2ban-server 2>/dev/null', {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        try {
          const fail2banStatus = execSync(
            'systemctl is-active fail2ban 2>/dev/null',
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
          ).trim();
          if (fail2banStatus === 'active') {
            this.addCheck(
              'Fail2ban',
              'pass',
              "Fail2ban actif (recommandé pour l'accès externe)",
              '',
              false,
            );
          } else {
            this.addCheck(
              'Fail2ban',
              'warn',
              "Fail2ban non actif mais recommandé pour l'accès externe",
              'Démarrez fail2ban: sudo systemctl start fail2ban',
              false,
            );
          }
        } catch {
          // WSL limitation
          this.addCheck(
            'Fail2ban',
            'warn',
            "Fail2ban installé mais non démarré (WSL) - recommandé pour l'accès externe",
            'Configurez fail2ban pour protéger contre les attaques sur votre domaine externe',
            false,
          );
        }
      } catch {
        this.addCheck(
          'Fail2ban',
          'warn',
          "Fail2ban non installé - recommandé pour l'accès externe",
          'Installez fail2ban pour protéger votre domaine externe: sudo apt install fail2ban',
          false,
        );
      }
    } catch {
      this.addCheck(
        'Fail2ban',
        'warn',
        'Impossible de vérifier fail2ban',
        "Protection recommandée pour l'accès externe",
        false,
      );
    }
  }

  private async checkSSH(): Promise<void> {
    // Pour un environnement Docker local, SSH n'est pas exposé
    // L'accès se fait via Docker exec ou l'interface web Jellyfin
    this.addCheck(
      'SSH Config',
      'not_applicable',
      'SSH non applicable dans un environnement Docker local',
      "L'accès se fait via l'interface web Jellyfin",
      false,
    );
  }

  private async checkUsers(): Promise<void> {
    try {
      // Vérifier les utilisateurs avec shell
      const users = execSync(
        'cat /etc/passwd | grep -E "/bin/(bash|sh|zsh)" | cut -d: -f1',
        { encoding: 'utf-8' },
      )
        .trim()
        .split('\n');
      const nonSystemUsers = users.filter(
        (user) => !['root', 'sync', 'halt', 'shutdown'].includes(user),
      );

      if (nonSystemUsers.length <= 2) {
        this.addCheck(
          'System Users',
          'pass',
          `${nonSystemUsers.length} utilisateur(s) avec shell: ${nonSystemUsers.join(', ')}`,
          '',
          false,
        );
      } else {
        this.addCheck(
          'System Users',
          'warn',
          `${nonSystemUsers.length} utilisateurs avec shell`,
          'Vérifiez les comptes utilisateurs nécessaires',
          false,
        );
      }

      // Vérifier les utilisateurs sans mot de passe (nécessite sudo)
      try {
        const noPassword = execSync(
          'sudo awk -F: \'($2 == "" || $2 == "!" || $2 == "*") {print $1}\' /etc/shadow 2>/dev/null || echo "no_access"',
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
        ).trim();
        if (
          noPassword === 'no_access' ||
          noPassword.includes('Permission denied')
        ) {
          this.addCheck(
            'Password Policy',
            'warn',
            'Impossible de vérifier les mots de passe (permissions)',
            'Exécutez avec sudo pour vérifier',
            false,
          );
        } else if (noPassword) {
          const accounts = noPassword
            .split('\n')
            .filter(
              (acc) =>
                ![
                  'daemon',
                  'bin',
                  'sys',
                  'sync',
                  'games',
                  'man',
                  'lp',
                  'mail',
                  'news',
                  'uucp',
                  'proxy',
                  'www-data',
                  'backup',
                  'list',
                  'irc',
                  'gnats',
                  'nobody',
                  'systemd-network',
                  'systemd-resolve',
                  'messagebus',
                  'systemd-timesync',
                  'syslog',
                  '_apt',
                  'tss',
                  'uuidd',
                  'tcpdump',
                  'landscape',
                  'pollinate',
                  'fwupd-refresh',
                  'usbmux',
                  'lxd',
                  'dnsmasq',
                ].includes(acc),
            );

          if (accounts.length > 0) {
            this.addCheck(
              'Password Policy',
              'warn',
              `Comptes sans mot de passe: ${accounts.join(', ')}`,
              'Vérifiez les comptes sans mot de passe',
              false,
            );
          } else {
            this.addCheck(
              'Password Policy',
              'pass',
              'Pas de comptes utilisateurs sans mot de passe',
              '',
              false,
            );
          }
        }
      } catch {
        this.addCheck(
          'Password Policy',
          'warn',
          'Impossible de vérifier les mots de passe (WSL/permissions)',
          'Vérification non critique dans WSL',
          false,
        );
      }
    } catch (error) {
      this.addCheck(
        'System Users',
        'fail',
        `Erreur lors de la vérification des utilisateurs: ${error}`,
        '',
        false,
      );
    }
  }

  private async checkPermissions(): Promise<void> {
    try {
      // Vérifier les fichiers avec permissions trop larges
      const worldWritable = execSync(
        'find /etc /usr /var -type f -perm -002 2>/dev/null | head -10',
        { encoding: 'utf-8' },
      ).trim();
      if (worldWritable) {
        this.addCheck(
          'File Permissions',
          'warn',
          "Fichiers système avec permissions d'écriture globale trouvés",
          `Vérifiez les permissions: ${worldWritable.split('\n')[0]}`,
          false,
        );
      } else {
        this.addCheck(
          'File Permissions',
          'pass',
          "Pas de fichiers système avec permissions d'écriture globale",
          '',
          false,
        );
      }

      // Vérifier les fichiers SUID
      try {
        const suidFiles = execSync(
          'find /usr /bin /sbin -perm -4000 2>/dev/null | wc -l',
          { encoding: 'utf-8' },
        ).trim();
        const suidCount = parseInt(suidFiles, 10);
        if (suidCount < 20) {
          this.addCheck(
            'SUID Files',
            'pass',
            `${suidCount} fichiers SUID trouvés (normal)`,
            '',
            false,
          );
        } else {
          this.addCheck(
            'SUID Files',
            'warn',
            `${suidCount} fichiers SUID trouvés`,
            'Vérifiez les fichiers SUID non nécessaires',
            false,
          );
        }
      } catch {
        this.addCheck(
          'SUID Files',
          'warn',
          'Impossible de vérifier les fichiers SUID',
          '',
          false,
        );
      }
    } catch (error) {
      this.addCheck(
        'File Permissions',
        'fail',
        `Erreur lors de la vérification des permissions: ${error}`,
        '',
        false,
      );
    }
  }

  private async checkDockerSecurity(): Promise<void> {
    try {
      // Vérifier si Docker daemon est sécurisé
      const dockerInfo = execSync(
        'docker info 2>/dev/null | grep -i "security"',
        { encoding: 'utf-8' },
      ).trim();
      if (dockerInfo.includes('seccomp') || dockerInfo.includes('apparmor')) {
        this.addCheck(
          'Docker Security',
          'pass',
          'Docker utilise des profils de sécurité',
          '',
          false,
        );
      } else {
        this.addCheck(
          'Docker Security',
          'warn',
          'Profils de sécurité Docker non détectés',
          'Vérifiez la configuration des profils de sécurité Docker',
          false,
        );
      }

      // Vérifier le socket Docker
      if (existsSync('/var/run/docker.sock')) {
        const socketStat = statSync('/var/run/docker.sock');
        const mode = (socketStat.mode & 0o777).toString(8);
        if (mode === '660') {
          this.addCheck(
            'Docker Socket',
            'pass',
            'Socket Docker a des permissions appropriées',
            '',
            false,
          );
        } else {
          this.addCheck(
            'Docker Socket',
            'warn',
            `Socket Docker a des permissions ${mode}`,
            'Permissions recommandées: 660',
            false,
          );
        }
      }

      // Vérifier les conteneurs privilégiés
      try {
        const privilegedContainers = execSync(
          'docker ps --format "table {{.Names}}\\t{{.Status}}" --filter="label=privileged=true" 2>/dev/null',
          { encoding: 'utf-8' },
        ).trim();
        if (privilegedContainers && !privilegedContainers.includes('NAMES')) {
          this.addCheck(
            'Privileged Containers',
            'warn',
            'Conteneurs privilégiés détectés',
            'Évitez les conteneurs privilégiés si possible',
            false,
          );
        } else {
          this.addCheck(
            'Privileged Containers',
            'pass',
            'Aucun conteneur privilégié détecté',
            '',
            false,
          );
        }
      } catch {
        this.addCheck(
          'Privileged Containers',
          'pass',
          'Vérification des conteneurs privilégiés OK',
          '',
          false,
        );
      }
    } catch (error) {
      this.addCheck(
        'Docker Security',
        'fail',
        `Erreur lors de la vérification Docker: ${error}`,
        '',
        false,
      );
    }
  }

  private async checkContainerPrivileges(): Promise<void> {
    try {
      // Vérifier les conteneurs Jellyflyzerd
      const jellyfinContainer = execSync(
        'docker inspect jellyflyzerd-jellyfin 2>/dev/null || echo "not_found"',
        { encoding: 'utf-8' },
      );

      if (!jellyfinContainer.includes('not_found')) {
        const containerConfig = JSON.parse(jellyfinContainer);
        const config = containerConfig[0]?.Config;
        const hostConfig = containerConfig[0]?.HostConfig;

        // Vérifier si le conteneur tourne en root
        if (config?.User && config.User !== '0:0' && config.User !== 'root') {
          this.addCheck(
            'Container User',
            'pass',
            `Conteneur Jellyfin utilise l'utilisateur: ${config.User}`,
            '',
            false,
          );
        } else {
          const check = this.addCheck(
            'Container User',
            'warn',
            'Conteneur Jellyfin pourrait tourner en root',
            'Configurez un utilisateur non-root',
            false,
          );
          this.addFixableCheck(check, () => this.fixContainerUser(), true);
        }

        // Vérifier les capabilities
        if (hostConfig?.CapDrop && hostConfig.CapDrop.length > 0) {
          this.addCheck(
            'Container Capabilities',
            'pass',
            'Capabilities Docker restreintes',
            '',
            false,
          );
        } else {
          const check = this.addCheck(
            'Container Capabilities',
            'warn',
            'Aucune restriction de capabilities détectée',
            "Considérez l'ajout de --cap-drop ALL",
            false,
          );
          this.addFixableCheck(
            check,
            () => this.fixContainerCapabilities(),
            true,
          );
        }

        // Vérifier les volumes
        const mounts = containerConfig[0]?.Mounts || [];
        const bindMounts = mounts.filter(
          (mount: { Type: string; Mode: string; Source: string }) =>
            mount.Type === 'bind',
        );
        if (
          bindMounts.some(
            (mount: { Type: string; Mode: string; Source: string }) =>
              mount.Mode.includes('rw') &&
              (mount.Source.includes('/') || mount.Source.includes('/etc')),
          )
        ) {
          this.addCheck(
            'Container Volumes',
            'warn',
            'Volumes système montés en écriture',
            'Limitez les montages système en lecture seule',
            false,
          );
        } else {
          this.addCheck(
            'Container Volumes',
            'pass',
            'Configuration des volumes appropriée',
            '',
            false,
          );
        }
      } else {
        this.addCheck(
          'Container Security',
          'not_applicable',
          'Conteneur Jellyfin non trouvé',
          '',
          false,
        );
      }
    } catch (error) {
      this.addCheck(
        'Container Security',
        'fail',
        `Erreur lors de la vérification du conteneur: ${error}`,
        '',
        false,
      );
    }
  }

  private async checkDockerNetworking(): Promise<void> {
    try {
      // Vérifier l'isolement réseau Docker
      const networks = execSync('docker network ls --format "{{.Name}}"', {
        encoding: 'utf-8',
      })
        .trim()
        .split('\n');
      const hasCustomNetwork = networks.some((network) =>
        network.includes('jellyflyzerd'),
      );

      if (hasCustomNetwork) {
        this.addCheck(
          'Docker Network',
          'pass',
          'Réseau Docker isolé configuré',
          '',
          false,
        );
      } else {
        this.addCheck(
          'Docker Network',
          'warn',
          'Utilisation du réseau Docker par défaut',
          'Considérez un réseau isolé pour plus de sécurité',
          false,
        );
      }

      // Vérifier l'exposition des ports
      const jellyfinPorts = execSync(
        'docker port jellyflyzerd-jellyfin 2>/dev/null || echo "not_running"',
        { encoding: 'utf-8' },
      ).trim();
      if (jellyfinPorts !== 'not_running') {
        const exposedPorts = jellyfinPorts.split('\n').length;
        if (exposedPorts <= 3) {
          this.addCheck(
            'Docker Port Exposure',
            'pass',
            `Exposition minimale des ports: ${exposedPorts} port(s)`,
            '',
            false,
          );
        } else {
          this.addCheck(
            'Docker Port Exposure',
            'warn',
            `Nombreux ports exposés: ${exposedPorts}`,
            "Limitez l'exposition des ports au minimum nécessaire",
            false,
          );
        }
      } else {
        this.addCheck(
          'Docker Port Exposure',
          'not_applicable',
          'Conteneur non démarré',
          '',
          false,
        );
      }
    } catch (_error) {
      this.addCheck(
        'Docker Network Security',
        'warn',
        'Impossible de vérifier la configuration réseau Docker',
        'Vérifiez la configuration réseau manuellement',
        false,
      );
    }
  }

  private async checkOpenPorts(): Promise<void> {
    try {
      // Vérifier les ports ouverts
      const netstat = execSync('netstat -tuln 2>/dev/null || ss -tuln', {
        encoding: 'utf-8',
      });
      const lines = netstat.split('\n');
      const listeningPorts = lines
        .filter((line) => line.includes('LISTEN') || line.includes('State'))
        .filter((line) => !line.includes('State'))
        .map((line) => {
          const parts = line.split(/\s+/);
          return parts
            .find((part) => part.includes(':'))
            ?.split(':')
            .pop();
        })
        .filter(
          (port): port is string =>
            port !== undefined && !Number.isNaN(parseInt(port, 10)),
        )
        .map((port) => parseInt(port, 10))
        .filter((port, index, array) => array.indexOf(port) === index)
        .sort((a, b) => a - b);

      const commonPorts = [22, 80, 443, 8096, 8920];
      const unexpectedPorts = listeningPorts.filter(
        (port) => !commonPorts.includes(port) && port < 10000,
      );

      if (unexpectedPorts.length === 0) {
        this.addCheck(
          'Open Ports',
          'pass',
          `Ports ouverts: ${listeningPorts.join(', ')}`,
          '',
          false,
        );
      } else {
        this.addCheck(
          'Open Ports',
          'warn',
          `Ports inattendus ouverts: ${unexpectedPorts.join(', ')}`,
          'Vérifiez la nécessité de ces ports',
          false,
        );
      }
    } catch (error) {
      this.addCheck(
        'Open Ports',
        'fail',
        `Erreur lors de la vérification des ports: ${error}`,
        '',
        false,
      );
    }
  }

  private async checkSSLCertificates(): Promise<void> {
    try {
      // Vérifier les certificats SSL (dans le répertoire Docker du projet)
      const projectDir = process.env.PROJECT_DIR || process.cwd();
      const sslDir = `${projectDir}/docker/nginx/ssl`;
      if (existsSync(sslDir)) {
        const certFile = `${sslDir}/cert.pem`;
        const keyFile = `${sslDir}/key.pem`;

        if (existsSync(certFile) && existsSync(keyFile)) {
          // Vérifier la validité du certificat
          try {
            const certInfo = execSync(
              `openssl x509 -in "${certFile}" -text -noout | grep "Not After"`,
              { encoding: 'utf-8' },
            );
            this.addCheck(
              'SSL Certificate',
              'pass',
              `Certificat SSL présent. ${certInfo?.trim() || ''}`,
              '',
              false,
            );

            // Vérifier les permissions du certificat
            const keyStats = statSync(keyFile);
            const keyMode = (keyStats.mode & 0o777).toString(8);
            if (keyMode === '600' || keyMode === '400') {
              this.addCheck(
                'SSL Key Permissions',
                'pass',
                'Permissions de la clé SSL appropriées',
                '',
                false,
              );
            } else {
              this.addCheck(
                'SSL Key Permissions',
                'warn',
                `Permissions de la clé SSL: ${keyMode}`,
                'Recommandé: chmod 600 sur la clé privée',
                false,
              );
            }
          } catch {
            this.addCheck(
              'SSL Certificate',
              'warn',
              'Certificat SSL présent mais validation échouée',
              'Vérifiez la validité du certificat',
              false,
            );
          }
        } else {
          this.addCheck(
            'SSL Certificate',
            'warn',
            'Certificat SSL manquant',
            'Configurez un certificat SSL valide',
            false,
          );
        }
      } else {
        this.addCheck(
          'SSL Certificate',
          'warn',
          'Répertoire SSL non trouvé',
          'Configurez SSL pour sécuriser les connexions',
          false,
        );
      }
    } catch (error) {
      this.addCheck(
        'SSL Certificate',
        'fail',
        `Erreur lors de la vérification SSL: ${error}`,
        '',
        false,
      );
    }
  }

  private async checkJellyfinSecurity(): Promise<void> {
    try {
      // Vérifier la configuration Jellyfin
      const configPath = process.env.CONFIG_PATH;
      if (configPath && existsSync(configPath)) {
        // Vérifier les logs d'accès
        const logsPath = process.env.LOGS_PATH || `${configPath}/logs`;
        if (existsSync(logsPath)) {
          this.addCheck(
            'Jellyfin Logs',
            'pass',
            'Logs Jellyfin configurés',
            '',
            false,
          );
        } else {
          this.addCheck(
            'Jellyfin Logs',
            'warn',
            'Logs Jellyfin non trouvés',
            'Activez les logs pour le monitoring',
            false,
          );
        }

        // Vérifier les permissions du répertoire de configuration
        const configStats = statSync(configPath);
        const configMode = (configStats.mode & 0o777).toString(8);
        if (configMode === '755' || configMode === '750') {
          this.addCheck(
            'Jellyfin Config Permissions',
            'pass',
            'Permissions de configuration appropriées',
            '',
            false,
          );
        } else {
          const check = this.addCheck(
            'Jellyfin Config Permissions',
            'warn',
            `Permissions config: ${configMode}`,
            'Vérifiez les permissions du répertoire de configuration',
            false,
          );
          this.addFixableCheck(
            check,
            () => this.fixConfigPermissions(configPath),
            true,
          );
        }
      } else {
        this.addCheck(
          'Jellyfin Config',
          'warn',
          'Répertoire de configuration Jellyfin non trouvé',
          '',
          false,
        );
      }

      // Vérifier l'accès réseau Jellyfin
      try {
        const jellyfinResponse = execSync(
          'curl -s -o /dev/null -w "%{http_code}" http://localhost:8096/health || echo "000"',
          { encoding: 'utf-8' },
        ).trim();
        if (jellyfinResponse === '200') {
          this.addCheck(
            'Jellyfin Service',
            'pass',
            'Service Jellyfin accessible',
            '',
            false,
          );
        } else {
          this.addCheck(
            'Jellyfin Service',
            'warn',
            'Service Jellyfin non accessible',
            'Vérifiez que Jellyfin est démarré',
            false,
          );
        }
      } catch {
        this.addCheck(
          'Jellyfin Service',
          'warn',
          "Impossible de vérifier l'accès Jellyfin",
          '',
          false,
        );
      }
    } catch (error) {
      this.addCheck(
        'Jellyfin Security',
        'fail',
        `Erreur lors de la vérification Jellyfin: ${error}`,
        '',
        false,
      );
    }
  }

  private async checkExternalAccess(): Promise<void> {
    try {
      // Vérifier l'accès externe via le domaine configuré
      const domain = process.env.EXTERNAL_DOMAIN || 'your-domain.com';

      try {
        // Test de connectivité externe
        const response = execSync(
          `curl -s -I https://${domain} --max-time 10 || echo "failed"`,
          {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        ).trim();

        if (
          response.includes('HTTP/2 200') ||
          response.includes('HTTP/1.1 200')
        ) {
          this.addCheck(
            'External Access',
            'pass',
            'Accès externe fonctionnel via le domaine configuré',
            "Surveillez les logs d'accès régulièrement",
            false,
          );

          // Si l'accès externe fonctionne, vérifier les mesures de sécurité
          this.addCheck(
            'External Security Measures',
            'warn',
            'Accès externe activé - mesures de sécurité renforcées recommandées',
            'Configurez: fail2ban, surveillance logs, rate limiting nginx',
            false,
          );
        } else if (response.includes('failed')) {
          this.addCheck(
            'External Access',
            'warn',
            'Accès externe non accessible (peut être intentionnel)',
            "Vérifiez la configuration si l'accès externe est souhaité",
            false,
          );
        } else {
          this.addCheck(
            'External Access',
            'warn',
            "Réponse inattendue de l'accès externe",
            'Vérifiez la configuration nginx et les certificats',
            false,
          );
        }
      } catch {
        this.addCheck(
          'External Access',
          'warn',
          "Impossible de tester l'accès externe",
          "Testez manuellement l'accès depuis un appareil externe",
          false,
        );
      }

      // Vérifier la configuration nginx pour la sécurité
      const projectDir = process.env.PROJECT_DIR || process.cwd();
      const nginxConfigPath = `${projectDir}/docker/nginx/nginx.conf`;
      if (existsSync(nginxConfigPath)) {
        this.addCheck(
          'Nginx Security Config',
          'pass',
          'Configuration nginx présente',
          'Vérifiez les headers de sécurité et le rate limiting',
          false,
        );
      } else {
        this.addCheck(
          'Nginx Security Config',
          'warn',
          'Configuration nginx non trouvée',
          'Assurez-vous que la configuration nginx inclut les headers de sécurité',
          false,
        );
      }
    } catch (_error) {
      this.addCheck(
        'External Access Security',
        'warn',
        "Erreur lors de la vérification de l'accès externe",
        "Vérifiez manuellement la sécurité de l'accès externe",
        false,
      );
    }
  }

  private async checkSystemUpdates(): Promise<void> {
    try {
      // Vérifier les mises à jour système
      const updates = execSync(
        'apt list --upgradable 2>/dev/null | grep -v "WARNING" | wc -l',
        { encoding: 'utf-8' },
      ).trim();
      const updateCount = parseInt(updates, 10) - 1; // -1 pour enlever la ligne d'en-tête

      if (updateCount === 0) {
        this.addCheck('System Updates', 'pass', 'Système à jour', '', false);
      } else if (updateCount < 10) {
        const check = this.addCheck(
          'System Updates',
          'warn',
          `${updateCount} mise(s) à jour disponible(s)`,
          'Exécutez: sudo apt update && sudo apt upgrade',
          false,
        );
        this.addFixableCheck(
          check,
          () => this.fixSystemUpdates(updateCount),
          true,
        );
      } else {
        const check = this.addCheck(
          'System Updates',
          'warn',
          `${updateCount} mises à jour disponibles`,
          'Effectuez les mises à jour de sécurité',
          false,
        );
        this.addFixableCheck(
          check,
          () => this.fixSystemUpdates(updateCount),
          true,
        );
      }
    } catch (_error) {
      this.addCheck(
        'System Updates',
        'warn',
        'Impossible de vérifier les mises à jour',
        '',
        false,
      );
    }
  }

  private async checkLogRotation(): Promise<void> {
    try {
      // Vérifier logrotate
      if (existsSync('/etc/logrotate.conf')) {
        this.addCheck('Log Rotation', 'pass', 'Logrotate configuré', '', false);
      } else {
        this.addCheck(
          'Log Rotation',
          'warn',
          'Logrotate non configuré',
          'Installez et configurez logrotate',
          false,
        );
      }

      // Vérifier l'espace disque
      const diskUsage = execSync("df -h / | tail -1 | awk '{print $5}'", {
        encoding: 'utf-8',
      }).trim();
      const usage = parseInt(diskUsage.replace('%', ''), 10);

      if (usage < 80) {
        this.addCheck(
          'Disk Space',
          'pass',
          `Utilisation disque: ${diskUsage}`,
          '',
          false,
        );
      } else if (usage < 90) {
        this.addCheck(
          'Disk Space',
          'warn',
          `Utilisation disque élevée: ${diskUsage}`,
          "Nettoyez l'espace disque",
          false,
        );
      } else {
        this.addCheck(
          'Disk Space',
          'fail',
          `Espace disque critique: ${diskUsage}`,
          "Libérez de l'espace immédiatement",
          true,
        );
      }
    } catch (error) {
      this.addCheck(
        'System Maintenance',
        'fail',
        `Erreur lors de la vérification système: ${error}`,
        '',
        false,
      );
    }
  }

  private addCheck(
    name: string,
    status: SecurityCheck['status'],
    message: string,
    recommendation: string,
    critical: boolean,
  ): SecurityCheck {
    const check: SecurityCheck = {
      name,
      status,
      message,
      recommendation: recommendation || undefined,
      critical,
    };
    this.checks.push(check);
    return check;
  }

  private addFixableCheck(
    check: SecurityCheck,
    fixFunction: () => Promise<AutoFixResult>,
    requiresConfirmation: boolean,
  ): void {
    this.fixableChecks.push({
      check,
      fixFunction,
      requiresConfirmation,
    });
  }

  private generateReport(): SecurityReport {
    const summary = {
      total: this.checks.length,
      passed: this.checks.filter((c) => c.status === 'pass').length,
      warnings: this.checks.filter((c) => c.status === 'warn').length,
      failed: this.checks.filter((c) => c.status === 'fail').length,
      critical_failed: this.checks.filter(
        (c) => c.status === 'fail' && c.critical,
      ).length,
    };

    return {
      timestamp: new Date().toISOString(),
      hostname: execSync('hostname', { encoding: 'utf-8' }).trim(),
      checks: this.checks,
      summary,
    };
  }

  displayReport(report: SecurityReport): void {
    Logger.box('🔒 RAPPORT DE SÉCURITÉ JELLYFLYZERD', [
      `Hôte: ${report.hostname}`,
      `Date: ${new Date(report.timestamp).toLocaleString('fr-FR')}`,
      `Vérifications: ${report.summary.total}`,
    ]);

    console.log('\n📊 Résumé:');
    console.log(`  ✅ Réussites: ${report.summary.passed}`);
    console.log(`  ⚠️  Avertissements: ${report.summary.warnings}`);
    console.log(`  ❌ Échecs: ${report.summary.failed}`);
    if (report.summary.critical_failed > 0) {
      console.log(`  🚨 Critiques: ${report.summary.critical_failed}`);
    }

    console.log('\n🔍 Détail des vérifications:\n');

    for (const check of report.checks) {
      let icon = '❓';

      switch (check.status) {
        case 'pass':
          icon = '✅';
          break;
        case 'warn':
          icon = '⚠️ ';
          break;
        case 'fail':
          icon = check.critical ? '🚨' : '❌';
          break;
        case 'not_applicable':
          icon = 'ℹ️ ';
          break;
      }

      console.log(`${icon} ${check.name}: ${check.message}`);
      if (check.recommendation) {
        console.log(`   💡 ${check.recommendation}`);
      }
      console.log('');
    }

    // Afficher les recommandations prioritaires
    const criticalChecks = report.checks.filter(
      (c) => c.status === 'fail' && c.critical,
    );
    const failedChecks = report.checks.filter(
      (c) => c.status === 'fail' && !c.critical,
    );
    const warnChecks = report.checks.filter((c) => c.status === 'warn');

    if (criticalChecks.length > 0) {
      console.log('🚨 ACTIONS CRITIQUES REQUISES:');
      for (const check of criticalChecks) {
        console.log(
          `  • ${check.name}: ${check.recommendation || check.message}`,
        );
      }
      console.log('');
    }

    if (failedChecks.length > 0) {
      console.log('❌ ACTIONS RECOMMANDÉES:');
      for (const check of failedChecks) {
        if (check.recommendation) {
          console.log(`  • ${check.name}: ${check.recommendation}`);
        }
      }
      console.log('');
    }

    if (warnChecks.length > 0 && warnChecks.some((c) => c.recommendation)) {
      console.log('⚠️  AMÉLIORATIONS SUGGÉRÉES:');
      for (const check of warnChecks) {
        if (check.recommendation) {
          console.log(`  • ${check.name}: ${check.recommendation}`);
        }
      }
    }
  }

  // === MÉTHODES DE CORRECTION AUTOMATIQUE ===

  private async fixSystemUpdates(updateCount: number): Promise<AutoFixResult> {
    try {
      Logger.info(`🔄 Mise à jour de ${updateCount} paquet(s)...`);

      // Mettre à jour la liste des paquets
      Logger.info('📦 Mise à jour de la liste des paquets...');
      execSync('sudo apt update -y', { encoding: 'utf-8', stdio: 'inherit' });

      // Effectuer les mises à jour
      Logger.info('⬆️  Installation des mises à jour...');
      execSync('sudo apt upgrade -y', { encoding: 'utf-8', stdio: 'inherit' });

      return {
        checkName: 'System Updates',
        success: true,
        message: `${updateCount} mise(s) à jour installée(s) avec succès`,
      };
    } catch (error) {
      return {
        checkName: 'System Updates',
        success: false,
        message: 'Échec de la mise à jour du système',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async fixConfigPermissions(
    configPath: string,
  ): Promise<AutoFixResult> {
    try {
      Logger.info('🔒 Correction des permissions de configuration Jellyfin...');

      // Changer les permissions à 755
      execSync(`chmod 755 "${configPath}"`, { encoding: 'utf-8' });

      return {
        checkName: 'Jellyfin Config Permissions',
        success: true,
        message: 'Permissions corrigées à 755',
      };
    } catch (error) {
      return {
        checkName: 'Jellyfin Config Permissions',
        success: false,
        message: 'Échec de la correction des permissions',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async fixContainerUser(): Promise<AutoFixResult> {
    try {
      Logger.info("👤 Configuration de l'utilisateur du conteneur...");

      const projectDir = process.env.PROJECT_DIR || process.cwd();
      const envPath = `${projectDir}/.env`;
      const envExamplePath = `${projectDir}/.env.example`;

      // Récupérer l'UID et GID de l'utilisateur actuel
      const uid = execSync('id -u', { encoding: 'utf-8' }).trim();
      const gid = execSync('id -g', { encoding: 'utf-8' }).trim();

      // Vérifier si PUID/PGID existent déjà dans .env
      const { readFileSync, writeFileSync } = await import('node:fs');
      let envContent = readFileSync(envPath, 'utf-8');
      let envExampleContent = readFileSync(envExamplePath, 'utf-8');

      const puidExists = envContent.includes('PUID=');
      const pgidExists = envContent.includes('PGID=');

      if (!puidExists || !pgidExists) {
        // Ajouter PUID/PGID à .env
        const dockerSection = '\n# === DOCKER USER ===\n';
        const puidLine = `PUID=${uid}\n`;
        const pgidLine = `PGID=${gid}\n`;

        if (!puidExists && !pgidExists) {
          envContent += dockerSection + puidLine + pgidLine;
          envExampleContent += `${dockerSection}PUID=1000\nPGID=1000\n`;
        } else if (!puidExists) {
          envContent += puidLine;
          envExampleContent += 'PUID=1000\n';
        } else {
          envContent += pgidLine;
          envExampleContent += 'PGID=1000\n';
        }

        writeFileSync(envPath, envContent);
        writeFileSync(envExamplePath, envExampleContent);

        Logger.info(
          `✅ PUID=${uid} et PGID=${gid} ajoutés au .env. Redémarrez les conteneurs pour appliquer les changements.`,
        );

        return {
          checkName: 'Container User',
          success: true,
          message: `PUID=${uid} et PGID=${gid} configurés. Redémarrez avec: cd docker && docker-compose up -d`,
        };
      } else {
        return {
          checkName: 'Container User',
          success: true,
          message: 'PUID/PGID déjà configurés',
        };
      }
    } catch (error) {
      return {
        checkName: 'Container User',
        success: false,
        message: "Échec de la configuration de l'utilisateur du conteneur",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async fixContainerCapabilities(): Promise<AutoFixResult> {
    try {
      Logger.info('🛡️  Ajout des restrictions de capabilities au conteneur...');

      const projectDir = process.env.PROJECT_DIR || process.cwd();
      const composeFilePath = `${projectDir}/docker/docker-compose.yml`;

      const { readFileSync, writeFileSync } = await import('node:fs');
      let composeContent = readFileSync(composeFilePath, 'utf-8');

      // Vérifier si cap_drop existe déjà
      if (composeContent.includes('cap_drop:')) {
        return {
          checkName: 'Container Capabilities',
          success: true,
          message: 'Restrictions de capabilities déjà configurées',
        };
      }

      // Ajouter cap_drop au service jellyfin (après la section security_opt)
      const jellyfinServicePattern =
        /( {4}security_opt:\s*\n(?: {6}- [^\n]+\n)+)/;
      const capabilitiesConfig =
        '\n    # Restriction des capabilities\n    cap_drop:\n      - ALL\n    cap_add:\n      - CHOWN\n      - SETUID\n      - SETGID\n';

      if (jellyfinServicePattern.test(composeContent)) {
        composeContent = composeContent.replace(
          jellyfinServicePattern,
          `$1${capabilitiesConfig}`,
        );

        writeFileSync(composeFilePath, composeContent);

        Logger.info(
          '✅ Restrictions de capabilities ajoutées. Redémarrez les conteneurs pour appliquer les changements.',
        );

        return {
          checkName: 'Container Capabilities',
          success: true,
          message:
            'Restrictions ajoutées. Redémarrez avec: cd docker && docker-compose up -d',
        };
      } else {
        return {
          checkName: 'Container Capabilities',
          success: false,
          message:
            'Impossible de trouver la section jellyfin dans docker-compose.yml',
        };
      }
    } catch (error) {
      return {
        checkName: 'Container Capabilities',
        success: false,
        message: "Échec de l'ajout des restrictions de capabilities",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Obtenir les vérifications corrigibles
  getFixableChecks(): FixableCheck[] {
    return this.fixableChecks;
  }
}
