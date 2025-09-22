# 🎬 Jellyfin Manager pour WSL

Système de gestion complet de Jellyfin sous WSL Ubuntu, conçu pour résoudre les problèmes post-mise à jour WSL.

## 📁 Structure du projet

```
jellyfin/
├── 🎯 jellyfin-manager.sh         # Script principal (menu interactif)
├── 🚀 auto-start-jellyfin.sh      # Démarrage automatique
├── 📚 README.md                   # Cette documentation
├── ⚙️ install.sh                  # Script d'installation automatique
├── 🔒 .env.example                # Modèle de configuration
├── 🔒 .env                        # Configuration (non versionnée)
├── core/                          # Services principaux
│   ├── config.sh                  # Configuration centralisée
│   ├── jellyfin-service.sh        # Gestion du service Jellyfin
│   └── nginx-service.sh           # Gestion du service Nginx
├── utils/                         # Utilitaires
│   ├── status.sh                  # Affichage du statut
│   ├── update.sh                  # Mise à jour système
│   └── advanced.sh                # Fonctions avancées
└── menus/                         # Interfaces utilisateur
    ├── main-menu.sh               # Menu principal
    └── advanced-menu.sh           # Menu avancé
```

## 🚀 Démarrage rapide

### 1. Installation automatique

```bash
# Aller dans le dossier jellyfin
cd ~/jellyfin

# Lancer l'installation (configure automatiquement .env)
./install.sh

# Lancer le menu interactif
./jellyfin-manager.sh
```

### 2. Configuration manuelle (alternative)

```bash
# Copier et configurer le fichier d'environnement
cp .env.example .env
nano .env  # Modifier selon votre environnement

# Lancer le menu interactif
./jellyfin-manager.sh
```

## 📋 Utilisation

### Menu interactif

Le script principal propose un menu avec les options suivantes :

- **🚀 Démarrer** : Lance Jellyfin et Nginx
- **🛑 Arrêter** : Arrête tous les services
- **🔄 Redémarrer** : Redémarre les services
- **📊 Statut** : Affiche l'état des services et ports
- **📋 Logs** : Suit les logs en temps réel
- **🔧 Mise à jour** : Met à jour WSL, Nginx et Jellyfin
- **⚙️ Avancé** : Options de configuration avancées
- **🔄 Démarrage auto** : Configure le démarrage automatique WSL

### Ligne de commande

```bash
# Démarrer les services
./jellyfin-manager.sh start

# Arrêter les services
./jellyfin-manager.sh stop

# Voir le statut
./jellyfin-manager.sh status

# Voir les logs
./jellyfin-manager.sh logs

# Mise à jour complète
./jellyfin-manager.sh update
```

### Menu avancé

- **🔧 Réparer permissions** : Corrige les permissions Jellyfin
- **🌐 Test connectivité** : Vérifie les ports et réseau
- **📁 Nettoyer logs** : Supprime les anciens fichiers de logs
- **🔍 Vérifier Nginx** : Teste la configuration Nginx
- **🆔 Info système** : Affiche les versions et l'état système

## 🔧 Configuration

### Fichiers de configuration

- **Variables d'environnement** : `.env` (créé depuis `.env.example`)
- **Configuration principale** : `core/config.sh`
- **Logs Jellyfin** : `log/jellyfin.log`
- **Configuration Nginx** : configuré via `NGINX_CONFIG_FILE` dans `.env`

### Variables d'environnement importantes

```bash
# Réseau
LOCAL_IP=[YOUR_WSL_IP]                    # IP locale de votre WSL
JELLYFIN_PORT=8096                        # Port Jellyfin
EXTERNAL_DOMAIN=[YOUR_DOMAIN]             # Domaine externe

# Chemins
USER_HOME=/home/[USERNAME]                # Répertoire home utilisateur
PROJECT_DIR=/home/[USERNAME]/jellyfin     # Dossier du projet

# Jellyfin (utilise des dossiers temporaires pour éviter les problèmes de permissions WSL)
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web                     # Interface web
JELLYFIN_DATA_DIR=/home/[USERNAME]/jellyfin/jellyfin-data    # Données Jellyfin
JELLYFIN_CACHE_DIR=/home/[USERNAME]/jellyfin/jellyfin-cache  # Cache Jellyfin
JELLYFIN_LOG_DIR=/home/[USERNAME]/jellyfin/log               # Logs Jellyfin
```

## 🌐 Accès

Les URLs d'accès à Jellyfin :
- **Local** : http://[LOCAL_IP]:8096
- **Externe** : https://[EXTERNAL_DOMAIN]

⚠️ **Note** : Pour une nouvelle installation, accéder d'abord en local pour configurer Jellyfin via l'assistant de configuration.

## 🔄 Démarrage automatique

### Via le menu principal

```bash
./jellyfin-manager.sh
# → Option 8 : Configurer le démarrage automatique
```

### Contrôle manuel

```bash
# Désactiver temporairement
./auto-start-jellyfin.sh disable

# Réactiver
./auto-start-jellyfin.sh enable

# Forcer le démarrage
./auto-start-jellyfin.sh force
```

## 🚨 Résolution de problèmes

### Jellyfin ne démarre pas

1. Vérifier les permissions :
   ```bash
   ./jellyfin-manager.sh
   # → Menu 7 (Avancé) → Option 1 (Réparer permissions)
   ```

2. Vérifier les logs :
   ```bash
   ./jellyfin-manager.sh logs
   ```

### Nginx ne fonctionne pas

1. Tester la configuration :
   ```bash
   sudo nginx -t
   ```

2. Vérifier via le menu avancé :
   ```bash
   ./jellyfin-manager.sh
   # → Menu 7 (Avancé) → Option 4 (Vérifier Nginx)
   ```

### Problème de démarrage automatique

1. Vérifier les logs :
   ```bash
   cat ~/jellyfin-autostart.log
   ```

2. Tester manuellement :
   ```bash
   ./auto-start-jellyfin.sh force
   ```

## 📝 Logs

- **Jellyfin** : `~/jellyfin/log/jellyfin.log`
- **Démarrage auto** : `~/jellyfin-autostart.log`
- **Nginx** : Logs système disponibles via les commandes usuelles

⚠️ **Note** : WSL n'utilise pas systemd, donc pas de `journalctl`

## 🔄 Mise à jour

Le script peut mettre à jour automatiquement :
- Packages système Ubuntu/WSL
- Jellyfin et ses composants
- Nginx

```bash
./jellyfin-manager.sh update
```

## ⚠️ Notes importantes

1. **WSL sans systemd** : Ce système est conçu pour WSL sans systemd
2. **Permissions** : Certaines opérations nécessitent `sudo`
3. **Réseau** : Le script attend que le réseau soit disponible avant de démarrer
4. **Ports** : Assure-toi que les ports 8096, 80 et 443 ne sont pas utilisés
5. **Cache navigateur** : En cas de problèmes de connexion, vider le cache du navigateur
6. **Données temporaires** : Jellyfin utilise des dossiers temporaires pour éviter les problèmes de permissions WSL

## 🆘 Support

En cas de problème :

1. Consulter les logs
2. Utiliser le menu de diagnostic avancé
3. Vérifier la configuration Nginx
4. Redémarrer les services

Pour plus d'aide, consulter les logs détaillés dans `~/jellyfin/log/`.

With help of Claude AI