# Installation

Guide d'installation complet de Jellyflyzerd.

## Prérequis

- **Docker** et **Docker Compose**
- **Node.js 18+** (pour le CLI)
- **Système** : Linux, macOS, ou WSL2

## Installation rapide

1. **Cloner le projet** :
   ```bash
   git clone <repository>
   cd jellyflyzerd
   ```

2. **Configuration** :
   ```bash
   cp .env.example .env
   # Éditez .env avec vos paramètres
   ```

3. **Installation** :
   ```bash
   ./scripts/setup/setup.sh
   ```

4. **Démarrage** :
   ```bash
   jellyflyzerd start
   ```

## Configuration détaillée

### Variables d'environnement (.env)

```bash
# Réseau
LOCAL_IP=192.168.1.100          # IP locale de votre serveur
EXTERNAL_DOMAIN=your-domain.com  # Votre nom de domaine

# Chemins (adaptez selon votre système)
DATA_DISK=/mnt/d                # Disque de données
MEDIA_PATH=/mnt/d               # Dossier des médias
CONFIG_PATH=/mnt/d/jellyflyzerd-config/config
CACHE_PATH=/mnt/d/jellyflyzerd-config/cache
LOGS_PATH=/mnt/d/jellyflyzerd-config/logs

# Système
SYSTEM_USER=your-username       # Votre utilisateur
PROJECT_DIR=/path/to/jellyflyzerd
```

### Structure des données

Le script d'installation créera automatiquement :

```
${DATA_DISK}/jellyflyzerd-config/
├── config/    # Configuration Jellyfin
├── cache/     # Cache et métadonnées
└── logs/      # Logs de tous les services
```

## Installation en tant que service

Pour démarrer automatiquement au boot :

```bash
sudo ./scripts/setup/install-service.sh
```

## HTTPS avec Let's Encrypt

1. **Obtenir un certificat** :
   ```bash
   sudo certbot certonly --webroot -w /var/www/html -d your-domain.com
   ```

2. **Synchroniser les certificats** :
   ```bash
   ./scripts/ssl/sync-ssl-certs.sh
   ```

3. **Automatiser le renouvellement** (crontab) :
   ```bash
   0 3 * * 0 /path/to/jellyflyzerd/scripts/ssl/sync-ssl-certs.sh
   ```