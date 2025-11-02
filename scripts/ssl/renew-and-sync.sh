#!/bin/bash

# Script pour renouveler automatiquement les certificats Let's Encrypt et les synchroniser
# À utiliser avec cron pour automatisation complète

set -e

# Détection automatique des variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Charger les variables d'environnement
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

DOMAIN="${EXTERNAL_DOMAIN}"

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
    echo "❌ EXTERNAL_DOMAIN non configuré dans .env"
    echo "💡 Configurez votre domaine dans le fichier .env"
    exit 1
fi
SSL_DIR="$PROJECT_DIR/docker/nginx/ssl"
LOG_FILE="$PROJECT_DIR/logs/ssl-renew.log"

# Créer le répertoire de logs si nécessaire
mkdir -p "$(dirname "$LOG_FILE")"

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): Début du renouvellement SSL" | tee -a "$LOG_FILE"
echo "Domaine: $DOMAIN" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Étape 1: Arrêter nginx Docker pour libérer les ports
echo "$(date): Arrêt temporaire de nginx Docker..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/docker"
docker-compose stop nginx >> "$LOG_FILE" 2>&1

# Étape 2: Renouveler le certificat avec certbot en mode standalone
echo "$(date): Tentative de renouvellement du certificat..." | tee -a "$LOG_FILE"

if sudo certbot renew --standalone --preferred-challenges http --quiet 2>> "$LOG_FILE"; then
    echo "$(date): ✅ Renouvellement réussi ou certificat encore valide" | tee -a "$LOG_FILE"
else
    echo "$(date): ❌ Échec du renouvellement" | tee -a "$LOG_FILE"
    # Redémarrer nginx même en cas d'échec
    docker-compose up -d nginx >> "$LOG_FILE" 2>&1
    exit 1
fi

# Étape 3: Synchroniser les certificats vers Docker
echo "$(date): Synchronisation des certificats..." | tee -a "$LOG_FILE"

LETSENCRYPT_DIR="/etc/letsencrypt/live/$DOMAIN"

if [ ! -f "$LETSENCRYPT_DIR/fullchain.pem" ]; then
    echo "$(date): ❌ Certificat introuvable dans $LETSENCRYPT_DIR" | tee -a "$LOG_FILE"
    exit 1
fi

# Copier les certificats
sudo cp "$LETSENCRYPT_DIR/fullchain.pem" "$SSL_DIR/cert.pem"
sudo cp "$LETSENCRYPT_DIR/privkey.pem" "$SSL_DIR/key.pem"

# Corriger les permissions
SYSTEM_USER="${SYSTEM_USER:-$(whoami)}"
sudo chown "$SYSTEM_USER:$SYSTEM_USER" "$SSL_DIR"/*.pem
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo "$(date): ✅ Certificats synchronisés" | tee -a "$LOG_FILE"

# Étape 4: Redémarrer nginx dans Docker
echo "$(date): Redémarrage de nginx..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/docker"
docker-compose up -d nginx >> "$LOG_FILE" 2>&1
echo "$(date): ✅ Nginx redémarré" | tee -a "$LOG_FILE"

# Vérifier la nouvelle date d'expiration
NEW_EXPIRY=$(sudo openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | grep "Not After")
echo "$(date): 📅 $NEW_EXPIRY" | tee -a "$LOG_FILE"

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): ✅ Renouvellement et synchronisation terminés" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
