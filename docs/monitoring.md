# 📊 Guide de Monitoring Jellyflyzerd

Ce guide détaille les fonctionnalités de monitoring et de surveillance intégrées à Jellyflyzerd.

## 🎯 Vue d'ensemble

Jellyflyzerd propose deux systèmes complémentaires pour surveiller votre installation :

1. **Commande CLI `monitor`** - Interface interactive pour l'investigation
2. **Script shell automatisé** - Surveillance continue en arrière-plan

## 💻 Commande CLI `monitor`

### Utilisation de base

```bash
# Afficher les logs récents (nginx + jellyfin)
jellyflyzerd monitor

# Monitoring en temps réel
jellyflyzerd monitor --live

# Détecter les tentatives d'attaque
jellyflyzerd monitor --attacks

# Statistiques d'accès détaillées
jellyflyzerd monitor --stats
```

### Options avancées

```bash
# Logs nginx uniquement
jellyflyzerd monitor --nginx

# Logs jellyfin uniquement
jellyflyzerd monitor --jellyfin

# Personnaliser le nombre de lignes
jellyflyzerd monitor --tail 500

# Combiner les options
jellyflyzerd monitor --nginx --attacks --tail 200
```

### Modes d'utilisation

#### 🔴 Mode temps réel (`--live`)
- Streaming en direct des logs
- Idéal pour debug et investigation
- Utilisez Ctrl+C pour arrêter

#### 🚨 Mode attaques (`--attacks`)
Détecte automatiquement :
- Tentatives WordPress (wp-admin, wp-login)
- Scanners de vulnérabilités (nikto, nmap)
- Accès à fichiers sensibles (.env, config.php)
- User-agents suspects (curl, scanner)
- Codes d'erreur répétés (4xx/5xx)

#### 📊 Mode statistiques (`--stats`)
Analyse les 1000 dernières requêtes :
- **Top IPs** : Classement des adresses les plus actives
- **Status codes** : Répartition des codes de réponse HTTP
- **User-Agents** : Identification des clients/navigateurs

## 🛠️ Script automatisé `monitor-security.sh`

### Utilisation

```bash
# Monitoring complet
./scripts/maintenance/monitor-security.sh

# Monitoring spécialisé
./scripts/maintenance/monitor-security.sh --nginx-only
./scripts/maintenance/monitor-security.sh --jellyfin-only
./scripts/maintenance/monitor-security.sh --stats-only
```

### Fonctionnalités avancées

#### 📅 Analyse historique
- Traite les logs des 24 dernières heures
- Génère des rapports détaillés
- Sauvegarde les logs d'analyse

#### 🚨 Système d'alertes
- Détection automatique des seuils critiques
- Alertes sur :
  - Tentatives d'attaque > seuil
  - Erreurs serveur répétées
  - Usage ressources élevé
  - Espace disque critique

#### 📈 Métriques système
- Usage CPU des conteneurs Docker
- Consommation mémoire
- Espace disque disponible
- Performance réseau

### Automatisation avec Cron

Pour une surveillance continue, ajoutez au crontab :

```bash
# Surveillance toutes les 30 minutes
*/30 * * * * /path/to/jellyflyzerd/scripts/maintenance/monitor-security.sh

# Rapport détaillé quotidien
0 6 * * * /path/to/jellyflyzerd/scripts/maintenance/monitor-security.sh > /tmp/daily-report.log
```

## 🔍 Patterns de détection

### Attaques couramment détectées

| Type d'attaque | Pattern détecté | Exemple |
|----------------|----------------|---------|
| **WordPress** | `wp-admin`, `wp-login` | `GET /wp-admin/` |
| **PHPMyAdmin** | `phpmyadmin`, `pma` | `POST /phpmyadmin/index.php` |
| **Config files** | `config.php`, `.env` | `GET /.env` |
| **XML-RPC** | `xmlrpc.php` | `POST /xmlrpc.php` |
| **Admin panels** | `admin`, `/admin/` | `GET /admin/login` |

### Scanners détectés

| Scanner | User-Agent | Comportement |
|---------|------------|-------------|
| **Nikto** | `nikto` | Tests automatisés |
| **Nmap** | `nmap` | Scan de ports |
| **SQLMap** | `sqlmap` | Injection SQL |
| **Gobuster** | `gobuster` | Brute force directories |

## 📊 Interprétation des statistiques

### Codes de statut HTTP

- **2xx (✅)** : Requêtes réussies (normal)
- **3xx (📊)** : Redirections (normal en petites quantités)
- **4xx (⚠️)** : Erreurs client (404, 403) - surveillance nécessaire
- **5xx (❌)** : Erreurs serveur (critique)

### Seuils d'alerte recommandés

| Métrique | Seuil Normal | Seuil Critique |
|----------|-------------|---------------|
| **Erreurs 4xx** | < 5% | > 20% |
| **Erreurs 5xx** | < 1% | > 5% |
| **Requêtes/IP** | < 100/h | > 500/h |
| **CPU** | < 50% | > 80% |
| **Mémoire** | < 70% | > 90% |
| **Disque** | < 80% | > 95% |

## 🛡️ Actions recommandées

### En cas d'attaque détectée

1. **Identifier l'IP** :
   ```bash
   jellyflyzerd monitor --attacks | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+'
   ```

2. **Bloquer avec UFW** :
   ```bash
   sudo ufw deny from IP_SUSPECTE
   ```

3. **Analyser les logs** :
   ```bash
   jellyflyzerd monitor --stats --tail 1000
   ```

### En cas d'erreurs serveur

1. **Vérifier les conteneurs** :
   ```bash
   jellyflyzerd status
   docker ps -a
   ```

2. **Analyser les logs** :
   ```bash
   jellyflyzerd logs --tail 100
   ```

3. **Redémarrer si nécessaire** :
   ```bash
   jellyflyzerd stop && jellyflyzerd start
   ```

## 📝 Logs et rapports

### Emplacements des fichiers

```
/tmp/jellyflyzerd-security-YYYYMMDD.log    # Rapport quotidien
/var/log/jellyflyzerd/                      # Logs persistants (si configuré)
```

### Format des rapports

Les rapports incluent :
- Horodatage des événements
- Compteurs de sécurité
- Top des IPs suspectes
- Métriques système
- Recommandations d'actions

## 🔧 Configuration avancée

### Personnalisation des seuils

Modifiez les variables dans `monitor-security.sh` :

```bash
# Seuils d'alerte personnalisés
ATTACK_THRESHOLD=10      # Nombre d'attaques avant alerte
ERROR_THRESHOLD=50       # Nombre d'erreurs 5xx avant alerte
CPU_THRESHOLD=80         # Pourcentage CPU critique
```

### Intégration avec des outils externes

Le monitoring peut être intégré avec :
- **Prometheus/Grafana** : Métriques en temps réel
- **ELK Stack** : Analyse avancée des logs
- **Notifications** : Email, Slack, Discord

## 📚 Ressources complémentaires

- [Guide de sécurité](./security.md)
- [Troubleshooting](./troubleshooting.md)
- [Configuration Docker](./docker.md)

---

**💡 Conseil** : Utilisez la commande CLI pour l'investigation ponctuelle et le script automatisé pour la surveillance continue !