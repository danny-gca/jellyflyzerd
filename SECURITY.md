# 🔒 Guide de Sécurité Jellyfin

## 📊 Audit de Sécurité Actuel

**Score de sécurité : 50% (4/8 mesures critiques implémentées)**

### ✅ Mesures implémentées

| Mesure | Statut | Détails |
|--------|--------|---------|
| 🔒 **HTTPS/SSL activé** | ✅ **ACTIF** | Let's Encrypt configuré sur votre domaine externe |
| 👤 **Comptes utilisateurs limités** | ✅ **ACTIF** | Jellyfin exécuté par utilisateur non-root |
| 📋 **Monitoring/logs activés** | ✅ **ACTIF** | Logs centralisés dans le projet |
| 💾 **Sauvegardes régulières** | ✅ **ACTIF** | Système automatique backup/restore configuré |

### ❌ Mesures manquantes (CRITIQUES)

| Mesure | Statut | Priorité | Action requise |
|--------|--------|----------|----------------|
| 🔥 **Firewall configuré** | ❌ **INACTIF** | **CRITIQUE** | Activer UFW et configurer règles |
| 🔑 **Mots de passe forts** | ❓ **NON VÉRIFIÉ** | **CRITIQUE** | Audit des comptes Jellyfin |
| 🔄 **Mises à jour automatiques** | ⚠️ **PARTIEL** | **IMPORTANT** | Automatiser les mises à jour système |
| 🌐 **Accès VPN uniquement** | ❌ **NON CONFIGURÉ** | **OPTIONNEL** | Considérer l'accès VPN pour plus de sécurité |

## 🚨 Risques Identifiés

### Risques critiques actuels

1. **🔥 Firewall désactivé (UFW: inactive)**
   - **Risque** : Tous les ports exposés directement sur internet
   - **Impact** : Accès non autorisé, attaques par force brute
   - **Solution** : Configuration UFW immédiate

2. **🔑 Mots de passe non audités**
   - **Risque** : Comptes Jellyfin avec mots de passe faibles
   - **Impact** : Compromission des comptes utilisateurs
   - **Solution** : Audit et politique de mots de passe forts

3. **🔄 Mises à jour manuelles**
   - **Risque** : Vulnérabilités non corrigées
   - **Impact** : Exploitation de failles connues
   - **Solution** : Automatisation des mises à jour

## 🛡️ Actions de Sécurisation Recommandées

### 1. Configuration du Firewall (URGENT)

```bash
# Activer UFW
sudo ufw enable

# Règles de base
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Ports Jellyfin nécessaires
sudo ufw allow 80/tcp      # HTTP (redirection HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8096/tcp    # Jellyfin direct (si nécessaire)

# SSH (si utilisé)
sudo ufw allow 22/tcp

# Vérifier le statut
sudo ufw status verbose
```

### 2. Audit des Mots de Passe

```bash
# Se connecter à Jellyfin en tant qu'admin
# Aller dans : Administration > Utilisateurs
# Pour chaque utilisateur :
# - Vérifier que les mots de passe sont complexes (12+ caractères)
# - Activer l'authentification à deux facteurs si disponible
# - Supprimer les comptes inutilisés
```

### 3. Mises à Jour Automatiques

```bash
# Installer unattended-upgrades
sudo apt install unattended-upgrades

# Configurer les mises à jour automatiques
sudo dpkg-reconfigure unattended-upgrades

# Éditer la configuration si nécessaire
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

### 4. Monitoring Avancé

```bash
# Installer fail2ban pour protéger contre les attaques par force brute
sudo apt install fail2ban

# Créer une configuration pour Jellyfin
sudo nano /etc/fail2ban/jail.local
```

## 📋 Configuration Nginx Sécurisée

Votre configuration Nginx actuelle inclut déjà :
- ✅ Redirection HTTP vers HTTPS
- ✅ Certificats SSL Let's Encrypt
- ✅ Headers de sécurité de base

### Améliorations recommandées

```nginx
# Ajouter des headers de sécurité supplémentaires
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

