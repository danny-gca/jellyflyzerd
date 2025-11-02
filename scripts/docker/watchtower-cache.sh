#!/bin/bash
# Utilitaire de gestion du cache de vérification Watchtower

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CACHE_FILE="$PROJECT_DIR/.watchtower-check-cache.json"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Fonction pour afficher le statut du cache
show_status() {
    if [ ! -f "$CACHE_FILE" ]; then
        echo -e "${YELLOW}⚠️  Aucun cache trouvé${NC}"
        echo "Le script n'a jamais été exécuté ou le cache a été supprimé."
        return
    fi

    echo -e "${BLUE}📋 Statut du cache Watchtower${NC}"
    echo ""

    # Lire les données du cache (compatible avec toutes les versions de grep)
    local last_check=$(sed -n 's/.*"last_check":\s*\([0-9]*\).*/\1/p' "$CACHE_FILE")
    local last_check_date=$(sed -n 's/.*"last_check_date":\s*"\([^"]*\)".*/\1/p' "$CACHE_FILE")
    local status=$(sed -n 's/.*"status":\s*"\([^"]*\)".*/\1/p' "$CACHE_FILE")
    local interval_days=$(sed -n 's/.*"check_interval_days":\s*\([0-9]*\).*/\1/p' "$CACHE_FILE")

    # Calculer le temps écoulé
    local current_time=$(date +%s)
    local elapsed=$((current_time - last_check))
    local days_ago=$((elapsed / 86400))
    local hours_ago=$(( (elapsed % 86400) / 3600 ))

    # Calculer le temps restant
    local interval_seconds=$((interval_days * 86400))
    local remaining=$((interval_seconds - elapsed))
    local days_remaining=$((remaining / 86400))

    echo "📅 Dernière vérification : $last_check_date"
    echo "⏱️  Il y a : ${days_ago} jour(s) et ${hours_ago} heure(s)"
    echo "📊 Statut : $status"
    echo "⏳ Intervalle : $interval_days jour(s)"

    if [ $remaining -gt 0 ]; then
        echo -e "${GREEN}✅ Prochaine vérification dans : $days_remaining jour(s)${NC}"
    else
        echo -e "${YELLOW}⚠️  Vérification nécessaire (délai dépassé de ${days_ago} jours)${NC}"
    fi

    echo ""
    echo "📁 Fichier : $CACHE_FILE"
}

# Fonction pour afficher le contenu brut
show_raw() {
    if [ ! -f "$CACHE_FILE" ]; then
        echo "Aucun cache trouvé"
        return
    fi

    echo "Contenu du cache :"
    cat "$CACHE_FILE"
}

# Fonction pour réinitialiser le cache
reset_cache() {
    if [ -f "$CACHE_FILE" ]; then
        rm "$CACHE_FILE"
        echo -e "${GREEN}✅ Cache supprimé${NC}"
        echo "La prochaine ouverture de terminal déclenchera une vérification."
    else
        echo "Aucun cache à supprimer"
    fi
}

# Fonction pour forcer une vérification maintenant
force_check() {
    echo "🔄 Suppression du cache et lancement de la vérification..."
    rm -f "$CACHE_FILE"
    "$SCRIPT_DIR/check-updates-on-startup.sh"
}

# Menu principal
case "${1:-status}" in
    "status"|"s")
        show_status
        ;;
    "show"|"cat")
        show_raw
        ;;
    "reset"|"clear"|"r")
        reset_cache
        ;;
    "force"|"f")
        force_check
        ;;
    "help"|"h"|"--help")
        echo "Usage: $0 [commande]"
        echo ""
        echo "Commandes:"
        echo "  status, s      Afficher le statut du cache (défaut)"
        echo "  show, cat      Afficher le contenu brut du cache"
        echo "  reset, r       Réinitialiser le cache"
        echo "  force, f       Forcer une vérification maintenant"
        echo "  help, h        Afficher cette aide"
        echo ""
        echo "Exemples:"
        echo "  $0              # Afficher le statut"
        echo "  $0 reset        # Réinitialiser le cache"
        echo "  $0 force        # Forcer une vérification"
        ;;
    *)
        echo "Commande inconnue: $1"
        echo "Utilisez '$0 help' pour voir les commandes disponibles"
        exit 1
        ;;
esac
