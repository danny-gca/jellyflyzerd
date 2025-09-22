#!/bin/bash

# Fonctions de mise à jour

# Charger les dépendances
UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$UTILS_DIR/../core/config.sh"
source "$UTILS_DIR/../core/jellyfin-service.sh"
source "$UTILS_DIR/../core/nginx-service.sh"

# Mise à jour complète
update_all() {
    log "Mise à jour complète du système..."

    # Arrêter les services
    stop_jellyfin
    manage_nginx stop

    # Mise à jour WSL/Ubuntu
    log "Mise à jour des paquets système..."
    sudo apt update && sudo apt upgrade -y

    # Mise à jour Jellyfin
    log "Mise à jour Jellyfin..."
    sudo apt update && sudo apt install --only-upgrade jellyfin jellyfin-server jellyfin-web jellyfin-ffmpeg7 -y

    # Mise à jour Nginx
    log "Mise à jour Nginx..."
    sudo apt install --only-upgrade nginx -y

    # Redémarrer les services
    sleep 2
    start_jellyfin
    manage_nginx start

    success "Mise à jour terminée"
}