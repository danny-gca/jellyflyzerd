#!/bin/bash

# Script de démarrage automatique pour Jellyflyzerd dans WSL
# Ce script démarre automatiquement Jellyfin au démarrage de WSL

set -e

# Détection automatique des variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_USER="${USER:-$(whoami)}"

# Charger les variables d'environnement si disponibles
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
fi

# Variables avec fallbacks
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
SYSTEM_USER="${SYSTEM_USER:-$CURRENT_USER}"

LOG_FILE="$PROJECT_DIR/logs/startup.log"
LOCK_FILE="/tmp/jellyflyzerd-startup.lock"

# Créer le dossier de logs si nécessaire
mkdir -p "$(dirname "$LOG_FILE")"

# Éviter les démarrages multiples
if [ -f "$LOCK_FILE" ]; then
    echo "$(date): Demarrage deja en cours" >> "$LOG_FILE"
    exit 0
fi

touch "$LOCK_FILE"

echo "$(date): Demarrage automatique de Jellyflyzerd..." | tee -a "$LOG_FILE"

# Source du profil pour avoir accès aux commandes globales
source ~/.bashrc 2>/dev/null || true
source ~/.profile 2>/dev/null || true

# Charger NVM si disponible
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Utiliser la version Node.js par défaut de NVM
nvm use default 2>/dev/null || true

# Ajouter le chemin npm global si nécessaire
export PATH="$PATH:/usr/local/bin:$HOME/.local/bin:$HOME/.nvm/versions/node/v22.13.1/bin"

# Attendre que Docker soit prêt
sleep 5

# Changer vers le répertoire du projet
cd "$PROJECT_DIR"

# Vérifier si jellyflyzerd est disponible
if ! command -v jellyflyzerd &> /dev/null; then
    echo "$(date): jellyflyzerd non trouve, tentative d'installation..." | tee -a "$LOG_FILE"
    npm link >> "$LOG_FILE" 2>&1 || echo "$(date): Echec npm link" >> "$LOG_FILE"
fi

# Démarrer Jellyflyzerd avec feedback console et log
echo "Tentative de demarrage de Jellyflyzerd..."
# Utiliser le binaire direct si la commande globale échoue
if command -v jellyflyzerd &> /dev/null; then
    JELLYFIN_CMD="jellyflyzerd"
else
    # Utiliser la version spécifique de Node.js avec NVM
    JELLYFIN_CMD="$HOME/.nvm/versions/node/v22.13.1/bin/node $PROJECT_DIR/dist/index.js"
fi

if $JELLYFIN_CMD start 2>&1 | tee -a "$LOG_FILE"; then
    echo "$(date): Jellyflyzerd demarre avec succes" | tee -a "$LOG_FILE"
else
    echo "$(date): Echec du demarrage de Jellyflyzerd" | tee -a "$LOG_FILE"
fi

# Nettoyer le verrou
rm -f "$LOCK_FILE"