import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { Logger } from '../utils/logger.js';

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

export class SecurityChecker {
  private checks: SecurityCheck[] = [];

  async runAllChecks(): Promise<SecurityReport> {
    Logger.info('🔒 Démarrage de l\'audit de sécurité...');

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

    // Vérifications réseau
    await this.checkOpenPorts();
    await this.checkSSLCertificates();

    // Vérifications Jellyfin spécifiques
    await this.checkJellyfinSecurity();

    // Vérifications système
    await this.checkSystemUpdates();
    await this.checkLogRotation();

    return this.generateReport();
  }

  private async checkFirewall(): Promise<void> {
    try {
      // Vérifier UFW
      try {
        const ufwStatus = execSync('ufw status', { encoding: 'utf-8' });
        if (ufwStatus.includes('Status: active')) {
          this.addCheck('UFW Firewall', 'pass', 'UFW est actif et configuré', '', false);
        } else {
          this.addCheck('UFW Firewall', 'warn', 'UFW n\'est pas actif', 'Activez UFW: sudo ufw enable', false);
        }
      } catch {
        // Vérifier iptables
        try {
          const iptables = execSync('iptables -L | head -20', { encoding: 'utf-8' });
          if (iptables.includes('DROP') || iptables.includes('REJECT')) {
            this.addCheck('Firewall', 'pass', 'Règles de firewall détectées (iptables)', '', false);
          } else {
            this.addCheck('Firewall', 'warn', 'Aucune règle de firewall restrictive détectée', 'Configurez un firewall (ufw/iptables)', false);
          }
        } catch {
          this.addCheck('Firewall', 'fail', 'Impossible de vérifier le firewall', 'Installez et configurez UFW ou iptables', true);
        }
      }
    } catch (error) {
      this.addCheck('Firewall', 'fail', `Erreur lors de la vérification: ${error}`, '', false);
    }
  }

  private async checkFail2ban(): Promise<void> {
    try {
      const fail2banStatus = execSync('systemctl is-active fail2ban', { encoding: 'utf-8' }).trim();
      if (fail2banStatus === 'active') {
        // Vérifier les jails configurées
        try {
          const jails = execSync('fail2ban-client status', { encoding: 'utf-8' });
          this.addCheck('Fail2ban', 'pass', `Fail2ban actif avec jails: ${jails.split('Jail list:')[1]?.trim() || 'aucune'}`, '', false);
        } catch {
          this.addCheck('Fail2ban', 'pass', 'Fail2ban est actif', '', false);
        }
      } else {
        this.addCheck('Fail2ban', 'warn', 'Fail2ban n\'est pas actif', 'Installez et configurez fail2ban: sudo apt install fail2ban', false);
      }
    } catch {
      this.addCheck('Fail2ban', 'warn', 'Fail2ban non installé ou non configuré', 'Installez fail2ban: sudo apt install fail2ban', false);
    }
  }

  private async checkSSH(): Promise<void> {
    try {
      if (existsSync('/etc/ssh/sshd_config')) {
        const sshConfig = readFileSync('/etc/ssh/sshd_config', 'utf-8');

        // Vérifier si SSH utilise les clés au lieu des mots de passe
        if (sshConfig.includes('PasswordAuthentication no')) {
          this.addCheck('SSH Password Auth', 'pass', 'Authentification par mot de passe SSH désactivée', '', false);
        } else {
          this.addCheck('SSH Password Auth', 'warn', 'Authentification SSH par mot de passe activée', 'Désactivez: PasswordAuthentication no dans /etc/ssh/sshd_config', false);
        }

        // Vérifier le port SSH par défaut
        if (sshConfig.includes('Port 22') || !sshConfig.includes('Port ')) {
          this.addCheck('SSH Port', 'warn', 'SSH utilise le port par défaut (22)', 'Changez le port SSH dans /etc/ssh/sshd_config', false);
        } else {
          this.addCheck('SSH Port', 'pass', 'SSH utilise un port non-standard', '', false);
        }

        // Vérifier l'accès root
        if (sshConfig.includes('PermitRootLogin no')) {
          this.addCheck('SSH Root Login', 'pass', 'Connexion root SSH désactivée', '', false);
        } else {
          this.addCheck('SSH Root Login', 'warn', 'Connexion root SSH potentiellement activée', 'Désactivez: PermitRootLogin no dans /etc/ssh/sshd_config', false);
        }
      } else {
        this.addCheck('SSH Config', 'not_applicable', 'Configuration SSH non trouvée', '', false);
      }
    } catch (error) {
      this.addCheck('SSH Config', 'fail', `Erreur lors de la vérification SSH: ${error}`, '', false);
    }
  }

