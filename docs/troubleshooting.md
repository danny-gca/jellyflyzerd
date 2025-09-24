# Dépannage

Solutions aux problèmes courants.

## Problèmes de démarrage

### Jellyfin ne démarre pas

1. **Vérifier les permissions** :
   ```bash
   ls -la ${CONFIG_PATH}
   # Doit appartenir à votre utilisateur
   ```

2. **Vérifier l'espace disque** :
   ```bash
   df -h ${DATA_DISK}
   ```

3. **Consulter les logs** :
   ```bash
   jellyflyzerd logs
   # ou
   docker logs jellyflyzerd-jellyfin
   ```

### Problèmes de réseau

1. **Vérifier les ports** :
   ```bash
   netstat -tlnp | grep -E ':(80|443|8096)'
   ```

2. **Tester l'accès local** :
   ```bash
   curl -I http://localhost:8096
   ```

## Problèmes HTTPS

### Certificat SSL invalide

1. **Vérifier le certificat** :
   ```bash
   openssl x509 -in docker/nginx/ssl/cert.pem -text -noout
   ```

2. **Resynchroniser** :
   ```bash
   ./scripts/ssl/sync-ssl-certs.sh
   ```

3. **Regénérer la config nginx** :
   ```bash
   ./scripts/ssl/generate-nginx-config.sh
   jellyflyzerd stop && jellyflyzerd start
   ```

## Problèmes de données

### Configuration perdue

Si votre configuration Jellyfin disparaît après un redémarrage :

1. **Vérifier le montage** :
   ```bash
   docker exec jellyflyzerd-jellyfin ls -la /config
   ```

2. **Vérifier les chemins dans .env** :
   ```bash
   echo $CONFIG_PATH
   ls -la $CONFIG_PATH
   ```

### Cache volumineux

Pour nettoyer le cache sans perdre la configuration :

```bash
jellyflyzerd stop
rm -rf ${CACHE_PATH}/*
jellyflyzerd start
```

## Commandes utiles

```bash
# Status complet
jellyflyzerd status -v

# Logs en temps réel
jellyflyzerd logs -f

# Redémarrage propre
jellyflyzerd stop && jellyflyzerd start

# Vérifier la config Docker
cd docker && docker-compose config

# Reconstruire complètement
jellyflyzerd stop
docker-compose down --remove-orphans
jellyflyzerd start
```