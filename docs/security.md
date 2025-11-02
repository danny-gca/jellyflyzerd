# 🛡️ Guide de Sécurité Jellyflyzerd

Ce guide détaille les fonctionnalités de sécurité et d'audit intégrées à Jellyflyzerd.

## 🎯 Vue d'ensemble

Jellyflyzerd intègre un système d'audit de sécurité complet qui vérifie automatiquement 25+ points de sécurité critiques.

## 🔒 Commande `security`

### Utilisation de base

```bash
# Audit complet de sécurité
jellyflyzerd security

# Format JSON pour intégration
jellyflyzerd security --json

# Sauvegarder le rapport
jellyflyzerd security --save security-report.json

# Mode correction automatique (interactif)
jellyflyzerd security --fix
```

### Mode correction automatique

Le mode `--fix` permet de corriger automatiquement certains problèmes détectés lors de l'audit. Les corrections disponibles incluent :

- ✅ **Mises à jour système** : Installation automatique des mises à jour de paquets (`apt update && apt upgrade`)
- 🔒 **Permissions configuration Jellyfin** : Correction des permissions du répertoire de configuration (777 → 755)
- 👤 **Utilisateur du conteneur** : Configuration automatique de PUID/PGID pour éviter d'exécuter en root
- 🛡️ **Capabilities du conteneur** : Ajout des restrictions de capabilities Docker (cap_drop: ALL + whitelist minimale)

#### Fonctionnement

1. L'audit de sécurité s'exécute normalement
2. Les problèmes corrigibles sont listés
3. Confirmation interactive pour chaque correction
4. Exécution des corrections approuvées
5. Rapport des résultats

#### Exemple d'utilisation

```bash
$ jellyflyzerd security --fix

🔒 RAPPORT DE SÉCURITÉ JELLYFLYZERD
...

🔧 CORRECTIONS AUTOMATIQUES DISPONIBLES

1 problème(s) peuvent être corrigés automatiquement:

  • System Updates: 17 mises à jour disponibles
    💡 Effectuez les mises à jour de sécurité

? Voulez-vous procéder aux corrections automatiques disponibles ? (y/N)
```

#### Sécurité des corrections

- **Confirmation requise** : Chaque correction importante nécessite une confirmation
- **Exécution contrôlée** : Les modifications sont appliquées une par une
- **Rapport détaillé** : Résumé des succès et échecs
- **Réversibilité** : Les corrections peuvent être annulées individuellement

### Codes de sortie

| Code | Signification | Action |
|------|--------------|---------|
| **0** | ✅ Tout OK | Aucune action requise |
| **1** | ⚠️ Avertissements | Améliorations recommandées |
| **2** | ❌ Critiques | Action immédiate requise |

## 🔍 Vérifications effectuées

### 🔥 Sécurité réseau

#### Firewall (UFW/iptables)
- ✅ **Pass** : Règles restrictives actives
- ⚠️ **Warn** : Aucune règle restrictive
- ❌ **Fail** : Firewall inaccessible

```bash
# Configuration recommandée
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8096/tcp
sudo ufw enable
```

#### Fail2ban
- ✅ **Pass** : Actif avec jails configurées
- ⚠️ **Warn** : Installé mais non actif (WSL)
- ❌ **Fail** : Non installé

### 🐳 Sécurité Docker

#### Configuration des conteneurs
- **Utilisateur non-root** : Vérification PUID/PGID
- **Capabilities restreintes** : --cap-drop ALL recommandé
- **Volumes sécurisés** : Montages en lecture seule
- **Réseau isolé** : Network Docker dédié

#### Exemple de sécurisation

```yaml
# docker-compose.yml sécurisé
services:
  jellyfin:
    user: "1000:1000"
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    security_opt:
      - no-new-privileges:true
```

### 🔐 Certificats SSL

#### Vérifications
- **Présence** : Certificat et clé privée
- **Validité** : Date d'expiration
- **Permissions** : Clé privée 600/400

