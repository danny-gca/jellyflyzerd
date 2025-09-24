#!/bin/bash

# Script pour synchroniser automatiquement les certificats Let's Encrypt avec Jellyflyzerd
# À ajouter dans un cron job pour renouvellement automatique

set -e

# Détection automatique des variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CURRENT_USER="${USER:-$(whoami)}"

# Charger les variables d'environnement si disponibles
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi

# Variables avec fallbacks
SYSTEM_USER="${SYSTEM_USER:-$CURRENT_USER}"
PROJECT_DIR="${PROJECT_DIR:-$PROJECT_DIR}"
LETSENCRYPT_DIR="/etc/letsencrypt/live/jellyflyzerd.freeboxos.fr"
SSL_DIR="$PROJECT_DIR/nginx/ssl"

echo "$(date): Synchronisation des certificats SSL..."
echo "Utilisateur: $SYSTEM_USER"
echo "Projet: $PROJECT_DIR"

# Vérifier si les certificats Let's Encrypt existent
if [ ! -f "$LETSENCRYPT_DIR/fullchain.pem" ]; then
    echo "Erreur: Certificat Let's Encrypt introuvable dans $LETSENCRYPT_DIR"
    exit 1
fi

# Copier les certificats
sudo cp "$LETSENCRYPT_DIR/fullchain.pem" "$SSL_DIR/cert.pem"
sudo cp "$LETSENCRYPT_DIR/privkey.pem" "$SSL_DIR/key.pem"

# Corriger les permissions avec l'utilisateur du .env
sudo chown "$SYSTEM_USER:$SYSTEM_USER" "$SSL_DIR"/*.pem
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo "$(date): Certificats synchronisés avec succès"

# Redémarrer nginx si Docker tourne
if docker ps | grep -q jellyflyzerd-nginx; then
    docker restart jellyflyzerd-nginx
    echo "$(date): Nginx redémarré"
fi

echo "$(date): Synchronisation terminée"