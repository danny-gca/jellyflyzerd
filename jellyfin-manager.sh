#!/bin/bash

# Jellyfin Manager v2 - Version modulaire
# Gestion complète de Jellyfin sous WSL

set -e

# Déterminer le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Charger les modules
source "$SCRIPT_DIR/core/config.sh"
source "$SCRIPT_DIR/core/jellyfin-service.sh"
source "$SCRIPT_DIR/core/nginx-service.sh"
source "$SCRIPT_DIR/utils/status.sh"
source "$SCRIPT_DIR/utils/update.sh"
source "$SCRIPT_DIR/menus/main-menu.sh"

# Afficher l'aide (mode ligne de commande)
show_help() {
    echo -e "${BLUE}Jellyfin Manager v2 - Gestion complète de Jellyfin sous WSL${NC}"
    echo
    echo "Usage: $0 [commande]"
    echo
    echo "Sans argument: Lance le menu interactif"
    echo
    echo "Commandes en ligne:"
    echo "  start       Démarrer Jellyfin et Nginx"
    echo "  stop        Arrêter Jellyfin et Nginx"
    echo "  restart     Redémarrer Jellyfin et Nginx"
    echo "  status      Afficher le statut des services"
    echo "  logs        Afficher les logs Jellyfin"
    echo "  update      Mise à jour complète"
    echo "  help        Afficher cette aide"
    echo
    echo "Structure modulaire:"
    echo "  core/       Services principaux (Jellyfin, Nginx, config)"
    echo "  utils/      Utilitaires (status, update, advanced)"
    echo "  menus/      Interfaces utilisateur (main-menu, advanced-menu)"
}

# Programme principal
if [ $# -eq 0 ]; then
    # Mode interactif
    run_main_menu
else
    # Mode ligne de commande
    case "$1" in
        "start")
            start_jellyfin
            manage_nginx start
            echo
            show_status
            ;;
        "stop")
            stop_jellyfin
            manage_nginx stop
            ;;
        "restart")
            restart_jellyfin
            manage_nginx restart
            echo
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "${2:-50}"
            ;;
        "update")
            update_all
            ;;
        "help"|*)
            show_help
            ;;
    esac
fi