#!/bin/bash
# Script de vérification des mises à jour Docker au démarrage
# Utile si votre PC est éteint la nuit et que Watchtower rate sa vérification à 4h

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CACHE_FILE="$PROJECT_DIR/.watchtower-check-cache.json"
CHECK_INTERVAL=604800  # 7 jours en secondes (7 * 24 * 60 * 60)
CURRENT_TIME=$(date +%s)

# Fonction pour créer/lire le cache
read_cache() {
    if [ -f "$CACHE_FILE" ]; then
        cat "$CACHE_FILE"
    else
        echo "{}"
    fi
}

# Fonction pour vérifier si une vérification est nécessaire
should_check() {
    # Si le cache n'existe pas, on doit vérifier
    if [ ! -f "$CACHE_FILE" ]; then
        return 0  # true
    fi

    # Extraire la dernière vérification (en secondes depuis epoch)
    local last_check=$(sed -n 's/.*"last_check":\s*\([0-9]*\).*/\1/p' "$CACHE_FILE")

    # Si pas de dernière vérification, on doit vérifier
    if [ -z "$last_check" ] || [ "$last_check" = "0" ]; then
        return 0  # true
    fi

    # Calculer le temps écoulé
    local elapsed=$((CURRENT_TIME - last_check))

    # Si plus de CHECK_INTERVAL secondes, on doit vérifier
    if [ $elapsed -ge $CHECK_INTERVAL ]; then
        return 0  # true
    else
        # Calculer le temps restant en jours
        local remaining=$(( (CHECK_INTERVAL - elapsed) / 86400 ))
        # echo "⏭️  Dernière vérification il y a $(( elapsed / 86400 )) jour(s)"
        # echo "   Prochaine vérification dans $remaining jour(s)"
        return 1  # false
    fi
}

# Fonction pour mettre à jour le cache
update_cache() {
    local status=$1
    cat > "$CACHE_FILE" <<EOF
{
  "last_check": $CURRENT_TIME,
  "last_check_date": "$(date -Iseconds)",
  "status": "$status",
  "check_interval_days": $(( CHECK_INTERVAL / 86400 ))
}
EOF
}

# Vérifier si on doit lancer la vérification
if ! should_check; then
    # echo "✅ Pas de vérification nécessaire pour le moment"
    exit 0
fi

echo "🔄 Vérification des mises à jour Docker au démarrage..."

# Attendre que Docker soit prêt
echo "⏳ Attente du démarrage de Docker..."
for i in {1..30}; do
    if docker ps &>/dev/null 2>&1; then
        echo "✅ Docker est prêt"
        break
    fi
    sleep 2
done

# Vérifier si Docker est prêt
if ! docker ps &>/dev/null 2>&1; then
    echo "❌ Docker n'est pas disponible"
    update_cache "failed_docker"
    exit 1
fi

# ============================================
# VÉRIFICATION DU CERTIFICAT SSL
# ============================================
echo ""
echo "🔐 Vérification du certificat SSL..."

SSL_CERT="$PROJECT_DIR/docker/nginx/ssl/cert.pem"

if [ -f "$SSL_CERT" ]; then
    # Extraire la date d'expiration
    EXPIRY_DATE=$(openssl x509 -in "$SSL_CERT" -noout -enddate 2>/dev/null | cut -d= -f2)

    if [ -n "$EXPIRY_DATE" ]; then
        # Convertir en timestamp
        EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null)
        DAYS_LEFT=$(( (EXPIRY_TIMESTAMP - CURRENT_TIME) / 86400 ))

        if [ $DAYS_LEFT -lt 0 ]; then
            echo "❌ Certificat SSL EXPIRÉ depuis $((-DAYS_LEFT)) jour(s) !"
            echo "🔄 Renouvellement automatique du certificat..."

            # Renouveler le certificat avec le script bash (jellyflyzerd ssl renew a un bug de validation IP)
            if bash "$PROJECT_DIR/scripts/ssl/renew-and-sync.sh"; then
                echo "✅ Certificat SSL renouvelé avec succès"
            else
                echo "⚠️  Échec du renouvellement SSL (vous devrez le faire manuellement)"
            fi
        elif [ $DAYS_LEFT -lt 30 ]; then
            echo "⚠️  Certificat SSL expire dans $DAYS_LEFT jour(s)"
            echo "💡 Renouvellement recommandé : bash $PROJECT_DIR/scripts/ssl/renew-and-sync.sh"
        else
            echo "✅ Certificat SSL valide (expire dans $DAYS_LEFT jour(s))"
        fi
    else
        echo "⚠️  Impossible de lire la date d'expiration du certificat"
    fi
else
    echo "⚠️  Aucun certificat SSL trouvé"
fi

echo ""
# ============================================

# Attendre que Watchtower soit démarré
echo "⏳ Attente du démarrage de Watchtower..."
for i in {1..30}; do
    if docker ps | grep -q "jellyflyzerd-watchtower"; then
        echo "✅ Watchtower est prêt"
        break
    fi
    sleep 2
done

# Vérifier si Watchtower est prêt
if ! docker ps | grep -q "jellyflyzerd-watchtower"; then
    echo "❌ Watchtower n'est pas disponible"
    update_cache "failed_watchtower"
    exit 1
fi

# Attendre encore 10 secondes que Watchtower initialise complètement
sleep 10

# Forcer une vérification
echo "🔍 Vérification des mises à jour disponibles..."
if docker exec jellyflyzerd-watchtower /watchtower --run-once; then
    update_cache "success"
    echo ""
    echo "✅ Vérification terminée avec succès"
else
    update_cache "failed_check"
    echo ""
    echo "⚠️  Vérification terminée avec des erreurs"
fi

echo "📝 Consultez les logs: docker logs jellyflyzerd-watchtower"
echo "🔄 Prochaine vérification automatique dans 7 jours"
