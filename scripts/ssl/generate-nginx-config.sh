#!/bin/bash

# Script pour générer la configuration nginx à partir du template

set -e

# Charger les variables d'environnement
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi

# Variables avec fallbacks
EXTERNAL_DOMAIN="${EXTERNAL_DOMAIN:-your-domain.com}"

echo "Génération de la configuration nginx..."
echo "Domaine: $EXTERNAL_DOMAIN"

# Générer la config à partir du template
sed "s/EXTERNAL_DOMAIN_PLACEHOLDER/$EXTERNAL_DOMAIN/g" \
    "$PROJECT_DIR/docker/nginx/nginx.conf.template" > "$PROJECT_DIR/docker/nginx/nginx.conf"

echo "Configuration nginx générée avec succès"