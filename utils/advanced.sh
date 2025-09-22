#!/bin/bash

# Fonctions avancées

# Charger les dépendances
UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$UTILS_DIR/../core/config.sh"
source "$UTILS_DIR/../core/jellyfin-service.sh"
source "$UTILS_DIR/cleanup.sh"

# Réparer les permissions
repair_permissions() {
    log "Réparation des permissions Jellyfin..."
    prepare_environment
    success "Permissions réparées"
    echo
    read -p "Appuyez sur Entrée pour continuer..."
}

# Tester la connectivité
test_connectivity() {
    log "Test de connectivité réseau..."
    echo
    echo "Test local (port ${JELLYFIN_PORT}):"
    if netstat -tlnp 2>/dev/null | grep :${JELLYFIN_PORT} > /dev/null; then
        success "Port ${JELLYFIN_PORT} ouvert"
    else
        error "Port ${JELLYFIN_PORT} fermé"
    fi

    echo
    echo "Test Nginx (ports ${HTTP_PORT}/${HTTPS_PORT}):"
    if netstat -tlnp 2>/dev/null | grep -E ":(${HTTP_PORT}|${HTTPS_PORT})" > /dev/null; then
        success "Nginx ports ouverts"
    else
        error "Nginx ports fermés"
    fi

    echo
    echo "Test résolution DNS:"
    if ping -c 1 google.com > /dev/null 2>&1; then
        success "Connexion internet OK"
    else
        error "Problème de connexion internet"
    fi

    echo
    read -p "Appuyez sur Entrée pour continuer..."
}

# Nettoyer les logs
clean_logs() {
    log "Nettoyage des anciens logs..."

    if [ -d "$JELLYFIN_LOG_DIR" ]; then
        find "$JELLYFIN_LOG_DIR" -name "*.log" -mtime +7 -delete
        success "Logs de plus de 7 jours supprimés"
    fi

    # Nettoyer aussi les anciens logs dans le home
    find "$HOME" -name "jellyfin*.log" -mtime +7 -delete 2>/dev/null || true

    success "Nettoyage terminé"
    echo
    read -p "Appuyez sur Entrée pour continuer..."
}

# Vérifier la configuration Nginx
check_nginx_config() {
    log "Vérification de la configuration Nginx..."
    echo

    if sudo nginx -t; then
        success "Configuration Nginx valide"
        echo
        echo "Configuration Jellyfin trouvée:"
        if [ -f "$NGINX_CONFIG" ]; then
            success "$NGINX_CONFIG existe"
            echo "Contenu:"
            grep -E "(server_name|proxy_pass|listen)" "$NGINX_CONFIG" | sed 's/^/  /'
        else
            error "Configuration Jellyfin manquante"
        fi
    else
        error "Erreurs dans la configuration Nginx"
    fi

    echo
    read -p "Appuyez sur Entrée pour continuer..."
}

# Afficher les informations système
show_system_info() {
    log "Informations système..."
    echo
    echo "Version WSL Ubuntu:"
    lsb_release -d | sed 's/^/  /'
    echo
    echo "Version Jellyfin:"
    dpkg -l | grep jellyfin | awk '{print "  " $2 ": " $3}'
    echo
    echo "Version Nginx:"
    nginx -v 2>&1 | sed 's/^/  /'
    echo
    echo "Utilisation disque:"
    df -h / | tail -1 | awk '{print "  Libre: " $4 " / " $2}'
    echo
    echo "Mémoire:"
    free -h | grep "Mem:" | awk '{print "  Utilisée: " $3 " / " $2}'
    echo
    read -p "Appuyez sur Entrée pour continuer..."
}

# Nettoyage complet Jellyfin
cleanup_jellyfin() {
    cleanup_interactive
}