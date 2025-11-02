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
- **watchtower** : Mises à jour automatiques des conteneurs Docker
- **fail2ban** : TODO

## Données persistantes

Toutes les données sont stockées dans la structure centralisée définie par `.env` :

- Configuration : `${CONFIG_PATH}`
- Cache : `${CACHE_PATH}`
- Logs : `${LOGS_PATH}`
- Médias : `${MEDIA_PATH}` (lecture seule)

## 🔄 Mises à jour Docker

### Pourquoi les images Docker ne se mettent pas à jour automatiquement ?

Le tag `:latest` ne signifie PAS "toujours à jour". Docker télécharge l'image une seule fois et ne vérifie pas les mises à jour automatiquement.

**Vos images actuelles** :
- Jellyfin : dernière pull il y a 6 mois
- Nginx : dernière pull il y a 2 mois

### Option 2 : Mises à jour automatiques avec Watchtower (Déjà configuré !)

Watchtower est maintenant inclus dans votre `docker-compose.yml` et va :

- ✅ Vérifier les mises à jour **tous les jours à 4h du matin**
- ✅ Mettre à jour automatiquement Jellyfin et Nginx
- ✅ Nettoyer les anciennes images
- ✅ Redémarrer les conteneurs avec les nouvelles versions

#### Configuration Watchtower

Dans votre `.env` :

```bash
# Mode surveillance uniquement (ne met pas à jour, juste alerte)
WATCHTOWER_MONITOR_ONLY=false  # false = mise à jour automatique activée

# Notifications (optionnel)
WATCHTOWER_NOTIFICATION_URL=discord://token@id  # Pour Discord
# Ou: slack://token@channel
# Ou: smtp://user:pass@host:port/?from=...&to=...
```

#### Activer Watchtower

```bash
# Redémarrer avec Watchtower
cd docker && docker-compose up -d

# Vérifier les logs de Watchtower
docker logs jellyflyzerd-watchtower

# Forcer une vérification manuelle immédiate
docker exec jellyflyzerd-watchtower /watchtower --run-once
```

**Solutions** :

**Option A : Vérification manuelle après démarrage** (Recommandé)
```bash
# Forcer une vérification quand tu démarres ton PC
docker exec jellyflyzerd-watchtower /watchtower --run-once
```

**Option B : Utiliser POLL_INTERVAL au lieu de SCHEDULE**

Dans `docker-compose.yml`, remplace :
```yaml
- WATCHTOWER_SCHEDULE=0 0 4 * * *
```

Par :
```yaml
- WATCHTOWER_POLL_INTERVAL=86400  # Vérifie 24h après le dernier check
```

Avec `POLL_INTERVAL`, Watchtower vérifie **24h après son démarrage**, donc si tu démarres à 8h, il vérifiera à 8h le lendemain.

**Option C : Script de démarrage automatique**

Un script est disponible pour vérifier automatiquement au démarrage :

```bash
# Tester le script manuellement
./scripts/docker/check-updates-on-startup.sh
```

**Pour automatiser au démarrage du PC (WSL)** :

Ajouter dans ton `~/.bashrc` ou `~/.zshrc` :

```bash
# Vérifier les mises à jour Docker au démarrage (en arrière-plan)
if docker ps &>/dev/null && docker ps | grep -q "jellyflyzerd-watchtower"; then
    (cd ~/projects/jellyflyzerd && ./scripts/docker/check-updates-on-startup.sh) &
fi
```

**Pour automatiser au démarrage du système (Linux natif)** :

Créer un service systemd :

```bash
# Créer le fichier de service
sudo tee /etc/systemd/system/jellyflyzerd-update-check.service > /dev/null <<EOF
[Unit]
Description=Jellyflyzerd Docker Update Check
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=VOTREUSER
ExecStart=/home/VOTREUSER/projects/jellyflyzerd/scripts/docker/check-updates-on-startup.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Activer le service
sudo systemctl enable jellyflyzerd-update-check.service
sudo systemctl start jellyflyzerd-update-check.service
```

#### Mode monitoring (test avant activation)

Si vous voulez d'abord tester sans mettre à jour automatiquement :

```bash
# Dans .env
WATCHTOWER_MONITOR_ONLY=true

# Redémarrer
cd docker && docker-compose up -d

# Watchtower va afficher les mises à jour disponibles dans les logs
docker logs -f jellyflyzerd-watchtower
```

### Option 3 : Mise à jour via la commande security

Une future version ajoutera la vérification des mises à jour Docker dans :

```bash
jellyflyzerd security --fix
```

### Vérifier les mises à jour disponibles

```bash
# Vérifier si de nouvelles versions existent
docker-compose pull --dry-run

# Voir les images actuelles
docker images | grep -E "jellyfin|nginx|watchtower"
```

### Fréquence recommandée

- **Avec Watchtower** : Automatique (quotidien à 4h)
- **Manuel** : Au minimum mensuel, idéalement hebdomadaire
- **Après une alerte de sécurité** : Immédiatement

### Rollback en cas de problème

Si une mise à jour cause des problèmes :

```bash
# Voir l'historique des images
docker images jellyfin/jellyfin --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}"

# Revenir à une version spécifique
docker-compose down
# Modifier docker-compose.yml: image: jellyfin/jellyfin:<version>
docker-compose up -d
```


<!-- fail2BAN -->

# Voir les attaques réelles (avec vraies IPs maintenant)
jellyflyzerd monitor --attacks
docker logs jellyflyzerd-nginx 2>&1 | grep -i "limiting\|503" | tail -20

# Statut fail2ban
docker exec jellyflyzerd-fail2ban fail2ban-client status

# IPs bannies
docker exec jellyflyzerd-fail2ban fail2ban-client status jellyfin-env-scan