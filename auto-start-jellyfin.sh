#!/bin/bash

# Script de démarrage automatique pour Jellyfin sous WSL
# À placer dans ~/.bashrc ou ~/.profile pour démarrage automatique

# Charger la configuration depuis .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core/env-loader.sh" || exit 1

# Configuration
MANAGER_SCRIPT="$PROJECT_DIR/jellyfin-manager.sh"
LOCK_FILE="/tmp/jellyfin-autostart.lock"

# Fonction pour logger
log_auto() {
    echo "[$(date '+%H:%M:%S')] AUTOSTART: $1" >> "$USER_HOME/jellyfin-autostart.log"
}

# Vérifier si le script doit se lancer automatiquement
should_autostart() {
    # Ne pas démarrer si le lock file existe (éviter les démarrages multiples)
    if [ -f "$LOCK_FILE" ]; then
        return 1
    fi

    # Ne pas démarrer si on est dans un SSH ou dans un sous-shell
    if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ]; then
        return 1
    fi

    # Ne pas démarrer si WSL_DISTRO_NAME n'est pas défini (pas dans WSL)
    if [ -z "$WSL_DISTRO_NAME" ]; then
        return 1
    fi

    return 0
}

# Démarrage automatique de Jellyfin
autostart_jellyfin() {
    if ! should_autostart; then
        return 0
    fi

    log_auto "Tentative de démarrage automatique..."

    # Créer le lock file
    touch "$LOCK_FILE"

    # Attendre que le réseau soit disponible
    local count=0
    while ! ping -c 1 8.8.8.8 > /dev/null 2>&1 && [ $count -lt 30 ]; do
        sleep 2
        count=$((count + 1))
    done

    if [ $count -ge 30 ]; then
        log_auto "Timeout réseau - abandon du démarrage automatique"
        rm -f "$LOCK_FILE"
        return 1
    fi

    # Lancer Jellyfin en arrière-plan
    if [ -x "$MANAGER_SCRIPT" ]; then
        log_auto "Démarrage de Jellyfin via $MANAGER_SCRIPT"
        nohup "$MANAGER_SCRIPT" start > /dev/null 2>&1 &

        # Attendre un peu et vérifier si ça a marché
        sleep 5
        if pgrep jellyfin > /dev/null && pgrep nginx > /dev/null; then
            log_auto "✓ Jellyfin et Nginx démarrés avec succès"
            echo "🎬 Jellyfin démarré automatiquement!"
            echo "   Local: http://${LOCAL_IP}:${JELLYFIN_PORT}"
            echo "   Externe: https://${EXTERNAL_DOMAIN}"
        else
            log_auto "✗ Échec du démarrage automatique"
        fi
    else
        log_auto "Script manager non trouvé ou non exécutable: $MANAGER_SCRIPT"
    fi

    # Nettoyer le lock file après 60 secondes
    (sleep 60 && rm -f "$LOCK_FILE") &
}

# Si le script est appelé directement
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    case "${1:-auto}" in
        "auto")
            autostart_jellyfin
            ;;
        "force")
            rm -f "$LOCK_FILE"
            autostart_jellyfin
            ;;
        "disable")
            touch "/tmp/jellyfin-autostart-disabled"
            echo "Démarrage automatique désactivé pour cette session"
            ;;
        "enable")
            rm -f "/tmp/jellyfin-autostart-disabled"
            echo "Démarrage automatique réactivé"
            ;;
        *)
            echo "Usage: $0 [auto|force|disable|enable]"
            echo "  auto     Démarrage automatique normal (défaut)"
            echo "  force    Force le démarrage même si lock existe"
            echo "  disable  Désactive pour cette session"
            echo "  enable   Réactive le démarrage automatique"
            ;;
    esac
else
    # Si le script est sourcé depuis .bashrc/.profile
    if [ ! -f "/tmp/jellyfin-autostart-disabled" ]; then
        autostart_jellyfin
    fi
fi