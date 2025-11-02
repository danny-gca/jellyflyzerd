# 🔐 Gestion des Certificats SSL

Guide pour la gestion automatique des certificats SSL Let's Encrypt pour Jellyflyzerd.

## 📋 Vue d'ensemble

Le projet utilise des certificats SSL Let's Encrypt pour sécuriser l'accès HTTPS à Jellyfin via le domaine configuré. Le renouvellement est automatisé via plusieurs mécanismes.

## ✅ État du Certificat

### Vérifier manuellement

```bash
# Afficher l'état du certificat
openssl x509 -in docker/nginx/ssl/cert.pem -noout -dates

# Vérifier les jours restants
openssl x509 -in docker/nginx/ssl/cert.pem -checkend 2592000  # 30 jours
```

### Via l'outil CLI (en développement)

```bash
# Statut du certificat (Note: bug de validation IP à corriger)
jellyflyzerd ssl status
```

## 🔄 Renouvellement Automatique

### Mécanisme 1 : Vérification au Démarrage

Le script `scripts/docker/check-updates-on-startup.sh` vérifie automatiquement le certificat SSL à chaque ouverture de terminal (avec cache de 7 jours).

**Comportement** :
- ✅ **Certificat valide (>30 jours)** : Aucune action
- ⚠️ **Expire bientôt (<30 jours)** : Affiche un avertissement
- ❌ **Certificat expiré** : Renouvelle automatiquement

**Configuration dans `.bashrc`** :
```bash
# Vérifications automatiques au démarrage du terminal
PROJECT_DIR="$HOME/projects/jellyflyzerd"  # Ajustez selon votre installation
if [ -f "$PROJECT_DIR/scripts/docker/check-updates-on-startup.sh" ]; then
    ( cd "$PROJECT_DIR" && ./scripts/docker/check-updates-on-startup.sh )
fi
```

### Mécanisme 2 : Cron Hebdomadaire

Une tâche cron vérifie et renouvelle le certificat chaque lundi à 3h du matin.

**Crontab actuelle** :
```bash
# Renouvellement automatique des certificats SSL Let's Encrypt
# Vérification chaque lundi à 3h du matin
0 3 * * 1 $PROJECT_DIR/scripts/ssl/renew-and-sync.sh >> $PROJECT_DIR/logs/ssl-cron.log 2>&1
```

**Vérifier la crontab** :
```bash
crontab -l
```

## 🛠️ Renouvellement Manuel

### Script Bash Recommandé

```bash
# Méthode recommandée (script complet)
bash scripts/ssl/renew-and-sync.sh
```

Ce script :
1. Arrête nginx Docker temporairement
2. Renouvelle le certificat avec certbot (mode standalone)
3. Copie les certificats vers `docker/nginx/ssl/`
4. Redémarre nginx Docker
5. Log tout dans `logs/ssl-renew.log`

### Commande Certbot Directe

```bash
# Arrêter nginx Docker
cd docker && docker-compose stop nginx

# Renouveler avec certbot
sudo certbot certonly --standalone --force-renewal -d $EXTERNAL_DOMAIN \
  --non-interactive --agree-tos --email noreply@$EXTERNAL_DOMAIN

# Copier les certificats
sudo cp /etc/letsencrypt/live/$EXTERNAL_DOMAIN/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$EXTERNAL_DOMAIN/privkey.pem docker/nginx/ssl/key.pem
sudo chown $USER:$USER docker/nginx/ssl/*.pem
chmod 644 docker/nginx/ssl/cert.pem
chmod 600 docker/nginx/ssl/key.pem

# Redémarrer nginx
cd docker && docker-compose up -d nginx
```

## 📊 Historique de Renouvellement

### Vérifier les logs

```bash
# Log du script de renouvellement
tail -50 logs/ssl-renew.log

# Log cron
tail -50 logs/ssl-cron.log

# Logs Let's Encrypt
sudo tail -50 /var/log/letsencrypt/letsencrypt.log
```

### Certificats Let's Encrypt

```bash
# Lister tous les certificats
sudo certbot certificates

# Informations détaillées
sudo certbot certificates | grep -A10 "$EXTERNAL_DOMAIN"
```

## 🚨 Problèmes Courants

### Certificat Expiré

**Symptôme** : `SSL certificate problem: certificate has expired`

**Solution** :
```bash
bash scripts/ssl/renew-and-sync.sh
```

### Port 80/443 Occupé

**Symptôme** : `bind() to 0.0.0.0:443 failed`

**Solution** : Le script arrête automatiquement nginx Docker, mais si vous renouvelez manuellement :
```bash
cd docker && docker-compose stop nginx
# ... puis certbot ...
cd docker && docker-compose up -d nginx
```

### Échec de la Validation HTTP

**Symptôme** : `Failed authorization procedure`

**Causes possibles** :
1. Port 80 non accessible depuis l'extérieur
2. Firewall bloquant les connexions
3. Configuration DNS incorrecte

**Vérification** :
```bash
# Tester l'accès externe
curl -I http://$EXTERNAL_DOMAIN

# Vérifier que nginx est arrêté pendant certbot
docker ps | grep nginx
```

## 🔒 Sécurité

### Permissions des Certificats

```bash
# Certificat public (lecture seule)
chmod 644 docker/nginx/ssl/cert.pem

# Clé privée (lecture propriétaire uniquement)
chmod 600 docker/nginx/ssl/key.pem
```

### Données Sensibles

⚠️ **IMPORTANT** : Le domaine (`EXTERNAL_DOMAIN`) est configuré dans `.env` mais **ne doit PAS** être committé.

**Fichiers** :
- ✅ `.env.example` → `EXTERNAL_DOMAIN=your-domain.com` (template)
- ❌ `.env` → Contient le vrai domaine (dans `.gitignore`)

## 📅 Calendrier de Renouvellement

Les certificats Let's Encrypt sont valides **90 jours**.

**Timeline actuelle** :
- **Émission** : 31 octobre 2025
- **Expiration** : 28 janvier 2026
- **Renouvellement recommandé** : À partir du 29 décembre 2025 (30 jours avant)

**Vérifications automatiques** :
- ✅ Chaque ouverture de terminal (cache 7 jours)
- ✅ Chaque lundi 3h du matin (cron)

## 🐛 Bugs Connus

### `jellyflyzerd ssl renew` - Erreur de Validation IP

**Symptôme** :
```
ZodError: Invalid ip
```

**Cause** : Validation Zod stricte sur `LOCAL_IP` dans la config globale

**Workaround** : Utiliser le script bash direct :
```bash
bash scripts/ssl/renew-and-sync.sh
```

**Status** : À corriger dans une prochaine version

## 📚 Ressources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Box DNS Configuration](https://votreDomaineBox.fr/)
