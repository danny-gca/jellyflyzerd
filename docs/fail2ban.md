# Fail2ban - Protection contre les attaques

Jellyflyzerd utilise Fail2ban pour protéger automatiquement votre serveur contre les tentatives d'attaques et les scans malveillants.

## Vue d'ensemble

Fail2ban analyse les logs nginx en temps réel et bannit automatiquement les adresses IP qui présentent un comportement malveillant. Il fonctionne dans un conteneur Docker avec accès au réseau host pour pouvoir gérer les règles iptables.

## Configuration des jails

Les jails (prisons) sont des règles de détection configurées dans [docker/fail2ban/jail.d/nginx.conf](../docker/fail2ban/jail.d/nginx.conf).

### Jails actives

#### 1. nginx-http-auth
Protection contre les tentatives d'authentification HTTP échouées.
- **maxretry**: 5 tentatives
- **findtime**: 600 secondes (10 minutes)
- **bantime**: 3600 secondes (1 heure)

#### 2. nginx-noscript
Protection contre les tentatives d'exécution de scripts non autorisés.
- **maxretry**: 3 tentatives
- **findtime**: 300 secondes (5 minutes)
- **bantime**: 7200 secondes (2 heures)

#### 3. nginx-badbots
Blocage des robots malveillants connus.
- **maxretry**: 2 tentatives
- **findtime**: 600 secondes (10 minutes)
- **bantime**: 86400 secondes (24 heures)

#### 4. nginx-noproxy
Protection contre les tentatives d'utilisation comme proxy.
- **maxretry**: 2 tentatives
- **findtime**: 600 secondes (10 minutes)
- **bantime**: 86400 secondes (24 heures)

#### 5. nginx-limit-req
Protection contre les violations de rate limiting.
- **maxretry**: 10 tentatives
- **findtime**: 600 secondes (10 minutes)
- **bantime**: 3600 secondes (1 heure)

#### 6. jellyfin-env-scan (Custom)
Filtre personnalisé pour bloquer les scans de fichiers sensibles (.env, .git, .aws, etc.).
- **maxretry**: 3 tentatives
- **findtime**: 300 secondes (5 minutes)
- **bantime**: 86400 secondes (24 heures)

## Commandes utiles

### Vérifier le statut de Fail2ban

```bash
docker exec jellyflyzerd-fail2ban fail2ban-client status
```

### Vérifier le statut d'une jail spécifique

```bash
docker exec jellyflyzerd-fail2ban fail2ban-client status nginx-http-auth
docker exec jellyflyzerd-fail2ban fail2ban-client status jellyfin-env-scan
```

### Lister les IP bannies

```bash
# Pour toutes les jails
docker exec jellyflyzerd-fail2ban fail2ban-client status | grep "Jail list"

# Pour une jail spécifique
docker exec jellyflyzerd-fail2ban fail2ban-client status nginx-http-auth
```

### Débannir une IP

```bash
# Débannir une IP d'une jail spécifique
docker exec jellyflyzerd-fail2ban fail2ban-client set nginx-http-auth unbanip <IP>

# Débannir une IP de toutes les jails
docker exec jellyflyzerd-fail2ban fail2ban-client unban <IP>
```

### Bannir manuellement une IP

```bash
docker exec jellyflyzerd-fail2ban fail2ban-client set nginx-http-auth banip <IP>
```

### Voir les logs de Fail2ban

```bash
docker logs jellyflyzerd-fail2ban

# Suivre les logs en temps réel
docker logs -f jellyflyzerd-fail2ban
```

## Intégration avec Jellyflyzerd

### Commande status

La commande `jellyflyzerd status` affiche l'état de fail2ban :

```bash
jellyflyzerd status
```

Affichera :
```
🎬 Services Docker:
  🎬 Jellyfin: 🟢 EN MARCHE
  🟦 Nginx: 🟢 EN MARCHE
  🔄 Watchtower: 🟢 EN MARCHE
  🛡️  Fail2ban: 🟢 EN MARCHE
  📈 Services actifs: 4/4
```

### Commande monitor

Pour voir les attaques détectées, utilisez :

```bash
jellyflyzerd monitor --attacks
```

Cette commande affiche désormais les vraies adresses IP des attaquants (grâce à X-Forwarded-For) et non plus l'IP du gateway Docker.

## Protection multi-niveaux

Fail2ban fait partie d'un système de protection en profondeur :

1. **Nginx - Première ligne de défense**
   - Rate limiting (100 req/s, burst 200) - adapté à l'usage normal de Jellyfin
   - Limite de 50 connexions simultanées par IP
   - Blocage des user-agents malveillants
   - Blocage d'accès aux fichiers sensibles
   - robots.txt pour décourager les bots
   - Logging des vraies IP via X-Forwarded-For
docker logs jellyflyzerd-nginx 2>&1 | grep -i "limiting\|503" | tail -20

2. **Fail2ban - Bannissement automatique**
   - Analyse des logs en temps réel
   - Bannissement automatique des IPs malveillantes
   - Règles iptables pour bloquer au niveau réseau

