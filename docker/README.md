# Configuration Docker

Cette section contient toute la configuration Docker pour Jellyflyzerd.

## Structure

```
docker/
├── docker-compose.yml          # Configuration principale
└── nginx/                      # Proxy Nginx
    ├── nginx.conf.template     # Template de config
    ├── nginx.conf             # Config générée (ignoré)
    └── ssl/                   # Certificats SSL
```

## Démarrage

```bash
# Générer la configuration nginx
./scripts/ssl/generate-nginx-config.sh

# Démarrer tous les services
cd docker && docker-compose up -d

# Ou utiliser le CLI
jellyflyzerd start
```

## Services

- **jellyfin** : Serveur média principal (port 8096)
- **nginx** : Proxy inverse HTTPS (ports 80/443)

## Données persistantes

Toutes les données sont stockées dans la structure centralisée définie par `.env` :

- Configuration : `${CONFIG_PATH}`
- Cache : `${CACHE_PATH}`
- Logs : `${LOGS_PATH}`
- Médias : `${MEDIA_PATH}` (lecture seule)