# Limiter la taille des uploads
client_max_body_size 100M;

# Rate limiting
limit_req_zone $binary_remote_addr zone=jellyfin:10m rate=10r/m;
limit_req zone=jellyfin burst=5 nodelay;
```

## 🔍 Checklist de Sécurité

### Configuration de base
- [ ] **Firewall UFW activé et configuré**
- [ ] **Certificats SSL Let's Encrypt renouvelés automatiquement**
- [ ] **Nginx configuré avec headers de sécurité**
- [ ] **Jellyfin exécuté avec utilisateur non-privilégié**

### Comptes et accès
- [ ] **Comptes Jellyfin avec mots de passe forts (12+ caractères)**
- [ ] **Compte administrateur par défaut désactivé ou renommé**
- [ ] **Comptes invités désactivés ou limités**
- [ ] **Authentification à deux facteurs activée (si supporté)**

### Monitoring et maintenance
- [ ] **Logs de connexion surveillés**
- [ ] **Mises à jour automatiques configurées**
- [ ] **Sauvegardes testées régulièrement**
- [ ] **Fail2ban configuré pour Jellyfin**

### Réseau et infrastructure
- [ ] **Ports minimum exposés sur internet**
- [ ] **Accès local sécurisé (changement port par défaut)**
- [ ] **Reverse proxy correctement configuré**
- [ ] **VPN configuré pour l'accès administratif (optionnel)**

## 🚀 Scripts d'Automatisation

### Audit de sécurité rapide

```bash
#!/bin/bash
# audit-security.sh
echo "=== Audit de Sécurité Jellyfin ==="

echo "1. État du firewall :"
sudo ufw status

echo "2. Processus Jellyfin :"
ps aux | grep jellyfin | grep -v grep

echo "3. Ports ouverts :"
netstat -tulpn | grep LISTEN

echo "4. Certificats SSL :"
sudo certbot certificates

echo "5. Dernières connexions suspectes :"
grep -i "failed\|error" ~/jellyfin/log/jellyfin.log | tail -10
```

### Script de sécurisation automatique

```bash
#!/bin/bash
# secure-jellyfin.sh
echo "🔒 Sécurisation automatique de Jellyfin..."

# Activer le firewall
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80,443,8096/tcp

# Installer fail2ban
sudo apt update
sudo apt install -y fail2ban unattended-upgrades

# Configurer les mises à jour automatiques
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades

echo "✅ Sécurisation de base terminée"
echo "⚠️  Actions manuelles requises :"
echo "   - Vérifier les mots de passe des comptes Jellyfin"
echo "   - Configurer fail2ban pour Jellyfin"
echo "   - Tester les sauvegardes"
```

## 📞 En cas d'incident

### Procédure d'urgence

1. **Compromission suspectée :**
   ```bash
   # Arrêter Jellyfin immédiatement
   ./jellyfin-manager.sh stop

   # Bloquer le trafic suspect
   sudo ufw deny from [IP_SUSPECT]

   # Analyser les logs
   grep -i "error\|failed" ~/jellyfin/log/jellyfin.log
   ```

2. **Restauration après incident :**
   ```bash
   # Changer tous les mots de passe
# Vérifier l'intégrité des données
   # Restaurer depuis la sauvegarde si nécessaire
   sudo cp -r ~/jellyfin/jellyfin-data/* /tmp/jellyfin-persistent/
   ```

## 📚 Ressources et Documentation

- [Guide de sécurité Jellyfin officiel](https://jellyfin.org/docs/general/administration/security/)
- [Configuration UFW](https://help.ubuntu.com/community/UFW)
- [Let's Encrypt documentation](https://letsencrypt.org/docs/)
- [Nginx security headers](https://securityheaders.com/)

---

**⚠️ Note importante :** Ce guide de sécurité doit être mis à jour régulièrement en fonction de l'évolution des menaces et des nouvelles versions de Jellyfin.

**📅 Dernière mise à jour :** $(date)
**🔄 Prochaine révision recommandée :** $(date -d "+3 months")