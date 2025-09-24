# Scripts d'administration

Scripts pour l'installation, la maintenance et la configuration de Jellyflyzerd.

## Structure

```
scripts/
├── setup/                     # Installation et configuration
│   ├── setup.sh              # Installation principale
│   ├── install-service.sh     # Service système
│   └── start-on-boot.sh       # Démarrage automatique
├── ssl/                       # Gestion SSL/TLS
│   ├── sync-ssl-certs.sh      # Synchronisation certificats
│   └── generate-nginx-config.sh # Génération config nginx
└── maintenance/               # Maintenance (futur)
```

## Installation

```bash
# Installation complète
./scripts/setup/setup.sh

# Installation en tant que service système
sudo ./scripts/setup/install-service.sh
```

## Certificats SSL

```bash
# Synchroniser les certificats Let's Encrypt
./scripts/ssl/sync-ssl-certs.sh

# Générer la configuration nginx
./scripts/ssl/generate-nginx-config.sh
```

## Configuration automatique

Les scripts utilisent les variables d'environnement du fichier `.env` pour s'adapter automatiquement à votre configuration.