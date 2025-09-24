#!/bin/bash

# Script d'installation du service systemd pour Jellyflyzerd
# Usage: ./install-service.sh [nom_utilisateur]

set -e

CURRENT_USER="${1:-$(whoami)}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installation du service systemd pour l'utilisateur: $CURRENT_USER"
echo "Repertoire du projet: $PROJECT_DIR"

# Créer le fichier service personnalisé
SERVICE_CONTENT="[Unit]
Description=Jellyflyzerd - Gestionnaire Jellyfin moderne
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=$CURRENT_USER
Group=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR
Environment=\"PATH=/usr/local/bin:/usr/bin:/bin:/home/$CURRENT_USER/.local/bin\"
ExecStart=$PROJECT_DIR/start-on-boot.sh
TimeoutStartSec=30
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target"

# Ecrire le service
echo "$SERVICE_CONTENT" > "$PROJECT_DIR/jellyflyzerd-$CURRENT_USER.service"

echo "✅ Service créé: jellyflyzerd-$CURRENT_USER.service"
echo ""
echo "Pour installer le service:"
echo "  sudo cp jellyflyzerd-$CURRENT_USER.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable jellyflyzerd-$CURRENT_USER"
echo "  sudo systemctl start jellyflyzerd-$CURRENT_USER"