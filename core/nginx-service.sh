#!/bin/bash

# Gestion du service Nginx

# Charger la configuration
CORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$CORE_DIR/config.sh"

# Gérer Nginx
manage_nginx() {
    local action=$1
    log "${action^} de Nginx..."

    case $action in
        "start")
            sudo nginx || sudo nginx -s reload
            ;;
        "stop")
            sudo nginx -s stop 2>/dev/null || true
            ;;
        "restart")
            sudo nginx -s stop 2>/dev/null || true
            sleep 1
            sudo nginx
            ;;
        "reload")
            sudo nginx -s reload
            ;;
    esac

    if sudo nginx -t > /dev/null 2>&1; then
        success "Nginx ${action}"
    else
        error "Problème avec la configuration Nginx"
        return 1
    fi
}