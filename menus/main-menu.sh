#!/bin/bash

# Menu principal

# Charger les dépendances
MENU_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$MENU_DIR/../core/config.sh"
source "$MENU_DIR/../core/jellyfin-service.sh"
source "$MENU_DIR/../core/nginx-service.sh"
source "$MENU_DIR/../utils/status.sh"
source "$MENU_DIR/../utils/update.sh"
source "$MENU_DIR/../utils/security.sh"
source "$MENU_DIR/advanced-menu.sh"

# Fonction pour configurer le démarrage automatique
setup_autostart_menu() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║             DÉMARRAGE AUTOMATIQUE                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    local bashrc_file="$USER_HOME/.bashrc"
    local autostart_script="$PROJECT_DIR/auto-start-jellyfin.sh"

    # Vérifier l'état actuel
    if grep -q "auto-start-jellyfin.sh" "$bashrc_file" 2>/dev/null; then
        echo -e "${GREEN}✅ Démarrage automatique ACTIVÉ${NC}"
        echo
        echo "Options disponibles:"
        echo -e "  ${RED}1${NC}) Désactiver le démarrage automatique"
        echo -e "  ${YELLOW}2${NC}) Tester le démarrage automatique"
        echo -e "  ${BLUE}3${NC}) Voir les logs de démarrage automatique"
        echo -e "  ${RED}0${NC}) Retour au menu principal"
    else
        echo -e "${RED}❌ Démarrage automatique DÉSACTIVÉ${NC}"
        echo
        echo "Options disponibles:"
        echo -e "  ${GREEN}1${NC}) Activer le démarrage automatique"
        echo -e "  ${YELLOW}2${NC}) Tester le démarrage automatique"
        echo -e "  ${BLUE}3${NC}) Voir les logs de démarrage automatique"
        echo -e "  ${RED}0${NC}) Retour au menu principal"
    fi

    echo
    echo -n -e "${BLUE}Votre choix [0-3]: ${NC}"

    local choice
    read choice

    case $choice in
        1)
            if grep -q "auto-start-jellyfin.sh" "$bashrc_file" 2>/dev/null; then
                # Désactiver
                echo
                log "Désactivation du démarrage automatique..."
                sed -i '/auto-start-jellyfin.sh/d' "$bashrc_file"
                sed -i '/Auto-start Jellyfin/d' "$bashrc_file"
                success "Démarrage automatique désactivé"
            else
                # Activer
                echo
                log "Activation du démarrage automatique..."

                # Vérifier que le script existe
                if [ ! -f "$autostart_script" ]; then
                    error "Script de démarrage automatique non trouvé: $autostart_script"
                    read -p "Appuyez sur Entrée pour continuer..."
                    return
                fi

                # Ajouter au .bashrc
                echo "" >> "$bashrc_file"
                echo "# Auto-start Jellyfin (ajouté par jellyfin-manager)" >> "$bashrc_file"
                echo "source \"$autostart_script\"" >> "$bashrc_file"

                success "Démarrage automatique activé!"
                echo "Jellyfin se lancera automatiquement au démarrage de WSL"
            fi
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        2)
            echo
            log "Test du démarrage automatique..."
            if [ -f "$autostart_script" ]; then
                "$autostart_script" force
            else
                error "Script de démarrage automatique non trouvé"
            fi
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        3)
            echo
            log "Logs de démarrage automatique..."
            if [ -f "$USER_HOME/jellyfin-autostart.log" ]; then
                tail -20 "$USER_HOME/jellyfin-autostart.log"
            else
                warning "Aucun log de démarrage automatique trouvé"
            fi
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        0)
            return
            ;;
        *)
            echo
            error "Choix invalide"
            sleep 2
            ;;
    esac

    # Retourner au menu de configuration
    setup_autostart_menu
}

# Afficher le menu principal
show_menu() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              🎬 JELLYFIN MANAGER                          ║${NC}"
    echo -e "${BLUE}║          Gestion complète sous WSL Ubuntu                ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    # Affichage du statut actuel
    if is_jellyfin_running; then
        echo -e "${GREEN}● Jellyfin: EN MARCHE${NC}"
    else
        echo -e "${RED}● Jellyfin: ARRÊTÉ${NC}"
    fi

    if pgrep nginx > /dev/null; then
        echo -e "${GREEN}● Nginx: EN MARCHE${NC}"
    else
        echo -e "${RED}● Nginx: ARRÊTÉ${NC}"
    fi

    echo
    echo -e "${YELLOW}Choisissez une action:${NC}"
    echo
    echo -e "  ${GREEN}1${NC}) 🚀 Démarrer Jellyfin + Nginx"
    echo -e "  ${RED}2${NC}) 🛑 Arrêter Jellyfin + Nginx"
    echo -e "  ${BLUE}3${NC}) 🔄 Redémarrer Jellyfin + Nginx"
    echo -e "  ${BLUE}4${NC}) 📊 Afficher le statut détaillé"
    echo -e "  ${YELLOW}5${NC}) 📋 Voir les logs en temps réel"
    echo -e "  ${YELLOW}6${NC}) 🔧 Mise à jour complète (WSL + Nginx + Jellyfin)"
    echo -e "  ${BLUE}7${NC}) ⚙️  Configuration avancée"
    echo -e "  ${GREEN}8${NC}) 🔄 Configurer le démarrage automatique"
    echo -e "  ${RED}9${NC}) 🔒 Audit de sécurité"
    echo -e "  ${RED}0${NC}) ❌ Quitter"
    echo
    echo -n -e "${BLUE}Votre choix [0-9]: ${NC}"
}

# Gestion du menu principal
handle_main_menu() {
    local choice
    read choice

    case $choice in
        1)
            echo
            start_jellyfin
            manage_nginx start
            echo
            show_status
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        2)
            echo
            stop_jellyfin
            manage_nginx stop
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        3)
            echo
            restart_jellyfin
            manage_nginx restart
            echo
            show_status
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        4)
            echo
            show_status
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        5)
            echo
            log "Affichage des logs (Ctrl+C pour quitter)..."
            sleep 2
            show_logs 50
            ;;
        6)
            echo
            warning "Cette opération peut prendre plusieurs minutes..."
            read -p "Continuer? (o/N): " confirm
            if [[ $confirm =~ ^[Oo]$ ]]; then
                update_all
                echo
                read -p "Appuyez sur Entrée pour continuer..."
            fi
            ;;
        7)
            handle_advanced_menu
            ;;
        8)
            echo
            setup_autostart_menu
            ;;
        9)
            echo
            security_audit
            echo
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        0)
            echo
            log "Au revoir! 👋"
            exit 0
            ;;
        *)
            echo
            error "Choix invalide. Veuillez sélectionner un nombre entre 0 et 9."
            sleep 2
            ;;
    esac
}

# Boucle principale du menu
run_main_menu() {
    while true; do
        show_menu
        handle_main_menu
    done
}