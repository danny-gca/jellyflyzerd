#!/bin/bash

# Configuration centralisée pour Jellyfin Manager

# Charger les variables d'environnement
CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$CONFIG_DIR/env-loader.sh"

# Chemins et répertoires (basés sur les variables d'environnement)
export JELLYFIN_USER="$JELLYFIN_SYSTEM_USER"
export JELLYFIN_DATA_DIR="$JELLYFIN_DATA_DIR"
export JELLYFIN_CACHE_DIR="$JELLYFIN_CACHE_DIR"
export JELLYFIN_WEB_DIR="$JELLYFIN_WEB_DIR"
export JELLYFIN_LOG_DIR="$JELLYFIN_LOG_DIR"
export JELLYFIN_PID_FILE="$PROJECT_DIR/jellyfin.pid"
export NGINX_CONFIG="$NGINX_CONFIG_FILE"

# Couleurs pour l'affichage
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# Fonctions d'affichage
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERREUR]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[ATTENTION]${NC} $1"
}