3. **Monitoring continu**
   - Commande `jellyflyzerd monitor` pour surveiller
   - Alertes sur comportements suspects
   - Statistiques d'attaques

## Fichiers de configuration

### Structure

```
docker/fail2ban/
├── jail.d/
│   └── nginx.conf          # Configuration des jails
├── filter.d/
│   └── jellyfin-env-scan.conf  # Filtre personnalisé
└── action.d/               # Actions personnalisées (si besoin)
```

### Modifier les jails

Pour modifier une jail, éditez [docker/fail2ban/jail.d/nginx.conf](../docker/fail2ban/jail.d/nginx.conf) puis redémarrez :

```bash
./scripts/docker/compose.sh restart fail2ban
```

### Créer un filtre personnalisé

1. Créez un fichier dans `docker/fail2ban/filter.d/`
2. Définissez votre regex `failregex`
3. Ajoutez une jail dans `jail.d/nginx.conf` qui utilise ce filtre
4. Redémarrez fail2ban

Exemple de filtre personnalisé ([jellyfin-env-scan.conf](../docker/fail2ban/filter.d/jellyfin-env-scan.conf)) :

```conf
[Definition]
failregex = ^<HOST> .* "(GET|POST|HEAD).*(\.env|\.git|\.aws|\.azure|phpunit|vendor|config/|admin/config).*" (404|403|400)
ignoreregex =
```

## Dépannage

### Fail2ban ne démarre pas

1. Vérifiez les logs :
   ```bash
   docker logs jellyflyzerd-fail2ban
   ```

2. Vérifiez que le mode host network fonctionne :
   ```bash
   docker exec jellyflyzerd-fail2ban iptables -L
   ```

### Une jail ne se charge pas

```bash
# Vérifier la configuration
docker exec jellyflyzerd-fail2ban fail2ban-client status

# Vérifier les erreurs
docker logs jellyflyzerd-fail2ban | grep ERROR
```

Si une jail n'est pas chargée, c'est probablement que le filtre associé n'existe pas ou a une erreur de syntaxe.

### Logs nginx non accessibles

Fail2ban lit les logs depuis `/var/log/nginx/` qui est monté en lecture seule. Vérifiez que :

1. Le volume est bien monté :
   ```bash
   docker inspect jellyflyzerd-fail2ban | grep Mounts -A 20
   ```

2. Les logs existent :
   ```bash
   docker exec jellyflyzerd-fail2ban ls -la /var/log/nginx/
   ```

### Débannir accidentellement sa propre IP

Si vous vous êtes banni vous-même :

1. Connectez-vous au serveur via SSH ou console locale
2. Débannissez votre IP :
   ```bash
   docker exec jellyflyzerd-fail2ban fail2ban-client unban <VOTRE_IP>
   ```

3. Ajoutez votre IP à la liste blanche dans `jail.d/nginx.conf` :
   ```conf
   ignoreip = 127.0.0.1/8 ::1 <VOTRE_IP>
   ```

## Statistiques et monitoring

### Voir les statistiques de bannissement

```bash
# Nombre total de bans
docker exec jellyflyzerd-fail2ban fail2ban-client status | grep "Currently banned"

# Statistiques par jail
for jail in nginx-http-auth nginx-noscript nginx-badbots nginx-noproxy nginx-limit-req jellyfin-env-scan; do
  echo "=== $jail ==="
  docker exec jellyflyzerd-fail2ban fail2ban-client status $jail
done
```

### Base de données des bans

Fail2ban conserve une base SQLite de tous les bans. Elle est purgée automatiquement après 30 jours (configuration `F2B_DB_PURGE_AGE=30d`).

Emplacement : `docker/fail2ban/db/fail2ban.sqlite3`

## Bonnes pratiques

1. **Ne modifiez pas les durées de ban à la légère** - Des bans trop courts peuvent être inefficaces, des bans trop longs peuvent bloquer des utilisateurs légitimes avec IP dynamique.

2. **Surveillez régulièrement** - Utilisez `jellyflyzerd monitor --attacks` pour voir les tentatives d'attaques.

3. **Ajustez les maxretry selon vos besoins** - Si vous avez beaucoup de faux positifs, augmentez maxretry. Si les attaques passent, diminuez-le.

4. **Logs centralisés** - Les logs sont dans `/var/log/nginx/`, pensez à les rotationner si nécessaire.

5. **Testez après modification** - Après avoir modifié la configuration, vérifiez que les jails se chargent correctement.

## Sécurité additionnelle

Pour renforcer encore la sécurité :

1. **UFW/Firewall** - Utilisez également un firewall système
2. **Mises à jour automatiques** - Activées via Watchtower
3. **Certificats SSL** - Renouvellement automatique via Let's Encrypt
4. **Audit régulier** - `jellyflyzerd security audit` pour vérifier la configuration

## Ressources

- [Documentation officielle Fail2ban](https://www.fail2ban.org/)
- [Image Docker crazymax/fail2ban](https://github.com/crazy-max/docker-fail2ban)
- [Configuration nginx](../docker/nginx/nginx.conf.template)
- [Documentation sécurité Jellyflyzerd](./security.md)
