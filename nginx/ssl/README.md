# Certificats SSL

Ce dossier doit contenir vos certificats SSL pour l'accès HTTPS.

## Fichiers requis :
- `cert.pem` - Certificat SSL
- `key.pem` - Clé privée SSL

## Génération d'un certificat auto-signé (pour test) :

```bash
# Depuis le répertoire nginx/ssl/
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=FR/ST=France/L=Paris/O=Jellyflyzerd/CN=jellyflyzerd.freeboxos.fr"
```

## Certificat Let's Encrypt (recommandé) :

1. Installer certbot sur votre serveur
2. Générer le certificat :
   ```bash
   certbot certonly --webroot -w /path/to/webroot -d jellyflyzerd.freeboxos.fr
   ```
3. Copier les certificats :
   ```bash
   cp /etc/letsencrypt/live/jellyflyzerd.freeboxos.fr/fullchain.pem cert.pem
   cp /etc/letsencrypt/live/jellyflyzerd.freeboxos.fr/privkey.pem key.pem
   ```

## Démarrage avec nginx :

```bash
docker-compose --profile nginx up -d
```