# Configuration Nginx

## Génération automatique

La configuration nginx est générée automatiquement à partir du template pour éviter de leak des données sensibles.

### Utilisation :

```bash
# Générer la configuration nginx
./scripts/generate-nginx-config.sh
```

### Fichiers :

- `nginx.conf.template` - Template de configuration (versionné)
- `nginx.conf` - Configuration générée (ignoré par git)
- `ssl/` - Certificats SSL (voir ssl/README.md)

### Variables utilisées :

- `EXTERNAL_DOMAIN` - Votre nom de domaine (depuis .env)

### Note de sécurité :

Le fichier `nginx.conf` est automatiquement ignoré par git car il contient votre nom de domaine personnel.