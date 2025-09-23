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
        local jellyfin_user=$(ps aux | grep '[j]ellyfin' | awk '{print $1}' | head -1)
        success "Jellyfin en cours d'exécution (PID: $pid)"

        # Affichage de l'utilisateur avec statut de sécurité
        if [ "$jellyfin_user" = "jellyfinuser" ]; then
            echo -e "   👤 Utilisateur: ${GREEN}$jellyfin_user${NC} (sécurisé)"
        else
            echo -e "   👤 Utilisateur: ${RED}$jellyfin_user${NC} (non sécurisé - admin)"
        fi
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

    echo -e "\n${BLUE}=== Sécurité ===${NC}"

    # Firewall
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "🔥 Firewall: ${GREEN}Actif${NC}"
    else
        echo -e "🔥 Firewall: ${RED}Inactif${NC}"
    fi

    # Utilisateur dédié
    if id "jellyfinuser" &>/dev/null; then
        echo -e "👤 Utilisateur dédié: ${GREEN}Configuré${NC}"
    else
        echo -e "👤 Utilisateur dédié: ${RED}Non configuré${NC}"
    fi

    # HTTPS
    if [ -f "/etc/nginx/sites-available/jellyfin" ] && grep -q "ssl_certificate" /etc/nginx/sites-available/jellyfin; then
        echo -e "🔒 HTTPS: ${GREEN}Configuré${NC}"
    else
        echo -e "🔒 HTTPS: ${RED}Non configuré${NC}"
    fi

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