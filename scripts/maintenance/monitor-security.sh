#!/bin/bash

# Script de monitoring de sécurité pour Jellyflyzerd
# Analyse les logs pour détecter les activités suspectes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOG_FILE="/tmp/jellyflyzerd-security-$(date +%Y%m%d).log"

# Couleurs pour l'affichage
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"
}

log_color() {
    local color=$1
    shift
    echo -e "${color}$(date '+%Y-%m-%d %H:%M:%S') $*${NC}" | tee -a "$LOG_FILE"
}

# Fonction pour analyser les logs nginx
analyze_nginx_logs() {
    log_color "$BLUE" "=== ANALYSE DES LOGS NGINX ==="

    # Récupérer les logs des 24 dernières heures
    local nginx_logs
    nginx_logs=$(docker logs jellyflyzerd-nginx --since 24h 2>/dev/null || echo "")

    if [ -z "$nginx_logs" ]; then
        log "Aucun log nginx trouvé"
        return
    fi

    # Compter les requêtes
    local total_requests
    total_requests=$(echo "$nginx_logs" | grep -c '^\[' || echo "0")
    log "Total requêtes 24h: $total_requests"

    # Analyser les codes d'erreur
    local error_4xx
    local error_5xx
    error_4xx=$(echo "$nginx_logs" | grep -c '" 4[0-9][0-9] ' || echo "0")
    error_5xx=$(echo "$nginx_logs" | grep -c '" 5[0-9][0-9] ' || echo "0")

    [ "$error_4xx" -gt 0 ] && log_color "$YELLOW" "Erreurs 4xx: $error_4xx"
    [ "$error_5xx" -gt 0 ] && log_color "$RED" "Erreurs 5xx: $error_5xx"

    # Détecter les tentatives d'attaque (en ignorant IP internes)
    local attacks
    attacks=$(echo "$nginx_logs" | grep -E -i '(wp-admin|wp-login|phpmyadmin|admin|config\.php|\.env|xmlrpc)' \
              | grep -vE '^(172\.16|172\.17|172\.18|172\.19|172\.20|172\.21|10\.|192\.168)' | wc -l || echo "0")

    if [ "$attacks" -gt 0 ]; then
        log_color "$RED" "🚨 Tentatives d'attaque détectées: $attacks"
        echo "$nginx_logs" | grep -E -i '(wp-admin|wp-login|phpmyadmin|admin|config\.php|\.env|xmlrpc)' \
             | grep -vE '^(172\.16|172\.17|172\.18|172\.19|172\.20|172\.21|10\.|192\.168)' | tail -5 >> "$LOG_FILE"
    fi

    # Top IPs externes uniquement
    local top_ips
    # Top IPs externes uniquement (avec filtrage IPs valides)
    top_ips=$(echo "$nginx_logs" \
        | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' \
        | awk -F'.' '$1<=255 && $2<=255 && $3<=255 && $4<=255' \
        | grep -vE '^(172\.1[6-9]|172\.2[0-9]|172\.3[0-1]|10\.|192\.168)' \
        | sort | uniq -c | sort -rn | head -5)


    if [ -n "$top_ips" ]; then
        log "Top IPs externes:"
        echo "$top_ips" | while read count ip; do
            if [ "$count" -gt 100 ]; then
                log_color "$RED" "  $ip: $count requêtes (SUSPECT)"
            elif [ "$count" -gt 50 ]; then
                log_color "$YELLOW" "  $ip: $count requêtes"
            else
                log "  $ip: $count requêtes"
            fi
        done
    fi
}


# Fonction pour analyser les logs jellyfin
analyze_jellyfin_logs() {
    log_color "$BLUE" "=== ANALYSE DES LOGS JELLYFIN ==="

    local jellyfin_logs
    jellyfin_logs=$(docker logs jellyflyzerd-jellyfin --since 24h 2>/dev/null || echo "")

    if [ -z "$jellyfin_logs" ]; then
        log "Aucun log jellyfin trouvé"
        return
    fi

    # Détecter les erreurs
    local errors
    errors=$(echo "$jellyfin_logs" | grep -i error | wc -l || echo "0")
    if [ "$errors" -gt 0 ]; then
        log_color "$YELLOW" "Erreurs jellyfin: $errors"
    fi

    # Détecter les tentatives d'authentification
    local auth_attempts
    auth_attempts=$(echo "$jellyfin_logs" | grep -i -E '(login|authentication|unauthorized)' | wc -l || echo "0")
    if [ "$auth_attempts" -gt 0 ]; then
        log "Tentatives d'authentification: $auth_attempts"
    fi

    # Performance
    local warnings
    warnings=$(echo "$jellyfin_logs" | grep -i warning | wc -l || echo "0")
    if [ "$warnings" -gt 0 ]; then
        log_color "$YELLOW" "Avertissements: $warnings"
    fi
}

# Fonction pour vérifier les ressources système
check_system_resources() {
    log_color "$BLUE" "=== VÉRIFICATION RESSOURCES ==="

    # Usage CPU des conteneurs
    local cpu_usage
    cpu_usage=$(docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}" jellyflyzerd-jellyfin jellyflyzerd-nginx 2>/dev/null || echo "Impossible de récupérer les stats")
    log "CPU Usage:"
    echo "$cpu_usage" | while IFS=$'\t' read name cpu; do
        if [ "$name" != "NAME" ]; then
            cpu_num=$(echo "$cpu" | sed 's/%//')
            if (( $(echo "$cpu_num > 80" | bc -l 2>/dev/null || echo 0) )); then
                log_color "$RED" "  $name: $cpu (ÉLEVÉ)"
            elif (( $(echo "$cpu_num > 50" | bc -l 2>/dev/null || echo 0) )); then
                log_color "$YELLOW" "  $name: $cpu"
            else
                log "  $name: $cpu"
            fi
        fi
    done

    # Usage mémoire
    local mem_usage
    mem_usage=$(docker stats --no-stream --format "table {{.Name}}\\t{{.MemUsage}}" jellyflyzerd-jellyfin jellyflyzerd-nginx 2>/dev/null || echo "Impossible de récupérer les stats")
    log "Memory Usage:"
    echo "$mem_usage" | while IFS=$'\t' read name mem; do
        if [ "$name" != "NAME" ]; then
            log "  $name: $mem"
        fi
    done

    # Espace disque
    local disk_usage
    disk_usage=$(df -h /mnt/d 2>/dev/null | tail -1 | awk '{print $5}')
    if [ -n "$disk_usage" ]; then
        disk_num=$(echo "$disk_usage" | sed 's/%//')
        if [ "$disk_num" -gt 90 ]; then
            log_color "$RED" "Espace disque: $disk_usage (CRITIQUE)"
        elif [ "$disk_num" -gt 80 ]; then
            log_color "$YELLOW" "Espace disque: $disk_usage"
        else
            log "Espace disque: $disk_usage"
        fi
    fi
}

# Fonction pour générer des alertes
generate_alerts() {
    log_color "$BLUE" "=== GÉNÉRATION D'ALERTES ==="

    # Compter les événements suspects dans le log actuel
    local attack_count
    attack_count=$(grep -c "Tentatives d'attaque détectées" "$LOG_FILE" 2>/dev/null || echo "0")

    local error_count
    error_count=$(grep -c "Erreurs 5xx" "$LOG_FILE" 2>/dev/null || echo "0")

    if [ "$attack_count" -gt 0 ] || [ "$error_count" -gt 0 ]; then
        log_color "$RED" "🚨 ALERTE SÉCURITÉ 🚨"
        log "- Attaques détectées: $attack_count"
        log "- Erreurs serveur: $error_count"
        log "- Vérifiez le fichier: $LOG_FILE"

        # Ici vous pourriez ajouter l'envoi d'email, notification, etc.
    else
        log_color "$GREEN" "✅ Aucune alerte de sécurité"
    fi
}

# Fonction principale
main() {
    log_color "$GREEN" "🔍 Démarrage du monitoring de sécurité Jellyflyzerd"
    log "Fichier de log: $LOG_FILE"

    analyze_nginx_logs
    echo ""
    analyze_jellyfin_logs
    echo ""
    check_system_resources
    echo ""
    generate_alerts

    log_color "$GREEN" "✅ Monitoring terminé"
    log "Rapport complet dans: $LOG_FILE"
}

# Gestion des arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --nginx-only    Analyser uniquement nginx"
        echo "  --jellyfin-only Analyser uniquement jellyfin"
        echo "  --stats-only    Afficher uniquement les statistiques"
        echo "  --help          Afficher cette aide"
        exit 0
        ;;
    --nginx-only)
        analyze_nginx_logs
        ;;
    --jellyfin-only)
        analyze_jellyfin_logs
        ;;
    --stats-only)
        check_system_resources
        ;;
    *)
        main
        ;;
esac