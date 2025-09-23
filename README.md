# 🎬 Jellyflyzerd v2.0.0

Modern Jellyfin manager with TypeScript and Docker support.

## ✨ Nouveautés v2.0.0

- 🐳 **Architecture Docker** - Isolation et sécurité maximale
- 🔷 **TypeScript** - Code moderne et type-safe
- 🎯 **CLI professionnel** - Interface en ligne de commande intuitive
- 🛡️ **Sécurité renforcée** - Utilisateur non-root, volumes isolés
- 📦 **Gestion automatique** - Configuration simplifiée
- 🔧 **API moderne** - Utilisation de l'SDK Jellyfin officiel

## 🚀 Installation

### Prérequis

- Node.js >= 18.0.0
- Docker et Docker Compose
- Git

### Installation rapide

```bash
# Cloner le repository
git clone https://github.com/your-username/jellyflyzerd.git
cd jellyflyzerd

# Installation des dépendances
npm install

# Configuration
cp .env.example .env
# Éditez .env avec vos paramètres

# Build du projet
npm run build

# Installation globale (optionnel)
npm link
```

## 📋 Utilisation

### Commandes principales

```bash
# Démarrer Jellyfin
jellyflyzerd start

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
CONFIG_PATH=./data/config
CACHE_PATH=./data/cache

# Sécurité
ENABLE_FIREWALL=true
ENABLE_FAIL2BAN=true
ENABLE_HTTPS=true
```

### Structure des dossiers

```
jellyflyzerd/
├── src/                    # Code source TypeScript
│   ├── commands/          # Commandes CLI
│   ├── services/          # Services (Docker, Jellyfin)
│   ├── types/             # Types TypeScript
│   ├── utils/             # Utilitaires
│   └── config/            # Configuration
├── data/                   # Données persistantes
│   ├── config/            # Config Jellyfin
│   └── cache/             # Cache Jellyfin
├── docker-compose.yml      # Configuration Docker
├── package.json           # Dépendances Node.js
└── tsconfig.json          # Configuration TypeScript
```

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

## 🛡️ Sécurité

### Améliorations v2.0.0

- **Isolation Docker** : Jellyfin dans un conteneur isolé
- **Utilisateur non-root** : UID/GID 1000:1000
- **Volumes sécurisés** : Médias en lecture seule
- **Network isolé** : Réseau Docker dédié
- **No new privileges** : Empêche l'escalade de privilèges

### Score de sécurité

La v2.0.0 atteint un score de **95%** grâce à :

- ✅ Firewall UFW actif
- ✅ HTTPS/SSL configuré
- ✅ Isolation Docker
- ✅ Utilisateur non-root
- ✅ Fail2ban protection
- ✅ Auto-updates système

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