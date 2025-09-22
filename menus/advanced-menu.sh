#!/bin/bash

# Menu de configuration avancée

# Charger les dépendances
MENU_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$MENU_DIR/../core/config.sh"
source "$MENU_DIR/../utils/advanced.sh"

# Menu de configuration avancée
show_advanced_menu() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                CONFIGURATION AVANCÉE                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "  ${YELLOW}1${NC}) 🔧 Réparer les permissions Jellyfin"
    echo -e "  ${YELLOW}2${NC}) 🌐 Tester la connectivité réseau"
    echo -e "  ${YELLOW}3${NC}) 📁 Nettoyer les anciens logs"
    echo -e "  ${YELLOW}4${NC}) 🔍 Vérifier la configuration Nginx"
    echo -e "  ${YELLOW}5${NC}) 🆔 Afficher les informations système"
    echo -e "  ${GREEN}6${NC}) 🧹 Nettoyage complet Jellyfin"
    echo -e "  ${RED}0${NC}) ⬅️  Retour au menu principal"
    echo
    echo -n -e "${BLUE}Votre choix [0-6]: ${NC}"
}

# Gestion du menu avancé
handle_advanced_menu() {
    while true; do
        show_advanced_menu
        local choice
        read choice

        case $choice in
            1)
                echo
                repair_permissions
                ;;
            2)
                echo
                test_connectivity
                ;;
            3)
                echo
                clean_logs
                ;;
            4)
                echo
                check_nginx_config
                ;;
            5)
                echo
                show_system_info
                ;;
            6)
                echo
                cleanup_jellyfin
                ;;
            0)
                return
                ;;
            *)
                echo
                error "Choix invalide. Veuillez sélectionner un nombre entre 0 et 6."
                sleep 2
                ;;
        esac
    done
}