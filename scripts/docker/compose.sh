#!/bin/bash
# Wrapper pour docker-compose qui charge automatiquement le .env

set -e

# Détection du répertoire du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Charger les variables d'environnement
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ Fichier .env non trouvé dans $PROJECT_DIR"
    echo "💡 Copiez .env.example vers .env et configurez vos variables"
    exit 1
fi

set -a
source "$PROJECT_DIR/.env"
set +a

# Exécuter docker-compose avec tous les arguments passés
cd "$PROJECT_DIR/docker"
docker-compose "$@"
