#!/bin/bash

# Fonctions d'affichage du statut

# Charger les dépendances
UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$UTILS_DIR/../core/config.sh"
source "$UTILS_DIR/../core/jellyfin-service.sh"

# Afficher le statut
show_status() {
    echo -e "\n${BLUE}=== Statut Jellyfin ===${NC}"

    if is_jellyfin_running; then
        local pid=$(cat "$JELLYFIN_PID_FILE")
        success "Jellyfin en cours d'exécution (PID: $pid)"
    else
        error "Jellyfin arrêté"
    fi

    echo -e "\n${BLUE}=== Statut Nginx ===${NC}"
    if pgrep nginx > /dev/null; then
        success "Nginx en cours d'exécution"
    else
        error "Nginx arrêté"
    fi

    echo -e "\n${BLUE}=== Ports ===${NC}"
    netstat -tlnp 2>/dev/null | grep -E ":(${JELLYFIN_PORT}|${HTTP_PORT}|${HTTPS_PORT})" || echo "Aucun port Jellyfin/Nginx ouvert"

    echo -e "\n${BLUE}=== Accès ===${NC}"
    echo "Local: http://${LOCAL_IP}:${JELLYFIN_PORT}"
    echo "Externe: https://${EXTERNAL_DOMAIN}"
}

# Afficher les logs
show_logs() {
    local lines=${1:-50}
    if [ -f "$JELLYFIN_LOG_DIR/jellyfin.log" ]; then
        tail -f -n "$lines" "$JELLYFIN_LOG_DIR/jellyfin.log"
    else
        error "Fichier de logs introuvable"
    fi
}