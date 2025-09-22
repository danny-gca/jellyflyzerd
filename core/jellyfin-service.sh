#!/bin/bash

# Gestion du service Jellyfin

# Charger la configuration
CORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$CORE_DIR/config.sh"

# Vérifier les permissions et préparer l'environnement
prepare_environment() {
    log "Préparation de l'environnement Jellyfin..."

    # Créer le dossier de logs local
    mkdir -p "$JELLYFIN_LOG_DIR"

    # Vérifier et corriger les permissions des dossiers Jellyfin
    if [ -d "$JELLYFIN_DATA_DIR" ]; then
        sudo chown -R $JELLYFIN_USER:$JELLYFIN_USER "$JELLYFIN_DATA_DIR" 2>/dev/null || true
        sudo chmod -R 755 "$JELLYFIN_DATA_DIR" 2>/dev/null || true
    fi

    if [ -d "$JELLYFIN_CACHE_DIR" ]; then
        sudo chown -R $JELLYFIN_USER:$JELLYFIN_USER "$JELLYFIN_CACHE_DIR" 2>/dev/null || true
        sudo chmod -R 755 "$JELLYFIN_CACHE_DIR" 2>/dev/null || true
    fi

    # Vérifier que l'interface web existe
    if [ ! -d "$JELLYFIN_WEB_DIR" ]; then
        error "Interface web Jellyfin introuvable dans $JELLYFIN_WEB_DIR"
        return 1
    fi

    success "Environnement préparé"
}

# Vérifier si Jellyfin est en cours d'exécution
is_jellyfin_running() {
    if [ -f "$JELLYFIN_PID_FILE" ]; then
        local pid=$(cat "$JELLYFIN_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$JELLYFIN_PID_FILE"
        fi
    fi
    return 1
}

# Démarrer Jellyfin
start_jellyfin() {
    log "Démarrage de Jellyfin..."

    if is_jellyfin_running; then
        warning "Jellyfin est déjà en cours d'exécution"
        return 0
    fi

    prepare_environment

    # Nettoyage automatique des anciennes sessions
    if [ -f "$PROJECT_DIR/utils/cleanup.sh" ]; then
        "$PROJECT_DIR/utils/cleanup.sh" auto
    fi

    # Créer un dossier temporaire pour chaque session
    JELLYFIN_SESSION_DIR="/tmp/jellyfin-session-$$"
    mkdir -p "$JELLYFIN_SESSION_DIR"

    # Lancer Jellyfin de manière simplifiée
    PATH="/usr/lib/jellyfin-ffmpeg:$PATH" nohup jellyfin \
        --datadir "$JELLYFIN_SESSION_DIR" \
        --service \
        > "$PROJECT_DIR/log/jellyfin.log" 2>&1 &

    local pid=$!
    echo $pid > "$JELLYFIN_PID_FILE"

    # Attendre que Jellyfin démarre
    sleep 3
    if is_jellyfin_running; then
        success "Jellyfin démarré (PID: $pid)"
        log "Logs disponibles dans : $JELLYFIN_LOG_DIR/jellyfin.log"
    else
        error "Échec du démarrage de Jellyfin"
        return 1
    fi
}

# Arrêter Jellyfin
stop_jellyfin() {
    log "Arrêt de Jellyfin..."

    if ! is_jellyfin_running; then
        warning "Jellyfin n'est pas en cours d'exécution"
        return 0
    fi

    local pid=$(cat "$JELLYFIN_PID_FILE")
    kill "$pid" 2>/dev/null || true

    # Attendre l'arrêt
    local count=0
    while is_jellyfin_running && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done

    if is_jellyfin_running; then
        warning "Arrêt forcé de Jellyfin"
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi

    rm -f "$JELLYFIN_PID_FILE"
    success "Jellyfin arrêté"
}

# Redémarrer Jellyfin
restart_jellyfin() {
    log "Redémarrage de Jellyfin..."
    stop_jellyfin
    sleep 2
    start_jellyfin
}