#### Configuration Let's Encrypt

```bash
# Votre configuration actuelle
/etc/letsencrypt/live/votredomaine.fr/
├── fullchain.pem    # Certificat complet
├── privkey.pem      # Clé privée
├── cert.pem         # Certificat seul
└── chain.pem        # Chaîne de confiance
```

### 🖥️ Sécurité système

#### Utilisateurs et permissions
- **Comptes utilisateurs** : Limitation des comptes avec shell
- **Mots de passe** : Vérification des comptes sans mot de passe
- **Permissions fichiers** : Détection des permissions trop larges
- **Fichiers SUID** : Audit des binaires privilégiés

#### Mises à jour système
- **Packages** : Vérification des mises à jour disponibles
- **Sécurité** : Priorité aux mises à jour de sécurité

## 🌐 Sécurité pour l'accès externe

### Vérifications spécifiques

Votre configuration expose Jellyfin publiquement via `votredomaine.fr`. L'audit inclut :

#### Test d'accessibilité externe
```bash
curl -s -I https://votredomaine.fr --max-time 10
```

#### Configuration Nginx sécurisée
- **Headers de sécurité** : HSTS, CSP, X-Frame-Options
- **Rate limiting** : Protection contre le brute force
- **Logs d'accès** : Surveillance des requêtes

### Configuration Nginx recommandée

```nginx
# Headers de sécurité
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header X-XSS-Protection "1; mode=block" always;

# Rate limiting
limit_req_zone $binary_remote_addr zone=jellyfin:10m rate=10r/m;
limit_req zone=jellyfin burst=5 nodelay;

# Logs détaillés
access_log /var/log/nginx/jellyfin-access.log combined;
error_log /var/log/nginx/jellyfin-error.log warn;
```

## 📊 Interprétation des résultats

### Types de statut

| Icône | Statut | Description |
|-------|--------|-------------|
| ✅ | **Pass** | Configuration sécurisée |
| ⚠️ | **Warn** | Amélioration recommandée |
| ❌ | **Fail** | Problème critique |
| ℹ️ | **N/A** | Non applicable au contexte |

### Exemples de rapports

#### Configuration optimale
```
📊 Résumé:
  ✅ Réussites: 20
  ⚠️ Avertissements: 3
  ❌ Échecs: 0
```

#### Configuration à améliorer
```
📊 Résumé:
  ✅ Réussites: 15
  ⚠️ Avertissements: 8
  ❌ Échecs: 2
  🚨 Critiques: 1
```

## 🚨 Actions prioritaires

### En cas de problèmes critiques

1. **Espace disque critique (>95%)**
   ```bash
   # Nettoyer le cache Jellyfin
   docker exec jellyflyzerd-jellyfin rm -rf /cache/transcodes/*

   # Analyser l'usage
   du -h /mnt/d/jellyflyzerd-config/ | sort -h
   ```

2. **Certificat SSL expiré**
   ```bash
   # Renouveler Let's Encrypt
   sudo certbot renew

   # Redémarrer nginx
   docker restart jellyflyzerd-nginx
   ```

3. **Conteneur en root**
   ```bash
   # Modifier docker-compose.yml
   user: "1000:1000"
   environment:
     - PUID=1000
     - PGID=1000
   ```

### Actions d'amélioration

1. **Configurer Fail2ban**
   ```bash
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban

   # Configuration pour Jellyfin
   echo "[jellyfin]
   enabled = true
   port = http,https
   filter = jellyfin
   logpath = /var/log/nginx/jellyfin-access.log
   maxretry = 3
   bantime = 600" | sudo tee /etc/fail2ban/jail.d/jellyfin.conf
   ```

2. **Optimiser les permissions**
   ```bash
   # Permissions sécurisées
   sudo chmod 755 /mnt/d/jellyflyzerd-config/
   sudo chmod 600 /etc/letsencrypt/live/*/privkey.pem
   ```

