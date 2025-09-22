#!/bin/bash

# Script de nettoyage des sessions Jellyfin
# Nettoie automatiquement les anciennes sessions temporaires

# Charger la configuration
UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$UTILS_DIR/../core/config.sh"

# Fonction de nettoyage automatique (silencieux)
cleanup_auto() {
    # Nettoyer les anciennes sessions temporaires de plus de 1 jour
    find /tmp -name "jellyfin-session-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true

    # Nettoyer les fichiers temporaires Jellyfin anciens
    find /tmp -name "*jellyfin*" -type f -mtime +7 -delete 2>/dev/null || true

    # Nettoyer les logs anciens (plus de 30 jours)
    find "$PROJECT_DIR/log" -name "*.log.*" -mtime +30 -delete 2>/dev/null || true
}

# Fonction de nettoyage interactif
cleanup_interactive() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  NETTOYAGE JELLYFIN                      ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    # Compter les éléments à nettoyer
    local temp_sessions=$(find /tmp -name "jellyfin-session-*" -type d 2>/dev/null | wc -l)
    local temp_files=$(find /tmp -name "*jellyfin*" -type f 2>/dev/null | wc -l)
    local old_logs=$(find "$PROJECT_DIR/log" -name "*.log.*" -mtime +7 2>/dev/null | wc -l)
    local cache_size=""

    if [ -d "$PROJECT_DIR/jellyfin-cache" ]; then
        cache_size=$(du -sh "$PROJECT_DIR/jellyfin-cache" 2>/dev/null | cut -f1)
    fi

    echo -e "${YELLOW}Éléments trouvés à nettoyer :${NC}"
    echo -e "  • Sessions temporaires : ${temp_sessions} dossiers"
    echo -e "  • Fichiers temporaires : ${temp_files} fichiers"
    echo -e "  • Anciens logs : ${old_logs} fichiers"
    echo -e "  • Cache Jellyfin : ${cache_size:-"N/A"}"
    echo

    echo -e "${YELLOW}Choisissez les éléments à nettoyer :${NC}"
    echo -e "  ${GREEN}1${NC}) Sessions temporaires anciennes (>1 jour)"
    echo -e "  ${GREEN}2${NC}) Fichiers temporaires anciens (>7 jours)"
    echo -e "  ${GREEN}3${NC}) Anciens logs (>7 jours)"
    echo -e "  ${GREEN}4${NC}) Cache Jellyfin complet"
    echo -e "  ${GREEN}5${NC}) Tout nettoyer"
    echo -e "  ${BLUE}6${NC}) Nettoyage personnalisé"
    echo -e "  ${RED}0${NC}) Retour"
    echo
    echo -n -e "${BLUE}Votre choix [0-6]: ${NC}"

    local choice
    read choice

    case $choice in
        1)
            echo
            log "Nettoyage des sessions temporaires anciennes..."
            find /tmp -name "jellyfin-session-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
            success "Sessions temporaires nettoyées"
            ;;
        2)
            echo
            log "Nettoyage des fichiers temporaires anciens..."
            find /tmp -name "*jellyfin*" -type f -mtime +7 -delete 2>/dev/null || true
            success "Fichiers temporaires nettoyés"
            ;;
        3)
            echo
            log "Nettoyage des anciens logs..."
            find "$PROJECT_DIR/log" -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
            success "Anciens logs nettoyés"
            ;;
        4)
            echo
            warning "Attention : cela va supprimer tout le cache Jellyfin"
            read -p "Continuer ? (o/N): " confirm
            if [[ $confirm =~ ^[Oo]$ ]]; then
                log "Nettoyage du cache Jellyfin..."
                rm -rf "$PROJECT_DIR/jellyfin-cache"/*  2>/dev/null || true
                success "Cache Jellyfin nettoyé"
            else
                warning "Nettoyage annulé"
            fi
            ;;
        5)
            echo
            warning "Attention : cela va tout nettoyer (sessions, fichiers temporaires, logs, cache)"
            read -p "Continuer ? (o/N): " confirm
            if [[ $confirm =~ ^[Oo]$ ]]; then
                log "Nettoyage complet en cours..."
                find /tmp -name "jellyfin-session-*" -type d -exec rm -rf {} + 2>/dev/null || true
                find /tmp -name "*jellyfin*" -type f -delete 2>/dev/null || true
                find "$PROJECT_DIR/log" -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
                rm -rf "$PROJECT_DIR/jellyfin-cache"/* 2>/dev/null || true
                success "Nettoyage complet terminé"
            else
                warning "Nettoyage annulé"
            fi
            ;;
        6)
            cleanup_custom
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

    if [ "$choice" != "0" ] && [ "$choice" != "6" ]; then
        echo
        read -p "Appuyez sur Entrée pour continuer..."
    fi
}

# Fonction de nettoyage personnalisé
cleanup_custom() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║               NETTOYAGE PERSONNALISÉ                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    echo -e "${YELLOW}Paramètres personnalisés :${NC}"
    echo
    echo -n "Âge minimum des sessions temporaires à supprimer (jours) [1]: "
    read temp_age
    temp_age=${temp_age:-1}

    echo -n "Âge minimum des fichiers temporaires à supprimer (jours) [7]: "
    read file_age
    file_age=${file_age:-7}

    echo -n "Âge minimum des logs à supprimer (jours) [30]: "
    read log_age
    log_age=${log_age:-30}

    echo
    log "Nettoyage personnalisé avec les paramètres :"
    echo "  - Sessions temporaires > $temp_age jours"
    echo "  - Fichiers temporaires > $file_age jours"
    echo "  - Logs > $log_age jours"
    echo

    read -p "Continuer ? (o/N): " confirm
    if [[ $confirm =~ ^[Oo]$ ]]; then
        find /tmp -name "jellyfin-session-*" -type d -mtime +$temp_age -exec rm -rf {} + 2>/dev/null || true
        find /tmp -name "*jellyfin*" -type f -mtime +$file_age -delete 2>/dev/null || true
        find "$PROJECT_DIR/log" -name "*.log.*" -mtime +$log_age -delete 2>/dev/null || true
        success "Nettoyage personnalisé terminé"
    else
        warning "Nettoyage annulé"
    fi

    echo
    read -p "Appuyez sur Entrée pour continuer..."
}

# Fonction principale
if [ "$1" = "auto" ]; then
    # Nettoyage automatique silencieux
    cleanup_auto
elif [ "$1" = "interactive" ]; then
    # Nettoyage interactif
    cleanup_interactive
else
    # Mode par défaut
    cleanup_interactive
fi