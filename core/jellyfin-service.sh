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
        sudo chown -R $JELLYFIN_SYSTEM_USER:$JELLYFIN_SYSTEM_USER "$JELLYFIN_DATA_DIR" 2>/dev/null || true
        sudo chmod -R 755 "$JELLYFIN_DATA_DIR" 2>/dev/null || true
    fi

    if [ -d "$JELLYFIN_CACHE_DIR" ]; then
        # Détecter qui va lancer Jellyfin (utilisateur actuel) et ajuster les permissions
        local current_user=$(whoami)
        sudo chown -R $current_user:$current_user "$JELLYFIN_CACHE_DIR" 2>/dev/null || true
        sudo chmod -R 755 "$JELLYFIN_CACHE_DIR" 2>/dev/null || true
        # Corriger spécifiquement les permissions des fichiers de cache pour éviter les problèmes d'accès
        find "$JELLYFIN_CACHE_DIR" -type f -exec sudo chmod 644 {} \; 2>/dev/null || true
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

    # Utiliser un dossier session permanent (fixe)
    JELLYFIN_SESSION_DIR="/tmp/jellyfin-persistent"
    mkdir -p "$JELLYFIN_SESSION_DIR"

    # Restaurer les données du dossier permanent s'il existe
    if [ -d "$JELLYFIN_DATA_DIR/data" ]; then
        log "Restauration des données Jellyfin..."
        sudo cp -r "$JELLYFIN_DATA_DIR"/* "$JELLYFIN_SESSION_DIR/" 2>/dev/null || true
        # Corriger les permissions pour l'utilisateur actuel
        sudo chown -R $USER:$USER "$JELLYFIN_SESSION_DIR" 2>/dev/null || true
        success "Données restaurées"
    fi

    # Lancer Jellyfin avec le dossier session persistent
    # Utiliser l'utilisateur dédié jellyfinuser si disponible pour plus de sécurité
    if id "jellyfinuser" &>/dev/null; then
        log "Démarrage avec l'utilisateur sécurisé 'jellyfinuser'"
        PATH="/usr/lib/jellyfin-ffmpeg:$PATH" sudo -u jellyfinuser nohup jellyfin \
            --datadir "$JELLYFIN_SESSION_DIR" \
            --service \
            > "$PROJECT_DIR/log/jellyfin.log" 2>&1 &
    else
        warning "Démarrage avec l'utilisateur actuel (non sécurisé)"
        warning "Utilisez 'Menu Avancé > Sécurité' pour créer un utilisateur dédié"
        PATH="/usr/lib/jellyfin-ffmpeg:$PATH" nohup jellyfin \
            --datadir "$JELLYFIN_SESSION_DIR" \
            --service \
            > "$PROJECT_DIR/log/jellyfin.log" 2>&1 &
    fi

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

    # Sauvegarder les données AVANT d'arrêter Jellyfin
    JELLYFIN_SESSION_DIR="/tmp/jellyfin-persistent"
    if [ -d "$JELLYFIN_SESSION_DIR/data" ]; then
        log "Sauvegarde des données Jellyfin..."
        mkdir -p "$JELLYFIN_DATA_DIR"
        sudo cp -r "$JELLYFIN_SESSION_DIR"/* "$JELLYFIN_DATA_DIR/" 2>/dev/null || true
        sudo chown -R $JELLYFIN_SYSTEM_USER:$JELLYFIN_SYSTEM_USER "$JELLYFIN_DATA_DIR" 2>/dev/null || true
        success "Données sauvegardées"
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
    success "Jellyfin arrêté (données sauvegardées)"
}

# Redémarrer Jellyfin
restart_jellyfin() {
    log "Redémarrage de Jellyfin..."
    stop_jellyfin
    sleep 2
    start_jellyfin
}