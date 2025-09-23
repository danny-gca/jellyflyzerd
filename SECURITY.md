# 🔒 Guide de Sécurité Jellyfin

Ce guide présente les mesures de sécurité recommandées pour sécuriser votre installation Jellyfin, particulièrement en environnement WSL.

## 📊 Évaluation de Sécurité

### ✅ Mesures de sécurité critiques

| Mesure | Priorité | Description | WSL Compatible |
|--------|----------|-------------|----------------|
| 🔒 **HTTPS/SSL** | CRITIQUE | Chiffrement des communications | ✅ |
| 🔥 **Firewall** | CRITIQUE | Filtrage des connexions réseau | ✅ |
| 🛡️ **Fail2ban** | IMPORTANTE | Protection anti-force brute | ✅ |
| 🔄 **Mises à jour auto** | IMPORTANTE | Correction des vulnérabilités | ✅ |
| 👤 **Utilisateur dédié** | IMPORTANTE | Isolation des privilèges | ⚠️ Complexe |
| 🔑 **Mots de passe forts** | CRITIQUE | Authentification robuste | ✅ Manuel |

### 📈 Calcul du score de sécurité

**Score = (Mesures implémentées / 6) × 100**

- **< 50%** : 🔴 Sécurité insuffisante
- **50-79%** : 🟡 Sécurité correcte
- **80%+** : 🟢 Excellente sécurité

## 🚨 Risques Identifiés

### Risques critiques

#### 1. 🔥 Firewall désactivé
- **Impact** : Exposition directe de tous les ports
- **Exploitation** : Accès non autorisé, scan de ports
- **Solution** : Activation UFW avec règles restrictives

#### 2. 🔑 Mots de passe faibles
- **Impact** : Compromission des comptes utilisateurs
- **Exploitation** : Attaques par dictionnaire, force brute
- **Solution** : Politique de mots de passe + audit régulier

#### 3. 👤 Utilisateur administrateur
- **Impact** : Privilèges excessifs en cas de compromission
- **Exploitation** : Accès système complet
- **Solution** : Utilisateur dédié (limité en WSL)

### Risques secondaires

#### 4. 🔄 Mises à jour manuelles
- **Impact** : Vulnérabilités non corrigées
- **Exploitation** : Failles de sécurité connues
- **Solution** : Automatisation des mises à jour

#### 5. 🛡️ Absence de protection anti-intrusion
- **Impact** : Attaques par force brute non détectées
- **Exploitation** : Tentatives de connexion multiples
- **Solution** : Installation fail2ban

## 🛡️ Solutions de Sécurisation

### 1. Configuration Firewall UFW

```bash
# Activation et configuration de base
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Ports Jellyfin essentiels
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 8096/tcp comment "Jellyfin"

# Vérification
sudo ufw status verbose
```

### 2. Installation Fail2ban

```bash
# Installation
sudo apt update && sudo apt install -y fail2ban

# Configuration Jellyfin
sudo tee /etc/fail2ban/jail.d/jellyfin.conf > /dev/null << 'EOF'
[jellyfin]
enabled = true
port = 8096,80,443
protocol = tcp
filter = jellyfin
logpath = /path/to/jellyfin/logs/jellyfin.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

# Filtre de détection
sudo tee /etc/fail2ban/filter.d/jellyfin.conf > /dev/null << 'EOF'
[Definition]
failregex = ^.*Authentication request.*denied.*IP: "<HOST>".*$
            ^.*Invalid username or password.*IP: "<HOST>".*$
ignoreregex =
EOF
```

### 3. Mises à Jour Automatiques

```bash
# Installation unattended-upgrades
sudo apt install -y unattended-upgrades

# Configuration automatique
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades

# Configuration sécurisée
sudo tee /etc/apt/apt.conf.d/51unattended-upgrades-jellyfin > /dev/null << 'EOF'
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
```

### 4. Configuration HTTPS/SSL

#### Avec Let's Encrypt
```bash
# Installation Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtention du certificat
sudo certbot --nginx -d votre-domaine.com

# Renouvellement automatique
sudo crontab -e
# Ajouter : 0 2 * * * certbot renew --quiet
```

#### Configuration Nginx sécurisée
```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # Headers de sécurité
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000";

    # Limitation des uploads
    client_max_body_size 100M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=jellyfin:10m rate=10r/m;
    limit_req zone=jellyfin burst=5 nodelay;

    location / {
        proxy_pass http://localhost:8096;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Audit des Mots de Passe

#### Recommandations
- **Longueur minimale** : 12 caractères
- **Complexité** : Lettres, chiffres, symboles
- **Unicité** : Pas de réutilisation
- **Rotation** : Changement périodique

#### Processus d'audit
1. Connexion interface admin Jellyfin
2. Administration → Utilisateurs
3. Vérification de chaque compte :
   - Complexité du mot de passe
   - Suppression des comptes inutilisés
   - Désactivation du compte invité

### 6. Utilisateur Dédié (Avancé)

⚠️ **Note WSL** : Configuration complexe due aux limitations de permissions

```bash
# Création utilisateur système
sudo useradd --system --no-create-home --shell /bin/false jellyfinuser