3. **Headers Nginx sécurisés**
   ```bash
   # Ajouter dans nginx.conf
   add_header Strict-Transport-Security "max-age=31536000" always;
   add_header X-Frame-Options DENY always;
   add_header X-Content-Type-Options nosniff always;
   ```

## 📅 Surveillance continue

### Automatisation de l'audit

```bash
# Audit quotidien
echo "0 6 * * * /usr/local/bin/jellyflyzerd security --save /var/log/security-$(date +\%Y\%m\%d).json" | crontab -
```

### Intégration avec monitoring

```bash
# Combiner audit et monitoring
jellyflyzerd security && jellyflyzerd monitor --stats
```

### Alertes automatiques

```bash
#!/bin/bash
# Script d'alerte personnalisé
REPORT=$(jellyflyzerd security --json)
CRITICAL=$(echo "$REPORT" | jq '.summary.critical_failed')

if [ "$CRITICAL" -gt 0 ]; then
    # Envoyer alerte (email, Slack, etc.)
    echo "🚨 Problèmes de sécurité critiques détectés!" | mail -s "Alerte Jellyflyzerd" admin@domain.com
fi
```

## 🔧 Configuration avancée

### Variables d'environnement de sécurité

```bash
# .env sécurisé
ENABLE_FIREWALL=true
ENABLE_FAIL2BAN=true
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/letsencrypt/live/votredomaine.fr/
SECURITY_HEADERS=true
RATE_LIMITING=true
```

### Profils de sécurité Docker

```bash
# Activer les profils de sécurité
docker run --security-opt seccomp=default \
           --security-opt apparmor=docker-default \
           --security-opt no-new-privileges:true
```

## 🔧 Corrections automatiques disponibles

Le système de corrections automatiques (`--fix`) peut gérer les problèmes suivants :

### ✅ Corrections actuellement implémentées

#### 1. Mises à jour système

**Détection** : `apt list --upgradable`
**Correction** : `sudo apt update && sudo apt upgrade -y`

**Conditions** :
- Requiert confirmation interactive
- Ne s'applique qu'aux systèmes basés sur Debian/Ubuntu
- Nécessite les droits sudo

**Exemple** :
```bash
$ jellyflyzerd security --fix

⚠️  System Updates: 17 mises à jour disponibles
   💡 Effectuez les mises à jour de sécurité

? Voulez-vous procéder aux corrections automatiques disponibles ? Yes

🔄 Correction de: System Updates...
? Confirmer la correction de "System Updates" ? Yes

📦 Mise à jour de la liste des paquets...
⬆️  Installation des mises à jour...
✅ 17 mise(s) à jour installée(s) avec succès

📊 RÉSUMÉ DES CORRECTIONS
  ✅ Réussies: 1
  ❌ Échouées: 0
  📝 Total: 1
```

### 🔄 Corrections futures prévues

Les corrections suivantes seront ajoutées dans les prochaines versions :

- **Permissions de fichiers** : Correction automatique des permissions trop larges
- **Configuration firewall** : Activation et configuration d'UFW
- **Configuration fail2ban** : Installation et activation
- **Permissions SSL** : Correction des permissions des certificats
- **Logrotate** : Configuration automatique
- **Nettoyage d'espace disque** : Suppression des caches et logs anciens

### 🔒 Sécurité du mode `--fix`

- Chaque correction nécessite une **confirmation explicite**
- Les modifications sont **journalisées**
- Possibilité d'**annuler individuellement** chaque correction
- **Aucune modification destructive** sans confirmation
- Rapport détaillé des **succès et échecs**

## 📚 Ressources complémentaires

- [Monitoring en temps réel](./monitoring.md)
- [Troubleshooting sécurité](./troubleshooting.md)
- [Configuration Docker](./docker.md)
- [OWASP Security Guidelines](https://owasp.org/)

---

**⚠️ Important** : Exécutez l'audit de sécurité régulièrement, surtout après des modifications de configuration ou des mises à jour système.

**🎯 Objectif** : Maintenir un score de sécurité > 90% avec 0 problème critique.