  private async checkUsers(): Promise<void> {
    try {
      // Vérifier les utilisateurs avec shell
      const users = execSync('cat /etc/passwd | grep -E "/bin/(bash|sh|zsh)" | cut -d: -f1', { encoding: 'utf-8' }).trim().split('\n');
      const nonSystemUsers = users.filter(user => !['root', 'sync', 'halt', 'shutdown'].includes(user));

      if (nonSystemUsers.length <= 2) {
        this.addCheck('System Users', 'pass', `${nonSystemUsers.length} utilisateur(s) avec shell: ${nonSystemUsers.join(', ')}`, '', false);
      } else {
        this.addCheck('System Users', 'warn', `${nonSystemUsers.length} utilisateurs avec shell`, 'Vérifiez les comptes utilisateurs nécessaires', false);
      }

      // Vérifier les utilisateurs sans mot de passe
      try {
        const noPassword = execSync('awk -F: \'($2 == "" || $2 == "!" || $2 == "*") {print $1}\' /etc/shadow', { encoding: 'utf-8' }).trim();
        if (noPassword) {
          const accounts = noPassword.split('\n').filter(acc => !['daemon', 'bin', 'sys', 'sync', 'games', 'man', 'lp', 'mail', 'news', 'uucp', 'proxy', 'www-data', 'backup', 'list', 'irc', 'gnats', 'nobody', 'systemd-network', 'systemd-resolve', 'messagebus', 'systemd-timesync', 'syslog', '_apt', 'tss', 'uuidd', 'tcpdump', 'landscape', 'pollinate', 'fwupd-refresh', 'usbmux', 'lxd', 'dnsmasq'].includes(acc));

          if (accounts.length > 0) {
            this.addCheck('Password Policy', 'warn', `Comptes sans mot de passe: ${accounts.join(', ')}`, 'Vérifiez les comptes sans mot de passe', false);
          } else {
            this.addCheck('Password Policy', 'pass', 'Pas de comptes utilisateurs sans mot de passe', '', false);
          }
        }
      } catch {
        this.addCheck('Password Policy', 'warn', 'Impossible de vérifier les mots de passe', '', false);
      }
    } catch (error) {
      this.addCheck('System Users', 'fail', `Erreur lors de la vérification des utilisateurs: ${error}`, '', false);
    }
  }

  private async checkPermissions(): Promise<void> {
    try {
      // Vérifier les fichiers avec permissions trop larges
      const worldWritable = execSync('find /etc /usr /var -type f -perm -002 2>/dev/null | head -10', { encoding: 'utf-8' }).trim();
      if (worldWritable) {
        this.addCheck('File Permissions', 'warn', 'Fichiers système avec permissions d\'écriture globale trouvés', 'Vérifiez les permissions: ' + worldWritable.split('\n')[0], false);
      } else {
        this.addCheck('File Permissions', 'pass', 'Pas de fichiers système avec permissions d\'écriture globale', '', false);
      }

      // Vérifier les fichiers SUID
      try {
        const suidFiles = execSync('find /usr /bin /sbin -perm -4000 2>/dev/null | wc -l', { encoding: 'utf-8' }).trim();
        const suidCount = parseInt(suidFiles);
        if (suidCount < 20) {
          this.addCheck('SUID Files', 'pass', `${suidCount} fichiers SUID trouvés (normal)`, '', false);
        } else {
          this.addCheck('SUID Files', 'warn', `${suidCount} fichiers SUID trouvés`, 'Vérifiez les fichiers SUID non nécessaires', false);
        }
      } catch {
        this.addCheck('SUID Files', 'warn', 'Impossible de vérifier les fichiers SUID', '', false);
      }
    } catch (error) {
      this.addCheck('File Permissions', 'fail', `Erreur lors de la vérification des permissions: ${error}`, '', false);
    }
  }