# Attribution des permissions (adaptation nécessaire pour WSL)
sudo chown -R jellyfinuser:jellyfinuser /path/to/jellyfin/data
sudo chown -R jellyfinuser:jellyfinuser /path/to/jellyfin/cache

# Démarrage avec utilisateur dédié
sudo -u jellyfinuser jellyfin --datadir /path/to/data
```

## 🔍 Scripts d'Audit

### Audit automatique

```bash
#!/bin/bash
# security-audit.sh

echo "=== Audit de Sécurité Jellyfin ==="

# Firewall
if sudo ufw status | grep -q "Status: active"; then
    echo "✅ Firewall UFW actif"
else
    echo "❌ Firewall UFW inactif"
fi

# HTTPS
if [ -f "/etc/nginx/sites-available/jellyfin" ] && grep -q "ssl_certificate" /etc/nginx/sites-available/jellyfin; then
    echo "✅ HTTPS configuré"
else
    echo "❌ HTTPS non configuré"
fi

# Fail2ban
if command -v fail2ban-client &> /dev/null && [ -f "/etc/fail2ban/jail.d/jellyfin.conf" ]; then
    echo "✅ Fail2ban installé"
else
    echo "❌ Fail2ban non configuré"
fi

# Mises à jour automatiques
if [ -f "/etc/apt/apt.conf.d/20auto-upgrades" ]; then
    echo "✅ Mises à jour automatiques"
else
    echo "❌ Mises à jour manuelles"
fi

# Utilisateur dédié
jellyfin_user=$(ps aux | grep '[j]ellyfin' | awk '{print $1}' | head -1)
if [ "$jellyfin_user" != "root" ] && [ "$jellyfin_user" != "$(whoami)" ]; then
    echo "✅ Utilisateur dédié: $jellyfin_user"
else
    echo "⚠️  Utilisateur admin: $jellyfin_user"
fi
```

### Test de pénétration basique

```bash
#!/bin/bash
# pentest-jellyfin.sh

echo "=== Test de Sécurité Jellyfin ==="

# Test des ports ouverts
echo "Ports exposés :"
nmap -sT localhost -p 80,443,8096 2>/dev/null

# Test HTTPS
echo "Configuration SSL :"
if command -v openssl &> /dev/null; then
    openssl s_client -connect localhost:443 -servername votre-domaine.com < /dev/null 2>/dev/null | grep "Verification:"
fi

# Test fail2ban
echo "Protection fail2ban :"
if command -v fail2ban-client &> /dev/null; then
    sudo fail2ban-client status jellyfin 2>/dev/null || echo "Jail jellyfin non active"
fi
```

## 📋 Checklist de Sécurité

### Configuration de base
- [ ] UFW activé avec règles restrictives
- [ ] Certificats SSL configurés et renouvelés automatiquement
- [ ] Nginx configuré avec headers de sécurité
- [ ] Jellyfin exécuté avec utilisateur non-privilégié (si possible)

### Protection avancée
- [ ] Fail2ban configuré pour Jellyfin
- [ ] Rate limiting activé sur Nginx
- [ ] Logs de sécurité surveillés
- [ ] Sauvegardes chiffrées et testées

### Maintenance
- [ ] Mises à jour automatiques activées
- [ ] Audit des mots de passe trimestriel
- [ ] Révision des comptes utilisateurs
- [ ] Test de restauration semestriel

## 🚨 Procédures d'Incident

### Compromission suspectée

1. **Isolation immédiate**
   ```bash
   # Arrêt du service
   sudo systemctl stop jellyfin

   # Blocage du trafic
   sudo ufw deny 8096
   ```

2. **Analyse des logs**
   ```bash
   # Connexions suspectes
   grep -i "authentication.*failed" /path/to/jellyfin.log

   # IPs bannies
   sudo fail2ban-client status jellyfin
   ```

3. **Actions correctives**
   - Changement de tous les mots de passe
   - Révocation des sessions actives
   - Analyse forensique des logs
   - Mise à jour système complète

### Récupération post-incident

1. **Vérification de l'intégrité**
2. **Restauration depuis sauvegarde propre**
3. **Renforcement de la sécurité**
4. **Surveillance accrue**

## 📚 Ressources

### Documentation officielle
- [Jellyfin Security](https://jellyfin.org/docs/general/administration/security/)
- [UFW Guide](https://help.ubuntu.com/community/UFW)
- [Fail2ban Documentation](https://www.fail2ban.org/wiki/index.php/Main_Page)
- [Let's Encrypt](https://letsencrypt.org/docs/)

### Outils de sécurité
- **Nmap** : Scan de ports
- **OpenSSL** : Test SSL/TLS
- **Lynis** : Audit système
- **ClamAV** : Antivirus

---

**📅 Mise à jour recommandée** : Révision trimestrielle de ce guide
**🔄 Prochaine révision** : Trois mois après implémentation