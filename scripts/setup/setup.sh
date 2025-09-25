#!/bin/bash

# Setup script pour Jellyflyzerd v2.0.0
set -e

echo "🎬 Jellyflyzerd v2.0.0 Setup"
echo "============================"
echo

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions utilitaires
log() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

check_command() {
    if command -v $1 &> /dev/null; then
        success "$1 est installé"
        return 0
    else
        error "$1 n'est pas installé"
        return 1
    fi
}

# Vérification des prérequis
echo "🔍 Vérification des prérequis..."
echo

MISSING_DEPS=0

if ! check_command node; then
    error "Node.js version 18+ requis"
    echo "   Installation: https://nodejs.org/"
    MISSING_DEPS=1
fi

if ! check_command npm; then
    error "npm requis (généralement installé avec Node.js)"
    MISSING_DEPS=1
fi

if ! check_command docker; then
    error "Docker requis"
    echo "   Installation: https://docs.docker.com/get-docker/"
    MISSING_DEPS=1
fi

if ! check_command docker-compose; then
    if ! docker compose version &> /dev/null; then
        error "Docker Compose requis"
        echo "   Installation: https://docs.docker.com/compose/install/"
        MISSING_DEPS=1
    else
        success "Docker Compose v2 détecté"
    fi
else
    success "Docker Compose v1 détecté"
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo
    error "Certains prérequis sont manquants. Veuillez les installer avant de continuer."
    exit 1
fi

echo
success "Tous les prérequis sont satisfaits!"
echo

# Installation des dépendances Node.js
log "Installation des dépendances Node.js..."
if npm install; then
    success "Dépendances installées"
else
    error "Échec de l'installation des dépendances"
    exit 1
fi

echo

# Build du projet
log "Compilation du projet TypeScript..."
if npm run build; then
    success "Projet compilé"
else
    error "Échec de la compilation"
    exit 1
fi

echo

# Configuration
log "Configuration de l'environnement..."

if [ ! -f .env ]; then
    log "Création du fichier .env..."

    # Détecter l'IP locale
    LOCAL_IP=$(hostname -I | awk '{print $1}' || echo "localhost")

    # Demander le domaine externe
    read -p "Domaine externe (optionnel, ex: jellyfin.mondomaine.com): " EXTERNAL_DOMAIN

    # Demander le chemin des médias
    read -p "Chemin vers vos médias [/home/$(whoami)/media]: " MEDIA_PATH
    MEDIA_PATH=${MEDIA_PATH:-/home/$(whoami)/media}

    # Créer le .env
    cat > .env << EOF
# Configuration Jellyflyzerd v2.0.0

# Jellyfin
JELLYFIN_PORT=8096
JELLYFIN_HTTPS_PORT=8920

# Réseau
LOCAL_IP=$LOCAL_IP
EXTERNAL_DOMAIN=$EXTERNAL_DOMAIN
HTTP_PORT=80
HTTPS_PORT=443

# Chemins Docker
MEDIA_PATH=$MEDIA_PATH
CONFIG_PATH=\${CONFIG_PATH}
CACHE_PATH=\${CACHE_PATH}

# Environnement
NODE_ENV=production
TZ=Europe/Paris

# Sécurité
ENABLE_FIREWALL=true
ENABLE_FAIL2BAN=true
ENABLE_HTTPS=true
AUTO_UPDATES=true
EOF

    success "Fichier .env créé"
else
    warning "Fichier .env existant conservé"
fi

echo

# Créer les dossiers de données
log "Création des dossiers de données..."
mkdir -p data/config data/cache logs
success "Dossiers créés"

echo

# Installation globale (optionnel)
read -p "Installer jellyflyzerd globalement ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Installation globale..."
    if npm link; then
        success "jellyflyzerd installé globalement"
        echo
        log "Vous pouvez maintenant utiliser 'jellyflyzerd' depuis n'importe où"
    else
        warning "Échec de l'installation globale (permissions ?)"
        log "Vous pouvez utiliser 'npm run start' ou 'node dist/index.js'"
    fi
else
    log "Vous pouvez utiliser 'npm run start' ou 'node dist/index.js'"
fi

echo
echo "🎉 Installation terminée!"
echo
echo "📋 Prochaines étapes:"
echo "  1. Vérifiez la configuration: jellyflyzerd status"
echo "  2. Démarrez Jellyfin: jellyflyzerd start"
echo "  3. Consultez les logs: jellyflyzerd logs"
echo
echo "💡 Aide: jellyflyzerd --help"
echo

# Test rapide
log "Test rapide du CLI..."
if node dist/index.js --version; then
    success "CLI fonctionnel!"
else
    error "Problème avec le CLI"
    exit 1
fi

echo
success "Setup terminé avec succès! 🚀"