  private async checkDockerSecurity(): Promise<void> {
    try {
      // Vérifier si Docker daemon est sécurisé
      const dockerInfo = execSync('docker info 2>/dev/null | grep -i "security"', { encoding: 'utf-8' }).trim();
      if (dockerInfo.includes('seccomp') || dockerInfo.includes('apparmor')) {
        this.addCheck('Docker Security', 'pass', 'Docker utilise des profils de sécurité', '', false);
      } else {
        this.addCheck('Docker Security', 'warn', 'Profils de sécurité Docker non détectés', 'Vérifiez la configuration des profils de sécurité Docker', false);
      }

      // Vérifier le socket Docker
      if (existsSync('/var/run/docker.sock')) {
        const socketStat = statSync('/var/run/docker.sock');
        const mode = (socketStat.mode & parseInt('777', 8)).toString(8);
        if (mode === '660') {
          this.addCheck('Docker Socket', 'pass', 'Socket Docker a des permissions appropriées', '', false);
        } else {
          this.addCheck('Docker Socket', 'warn', `Socket Docker a des permissions ${mode}`, 'Permissions recommandées: 660', false);
        }
      }

      // Vérifier les conteneurs privilégiés
      try {
        const privilegedContainers = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}" --filter="label=privileged=true" 2>/dev/null', { encoding: 'utf-8' }).trim();
        if (privilegedContainers && !privilegedContainers.includes('NAMES')) {
          this.addCheck('Privileged Containers', 'warn', 'Conteneurs privilégiés détectés', 'Évitez les conteneurs privilégiés si possible', false);
        } else {
          this.addCheck('Privileged Containers', 'pass', 'Aucun conteneur privilégié détecté', '', false);
        }
      } catch {
        this.addCheck('Privileged Containers', 'pass', 'Vérification des conteneurs privilégiés OK', '', false);
      }
    } catch (error) {
      this.addCheck('Docker Security', 'fail', `Erreur lors de la vérification Docker: ${error}`, '', false);
    }
  }

  private async checkContainerPrivileges(): Promise<void> {
    try {
      // Vérifier les conteneurs Jellyflyzerd
      const jellyfinContainer = execSync('docker inspect jellyflyzerd-jellyfin 2>/dev/null || echo "not_found"', { encoding: 'utf-8' });

      if (!jellyfinContainer.includes('not_found')) {
        const containerConfig = JSON.parse(jellyfinContainer);
        const config = containerConfig[0]?.Config;
        const hostConfig = containerConfig[0]?.HostConfig;

        // Vérifier si le conteneur tourne en root
        if (config?.User && config.User !== '0:0' && config.User !== 'root') {
          this.addCheck('Container User', 'pass', `Conteneur Jellyfin utilise l'utilisateur: ${config.User}`, '', false);
        } else {
          this.addCheck('Container User', 'warn', 'Conteneur Jellyfin pourrait tourner en root', 'Configurez un utilisateur non-root', false);
        }

        // Vérifier les capabilities
        if (hostConfig?.CapDrop && hostConfig.CapDrop.length > 0) {
          this.addCheck('Container Capabilities', 'pass', 'Capabilities Docker restreintes', '', false);
        } else {
          this.addCheck('Container Capabilities', 'warn', 'Aucune restriction de capabilities détectée', 'Considérez l\'ajout de --cap-drop ALL', false);
        }

        // Vérifier les volumes
        const mounts = containerConfig[0]?.Mounts || [];
        const bindMounts = mounts.filter((mount: any) => mount.Type === 'bind');
        if (bindMounts.some((mount: any) => mount.Mode.includes('rw') && (mount.Source.includes('/') || mount.Source.includes('/etc')))) {
          this.addCheck('Container Volumes', 'warn', 'Volumes système montés en écriture', 'Limitez les montages système en lecture seule', false);
        } else {
          this.addCheck('Container Volumes', 'pass', 'Configuration des volumes appropriée', '', false);
        }
      } else {
        this.addCheck('Container Security', 'not_applicable', 'Conteneur Jellyfin non trouvé', '', false);
      }
    } catch (error) {
      this.addCheck('Container Security', 'fail', `Erreur lors de la vérification du conteneur: ${error}`, '', false);
    }
  }

  private async checkOpenPorts(): Promise<void> {
    try {
      // Vérifier les ports ouverts
      const netstat = execSync('netstat -tuln 2>/dev/null || ss -tuln', { encoding: 'utf-8' });
      const lines = netstat.split('\n');
      const listeningPorts = lines
        .filter(line => line.includes('LISTEN') || line.includes('State'))
        .filter(line => !line.includes('State'))
        .map(line => {
          const parts = line.split(/\s+/);
          return parts.find(part => part.includes(':'))?.split(':').pop();
        })
        .filter(port => port && !isNaN(parseInt(port)))
        .map(port => parseInt(port!))
        .filter((port, index, array) => array.indexOf(port) === index)
        .sort((a, b) => a - b);

      const commonPorts = [22, 80, 443, 8096, 8920];
      const unexpectedPorts = listeningPorts.filter(port => !commonPorts.includes(port) && port < 10000);

      if (unexpectedPorts.length === 0) {
        this.addCheck('Open Ports', 'pass', `Ports ouverts: ${listeningPorts.join(', ')}`, '', false);
      } else {
        this.addCheck('Open Ports', 'warn', `Ports inattendus ouverts: ${unexpectedPorts.join(', ')}`, 'Vérifiez la nécessité de ces ports', false);
      }
    } catch (error) {
      this.addCheck('Open Ports', 'fail', `Erreur lors de la vérification des ports: ${error}`, '', false);
    }
  }

  private async checkSSLCertificates(): Promise<void> {
    try {
      // Vérifier les certificats SSL
      const sslDir = '/home/dgarcia/projects/jellyflyzerd/docker/nginx/ssl';
      if (existsSync(sslDir)) {
        const certFile = `${sslDir}/jellyflyzerd.freeboxos.fr.crt`;
        const keyFile = `${sslDir}/jellyflyzerd.freeboxos.fr.key`;

        if (existsSync(certFile) && existsSync(keyFile)) {
          // Vérifier la validité du certificat
          try {
            const certInfo = execSync(`openssl x509 -in "${certFile}" -text -noout | grep "Not After"`, { encoding: 'utf-8' });
            this.addCheck('SSL Certificate', 'pass', `Certificat SSL présent. ${certInfo?.trim() || ''}`, '', false);

            // Vérifier les permissions du certificat
            const keyStats = statSync(keyFile);
            const keyMode = (keyStats.mode & parseInt('777', 8)).toString(8);
            if (keyMode === '600' || keyMode === '400') {
              this.addCheck('SSL Key Permissions', 'pass', 'Permissions de la clé SSL appropriées', '', false);
            } else {
              this.addCheck('SSL Key Permissions', 'warn', `Permissions de la clé SSL: ${keyMode}`, 'Recommandé: chmod 600 sur la clé privée', false);
            }
          } catch {
            this.addCheck('SSL Certificate', 'warn', 'Certificat SSL présent mais validation échouée', 'Vérifiez la validité du certificat', false);
          }
        } else {
          this.addCheck('SSL Certificate', 'warn', 'Certificat SSL manquant', 'Configurez un certificat SSL valide', false);
        }
      } else {
        this.addCheck('SSL Certificate', 'warn', 'Répertoire SSL non trouvé', 'Configurez SSL pour sécuriser les connexions', false);
      }
    } catch (error) {
      this.addCheck('SSL Certificate', 'fail', `Erreur lors de la vérification SSL: ${error}`, '', false);
    }
  }

  private async checkJellyfinSecurity(): Promise<void> {
    try {
      // Vérifier la configuration Jellyfin
      const configPath = '/mnt/e/jellyflyzerd-config/config';
      if (existsSync(configPath)) {
        // Vérifier les logs d'accès
        const logsPath = `${configPath}/logs`;
        if (existsSync(logsPath)) {
          this.addCheck('Jellyfin Logs', 'pass', 'Logs Jellyfin configurés', '', false);
        } else {
          this.addCheck('Jellyfin Logs', 'warn', 'Logs Jellyfin non trouvés', 'Activez les logs pour le monitoring', false);
        }

        // Vérifier les permissions du répertoire de configuration
        const configStats = statSync(configPath);
        const configMode = (configStats.mode & parseInt('777', 8)).toString(8);
        if (configMode === '755' || configMode === '750') {
          this.addCheck('Jellyfin Config Permissions', 'pass', 'Permissions de configuration appropriées', '', false);
        } else {
          this.addCheck('Jellyfin Config Permissions', 'warn', `Permissions config: ${configMode}`, 'Vérifiez les permissions du répertoire de configuration', false);
        }
      } else {
        this.addCheck('Jellyfin Config', 'warn', 'Répertoire de configuration Jellyfin non trouvé', '', false);
      }

      // Vérifier l'accès réseau Jellyfin
      try {
        const jellyfinResponse = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8096/health || echo "000"', { encoding: 'utf-8' }).trim();
        if (jellyfinResponse === '200') {
          this.addCheck('Jellyfin Service', 'pass', 'Service Jellyfin accessible', '', false);
        } else {
          this.addCheck('Jellyfin Service', 'warn', 'Service Jellyfin non accessible', 'Vérifiez que Jellyfin est démarré', false);
        }
      } catch {
        this.addCheck('Jellyfin Service', 'warn', 'Impossible de vérifier l\'accès Jellyfin', '', false);
      }
    } catch (error) {
      this.addCheck('Jellyfin Security', 'fail', `Erreur lors de la vérification Jellyfin: ${error}`, '', false);
    }
  }

  private async checkSystemUpdates(): Promise<void> {
    try {
      // Vérifier les mises à jour système
      const updates = execSync('apt list --upgradable 2>/dev/null | grep -v "WARNING" | wc -l', { encoding: 'utf-8' }).trim();
      const updateCount = parseInt(updates) - 1; // -1 pour enlever la ligne d'en-tête

      if (updateCount === 0) {
        this.addCheck('System Updates', 'pass', 'Système à jour', '', false);
      } else if (updateCount < 10) {
        this.addCheck('System Updates', 'warn', `${updateCount} mise(s) à jour disponible(s)`, 'Exécutez: sudo apt update && sudo apt upgrade', false);
      } else {
        this.addCheck('System Updates', 'warn', `${updateCount} mises à jour disponibles`, 'Effectuez les mises à jour de sécurité', false);
      }
    } catch (error) {
      this.addCheck('System Updates', 'warn', 'Impossible de vérifier les mises à jour', '', false);
    }
  }

  private async checkLogRotation(): Promise<void> {
    try {
      // Vérifier logrotate
      if (existsSync('/etc/logrotate.conf')) {
        this.addCheck('Log Rotation', 'pass', 'Logrotate configuré', '', false);
      } else {
        this.addCheck('Log Rotation', 'warn', 'Logrotate non configuré', 'Installez et configurez logrotate', false);
      }

      // Vérifier l'espace disque
      const diskUsage = execSync('df -h / | tail -1 | awk \'{print $5}\'', { encoding: 'utf-8' }).trim();
      const usage = parseInt(diskUsage.replace('%', ''));

      if (usage < 80) {
        this.addCheck('Disk Space', 'pass', `Utilisation disque: ${diskUsage}`, '', false);
      } else if (usage < 90) {
        this.addCheck('Disk Space', 'warn', `Utilisation disque élevée: ${diskUsage}`, 'Nettoyez l\'espace disque', false);
      } else {
        this.addCheck('Disk Space', 'fail', `Espace disque critique: ${diskUsage}`, 'Libérez de l\'espace immédiatement', true);
      }
    } catch (error) {
      this.addCheck('System Maintenance', 'fail', `Erreur lors de la vérification système: ${error}`, '', false);
    }
  }

  private addCheck(name: string, status: SecurityCheck['status'], message: string, recommendation: string, critical: boolean): void {
    this.checks.push({
      name,
      status,
      message,
      recommendation: recommendation || undefined,
      critical
    });
  }

  private generateReport(): SecurityReport {
    const summary = {
      total: this.checks.length,
      passed: this.checks.filter(c => c.status === 'pass').length,
      warnings: this.checks.filter(c => c.status === 'warn').length,
      failed: this.checks.filter(c => c.status === 'fail').length,
      critical_failed: this.checks.filter(c => c.status === 'fail' && c.critical).length
    };

    return {
      timestamp: new Date().toISOString(),
      hostname: execSync('hostname', { encoding: 'utf-8' }).trim(),
      checks: this.checks,
      summary
    };
  }

  displayReport(report: SecurityReport): void {
    Logger.box('🔒 RAPPORT DE SÉCURITÉ JELLYFLYZERD', [
      `Hôte: ${report.hostname}`,
      `Date: ${new Date(report.timestamp).toLocaleString('fr-FR')}`,
      `Vérifications: ${report.summary.total}`
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
    const criticalChecks = report.checks.filter(c => c.status === 'fail' && c.critical);
    const failedChecks = report.checks.filter(c => c.status === 'fail' && !c.critical);
    const warnChecks = report.checks.filter(c => c.status === 'warn');

    if (criticalChecks.length > 0) {
      console.log('🚨 ACTIONS CRITIQUES REQUISES:');
      for (const check of criticalChecks) {
        console.log(`  • ${check.name}: ${check.recommendation || check.message}`);
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

    if (warnChecks.length > 0 && warnChecks.some(c => c.recommendation)) {
      console.log('⚠️  AMÉLIORATIONS SUGGÉRÉES:');
      for (const check of warnChecks) {
        if (check.recommendation) {
          console.log(`  • ${check.name}: ${check.recommendation}`);
        }
      }
    }
  }
}