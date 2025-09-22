#!/bin/bash

# Script d'installation Jellyfin Manager

set -e

echo "🎬 Installation de Jellyfin Manager pour WSL"
echo "============================================="

# Vérifier si on est dans WSL
if [ -z "$WSL_DISTRO_NAME" ]; then
    echo "⚠️  Ce script est conçu pour WSL (Windows Subsystem for Linux)"
    read -p "Continuer quand même? (o/N): " confirm
    if [[ ! $confirm =~ ^[Oo]$ ]]; then
        exit 1
    fi
fi

# Vérifier la présence des dépendances
echo "🔍 Vérification des dépendances..."

missing_deps=()

# Vérifier les commandes nécessaires
if ! command -v jellyfin >/dev/null 2>&1; then
    missing_deps+=("jellyfin")
fi

if ! command -v nginx >/dev/null 2>&1; then
    missing_deps+=("nginx")
fi

if ! command -v netstat >/dev/null 2>&1; then
    missing_deps+=("net-tools")
fi

if [ ${#missing_deps[@]} -ne 0 ]; then
    echo "❌ Dépendances manquantes: ${missing_deps[*]}"
    echo "Veuillez installer les dépendances avant de continuer."
    echo ""
    echo "Pour installer Jellyfin:"
    echo "  curl https://repo.jellyfin.org/install-debuntu.sh | sudo bash"
    echo ""
    echo "Pour installer les autres dépendances:"
    echo "  sudo apt update && sudo apt install nginx net-tools -y"
    exit 1
fi

echo "✅ Toutes les dépendances sont présentes"

# Configuration du fichier .env
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Configuration de l'environnement..."

    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Fichier .env créé depuis .env.example"

        # Détecter automatiquement certaines valeurs
        current_user=$(whoami)
        current_home=$(eval echo "~$current_user")
        current_ip=$(hostname -I | awk '{print $1}')

        # Remplacer les valeurs par défaut
        sed -i "s|SYSTEM_USER=\[USERNAME\]|SYSTEM_USER=$current_user|g" .env
        sed -i "s|USER_HOME=/home/\[USERNAME\]|USER_HOME=$current_home|g" .env
        sed -i "s|PROJECT_DIR=/home/\[USERNAME\]/jellyfin|PROJECT_DIR=$current_home/jellyfin|g" .env
        sed -i "s|LOCAL_IP=\[YOUR_WSL_IP\]|LOCAL_IP=$current_ip|g" .env

        echo "✅ Configuration automatique appliquée:"
        echo "   Utilisateur: $current_user"
        echo "   Home: $current_home"
        echo "   IP locale: $current_ip"
        echo ""
        echo "⚠️  Veuillez vérifier et modifier le fichier .env selon vos besoins:"
        echo "   nano .env"
        echo ""
        echo "Particulièrement la variable EXTERNAL_DOMAIN si vous avez un domaine externe."
    else
        echo "❌ Fichier .env.example non trouvé"
        exit 1
    fi
else
    echo "✅ Fichier .env déjà présent"
fi

# Rendre les scripts exécutables
echo ""
echo "🔧 Configuration des permissions..."
chmod +x *.sh
chmod +x core/*.sh
chmod +x utils/*.sh
chmod +x menus/*.sh
echo "✅ Permissions configurées"

# Créer les dossiers nécessaires
echo ""
echo "📁 Création des dossiers..."
mkdir -p log
echo "✅ Dossier log créé"

# Test de la configuration
echo ""
echo "🧪 Test de la configuration..."
if source core/env-loader.sh; then
    echo "✅ Configuration valide"
    core/env-loader.sh
else
    echo "❌ Problème dans la configuration"
    echo "Veuillez vérifier le fichier .env"
    exit 1
fi

echo ""
echo "🎉 Installation terminée avec succès!"
echo ""
echo "📖 Prochaines étapes:"
echo "1. Vérifiez/modifiez le fichier .env si nécessaire:"
echo "   nano .env"
echo ""
echo "2. Lancez le gestionnaire Jellyfin:"
echo "   ./jellyfin-manager.sh"
echo ""
echo "3. Configurez le démarrage automatique (optionnel):"
echo "   ./jellyfin-manager.sh → Option 8"
echo ""
echo "4. Consultez la documentation:"
echo "   cat README.md"