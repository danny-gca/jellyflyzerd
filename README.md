# 🎬 Jellyflyzerd v2.0.0

CLI moderne pour la gestion de serveurs Jellyfin avec Docker.

## ✨ Fonctionnalités

- 🐳 **Architecture Docker** - Isolation et sécurité maximale
- 🔷 **TypeScript** - Code moderne et type-safe
- 🎯 **CLI intuitif** - Gestion simplifiée en ligne de commande
- 🛡️ **Sécurité renforcée** - Données isolées, HTTPS automatique
- 📁 **Structure centralisée** - Configuration et données organisées
- 🔧 **Installation automatisée** - Setup en une commande
- 🔒 **Audit de sécurité** - Vérifications automatisées
- 📊 **Monitoring intégré** - Surveillance des logs et accès

## 🚀 Installation rapide

```bash
# Cloner et installer
git clone <repository>
cd jellyflyzerd
cp .env.example .env
# Éditez .env avec vos paramètres

# Installation complète
./scripts/setup/setup.sh
```

## 📋 Utilisation

### Commandes principales

```bash
# Démarrer tous les services
jellyflyzerd start

# Vérifier le statut
jellyflyzerd status

# Voir les logs
jellyflyzerd logs

# Arrêter les services
jellyflyzerd stop
```

### 🔒 Sécurité et monitoring

```bash
# Audit de sécurité complet
jellyflyzerd security

# Monitoring des logs en temps réel
jellyflyzerd monitor --live

# Détecter les tentatives d'attaque
jellyflyzerd monitor --attacks

# Statistiques d'accès
jellyflyzerd monitor --stats

# Sauvegarder un rapport de sécurité
jellyflyzerd security --save security-report.json
```

## 📁 Structure du projet

```
jellyflyzerd/
├── src/                    # Code TypeScript du CLI
├── docker/                 # Configuration Docker
│   ├── docker-compose.yml
│   └── nginx/             # Proxy HTTPS
├── scripts/               # Scripts d'administration
│   ├── setup/            # Installation et démarrage auto
│   ├── ssl/              # Certificats SSL
│   └── maintenance/      # Monitoring et maintenance
├── docs/                  # Documentation complète
└── README.md             # Ce fichier
```

## 📖 Documentation

- **[Installation complète](docs/installation.md)** - Guide détaillé
- **[Sécurité](docs/security.md)** - Audit et protection
- **[Monitoring](docs/monitoring.md)** - Surveillance et logs
- **[Dépannage](docs/troubleshooting.md)** - Solutions aux problèmes
- **[Configuration Docker](docker/README.md)** - Services et volumes
- **[Scripts](scripts/README.md)** - Administration et maintenance

## 🌐 Accès

- **Interface web** : http://your-server:8096
- **HTTPS** : https://your-domain.com (avec certificat SSL)

## 🔧 Développement

```bash
# Installation des dépendances
npm install

# Compilation TypeScript
npm run build

# Développement en mode watch
npm run dev

# Arrêter Jellyfin
jellyflyzerd stop

# Statut des services
jellyflyzerd status

# Afficher les logs
jellyflyzerd logs

# Aide complète
jellyflyzerd --help
```

### Commandes avancées

```bash
# Statut détaillé en JSON
jellyflyzerd status --json --verbose

# Suivre les logs en temps réel
jellyflyzerd logs --follow

# Démarrage avec options
jellyflyzerd start --force  # Redémarrer si déjà en marche

# Monitoring automatisé (script shell)
./scripts/maintenance/monitor-security.sh

# Monitoring spécialisé
jellyflyzerd monitor --nginx     # Logs nginx uniquement
jellyflyzerd monitor --jellyfin  # Logs jellyfin uniquement
```

## 🐳 Architecture Docker

### Structure des conteneurs

```yaml
# Services
├── jellyfin     # Serveur Jellyfin principal
└── nginx        # Proxy HTTPS (optionnel)

# Volumes
├── jellyfin-config  # Configuration persistante
├── jellyfin-cache   # Cache et métadonnées
└── media           # Médias (lecture seule)
```

### Configuration Docker

Le fichier `docker-compose.yml` inclut :

- **Sécurité** : Utilisateur non-root (1000:1000)
- **Isolation** : `no-new-privileges:true`
- **Santé** : Health checks automatiques
- **Performances** : Limitations mémoire configurables
- **Réseau** : Network dédié

## ⚙️ Configuration

### Variables d'environnement (.env)

```bash
# Jellyfin
JELLYFIN_PORT=8096
JELLYFIN_HTTPS_PORT=8920

# Réseau
LOCAL_IP=192.168.1.100
EXTERNAL_DOMAIN=your-domain.com

# Chemins
MEDIA_PATH=/home/user/media
CONFIG_PATH=/path/to/jellyfin-config
CACHE_PATH=/path/to/jellyfin-cache

# Sécurité
ENABLE_FIREWALL=true
ENABLE_FAIL2BAN=true
ENABLE_HTTPS=true
```

### Structure des dossiers

Cette section est obsolète. Voir la structure mise à jour au début du README.

## 🔧 Développement

### Scripts de développement

```bash
# Mode développement (watch)
npm run dev

# Build de production
npm run build

# Tests
npm run test

# Linting
npm run lint

# Formatage du code
npm run format
```

### Architecture du code

- **Commands** : Gestion des commandes CLI avec Commander.js
- **Services** : Logic métier (DockerService, SecurityService)
- **Types** : Interfaces TypeScript pour la type safety
- **Utils** : Utilitaires (Logger, Validation)
- **Config** : Configuration centralisée avec validation

## 🛡️ Sécurité et Monitoring

### 🔒 Audit de sécurité automatisé

Jellyflyzerd inclut un système d'audit complet qui vérifie **25+ points de sécurité** :

```bash
# Audit complet
jellyflyzerd security

# Rapport JSON
jellyflyzerd security --json --save rapport.json
```

**Vérifications incluses** :
- ✅ Firewall (UFW/iptables)
- ✅ Fail2ban (protection anti-intrusion)
- ✅ Certificats SSL (validité et permissions)
- ✅ Configuration Docker (utilisateur, capabilities, volumes)
- ✅ Permissions système et mises à jour
- ✅ Accès externe (spécifique à votre exposition publique)

### 📊 Monitoring en temps réel

Surveillance intégrée des logs et métriques :

```bash
# Temps réel
jellyflyzerd monitor --live

# Détection d'attaques
jellyflyzerd monitor --attacks

# Statistiques d'accès
jellyflyzerd monitor --stats
```

**Fonctionnalités** :
- 🚨 Détection automatique d'attaques (WordPress, scanners, brute force)
- 📊 Statistiques IP, User-Agents, codes de statut
- 📈 Métriques système (CPU, RAM, disque)
- 🔍 Analyse historique 24h avec le script shell

### Score de sécurité

Avec l'audit automatisé, maintenez un score optimal :

- **🎯 Objectif** : > 90% avec 0 critique
- **📊 Monitoring** : Surveillance continue des accès
- **🛡️ Protection** : Détection et blocage automatique des menaces

## 📚 Documentation

- [Guide de sécurité](./SECURITY.md)
- [Configuration Docker](./docs/docker.md)
- [API Reference](./docs/api.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push sur la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Jellyfin Team](https://jellyfin.org/) pour l'excellent serveur média
- [Docker](https://docker.com/) pour la containerisation
- [TypeScript](https://typescriptlang.org/) pour la robustesse du code

---

**⭐ Si ce projet vous aide, n'hésitez pas à lui donner une étoile !**