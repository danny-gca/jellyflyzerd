#!/bin/bash

# Chargeur de variables d'environnement sécurisé

# Fonction pour charger les variables d'environnement
load_env() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    local env_file="$script_dir/../.env"

    # Chercher le fichier .env en remontant dans l'arborescence
    local search_dir="$script_dir"
    while [[ "$search_dir" != "/" ]]; do
        if [[ -f "$search_dir/.env" ]]; then
            env_file="$search_dir/.env"
            break
        fi
        search_dir="$(dirname "$search_dir")"
    done

    if [[ -f "$env_file" ]]; then
        # Charger les variables en ignorant les commentaires et lignes vides
        set -a  # automatically export all variables
        source "$env_file"
        set +a
        return 0
    else
        echo "❌ Fichier .env non trouvé. Veuillez copier .env.example vers .env et le configurer."
        echo "   cp .env.example .env"
        return 1
    fi
}

# Fonction pour valider les variables critiques
validate_env() {
    local required_vars=(
        "LOCAL_IP"
        "JELLYFIN_PORT"
        "EXTERNAL_DOMAIN"
        "USER_HOME"
        "PROJECT_DIR"
        "JELLYFIN_SYSTEM_USER"
        "JELLYFIN_DATA_DIR"
        "JELLYFIN_CACHE_DIR"
        "JELLYFIN_WEB_DIR"
        "NGINX_CONFIG_FILE"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo "❌ Variables manquantes dans .env:"
        printf "   - %s\n" "${missing_vars[@]}"
        echo "   Veuillez vérifier votre fichier .env"
        return 1
    fi

    return 0
}

# Fonction pour afficher les URLs configurées
show_configured_urls() {
    echo "🌐 URLs configurées:"
    echo "   Local:   http://${LOCAL_IP}:${JELLYFIN_PORT}"
    echo "   Externe: https://${EXTERNAL_DOMAIN}"
}

# Charger automatiquement si ce script est sourcé
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    load_env
    if [[ $? -eq 0 ]]; then
        validate_env || exit 1
    else
        exit 1
    fi
fi