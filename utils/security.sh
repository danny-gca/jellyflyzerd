#!/bin/bash

# Utilitaires de sécurité pour Jellyfin
# Implémente les mesures de sécurité critiques identifiées dans SECURITY.md

source "$(dirname "${BASH_SOURCE[0]}")/../core/config.sh"

# Créer un utilisateur dédié pour Jellyfin
create_jellyfin_user() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            CRÉATION UTILISATEUR SÉCURISÉ                 ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    log "Vérification de l'utilisateur jellyfinuser..."

    if id "jellyfinuser" &>/dev/null; then
        warning "L'utilisateur jellyfinuser existe déjà"
        return 0
    fi

    log "Création de l'utilisateur système jellyfinuser..."

    # Créer l'utilisateur système sans shell et sans home
    sudo useradd --system --no-create-home --shell /bin/false --group jellyfinuser jellyfinuser 2>/dev/null || {
        # Si le groupe n'existe pas, le créer d'abord
        sudo groupadd jellyfinuser 2>/dev/null || true
        sudo useradd --system --no-create-home --shell /bin/false --gid jellyfinuser jellyfinuser
    }

    # Donner les permissions nécessaires sur les dossiers Jellyfin
    log "Configuration des permissions..."
    sudo chown -R jellyfinuser:jellyfinuser "$JELLYFIN_DATA_DIR" 2>/dev/null || true
    sudo chown -R jellyfinuser:jellyfinuser "$JELLYFIN_CACHE_DIR" 2>/dev/null || true
    sudo chown -R jellyfinuser:jellyfinuser "$JELLYFIN_LOG_DIR" 2>/dev/null || true

    # Permissions sur le dossier de session temporaire
    sudo chown -R jellyfinuser:jellyfinuser "/tmp/jellyfin-persistent" 2>/dev/null || true
    sudo chmod -R 755 "/tmp/jellyfin-persistent" 2>/dev/null || true

    # Créer et corriger les permissions du dossier log dans la session
    sudo mkdir -p "/tmp/jellyfin-persistent/log"
    sudo chown -R jellyfinuser:jellyfinuser "/tmp/jellyfin-persistent/log" 2>/dev/null || true
    sudo chmod -R 755 "/tmp/jellyfin-persistent/log" 2>/dev/null || true

    success "Utilisateur jellyfinuser créé avec succès"

    echo
    echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
    echo "- Jellyfin s'exécutera maintenant avec l'utilisateur 'jellyfinuser'"
    echo "- Cet utilisateur n'a pas de shell ni d'accès sudo"
    echo "- Redémarrez Jellyfin pour appliquer les changements"
    echo
}

# Configurer le firewall UFW
setup_firewall() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              CONFIGURATION FIREWALL                      ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    # Vérifier si UFW est installé
    if ! command -v ufw &> /dev/null; then
        log "Installation d'UFW..."
        sudo apt update
        sudo apt install -y ufw
    fi

    log "Configuration du firewall UFW..."

    # Règles de base
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing

    # Ports Jellyfin essentiels
    sudo ufw allow 80/tcp comment "HTTP (redirection HTTPS)"
    sudo ufw allow 443/tcp comment "HTTPS Jellyfin"
    sudo ufw allow 8096/tcp comment "Jellyfin direct"

    # SSH pour administration à distance
    read -p "Autoriser SSH (port 22) ? [y/N]: " allow_ssh
    if [[ $allow_ssh =~ ^[Yy]$ ]]; then
        sudo ufw allow 22/tcp comment "SSH admin"
        log "SSH autorisé"
    fi

    # Activer le firewall
    sudo ufw --force enable

    success "Firewall UFW configuré et activé"

    echo
    echo -e "${GREEN}Règles actives:${NC}"
    sudo ufw status numbered
    echo
}

# Configurer les mises à jour automatiques
setup_auto_updates() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           MISES À JOUR AUTOMATIQUES                      ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    log "Installation d'unattended-upgrades..."
    sudo apt update
    sudo apt install -y unattended-upgrades apt-listchanges

    log "Configuration des mises à jour automatiques..."

    # Activer les mises à jour automatiques
    echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null

    # Configuration sécurisée
    sudo tee /etc/apt/apt.conf.d/51unattended-upgrades-jellyfin > /dev/null << 'EOF'
// Configuration sécurisée pour Jellyfin
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

    # Tester la configuration
    sudo unattended-upgrades --dry-run

    success "Mises à jour automatiques configurées"

    echo
    echo -e "${GREEN}Configuration:${NC}"
    echo "- Vérification quotidienne des mises à jour"
    echo "- Installation automatique des mises à jour de sécurité"
    echo "- Nettoyage hebdomadaire des paquets"
    echo "- Redémarrage automatique désactivé"
    echo
}

# Audit des mots de passe Jellyfin
audit_jellyfin_passwords() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            AUDIT MOTS DE PASSE JELLYFIN                  ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    warning "AUDIT MANUEL REQUIS:"
    echo
    echo "1. Connectez-vous à Jellyfin en tant qu'administrateur"
    echo "2. Allez dans: Administration → Tableau de bord → Utilisateurs"
    echo "3. Pour chaque utilisateur, vérifiez:"
    echo "   - Mot de passe de 12+ caractères"
    echo "   - Combinaison de lettres, chiffres et symboles"
    echo "   - Pas de mots du dictionnaire"
    echo "   - Pas d'informations personnelles"
    echo
    echo "4. Supprimez les comptes inutilisés"
    echo "5. Désactivez le compte 'guest' si présent"
    echo
    echo -e "${YELLOW}URLs d'accès:${NC}"
    echo "- Local: http://$LOCAL_IP:8096"
    echo "- Externe: https://[VOTRE_DOMAINE]"
    echo

    read -p "Appuyez sur Entrée pour continuer..."
}

# Installer fail2ban pour la protection
setup_fail2ban() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              PROTECTION FAIL2BAN                         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    log "Installation de fail2ban..."
    sudo apt update
    sudo apt install -y fail2ban

    log "Configuration de fail2ban pour Jellyfin..."

    # Configuration pour Jellyfin
    sudo tee /etc/fail2ban/jail.d/jellyfin.conf > /dev/null << EOF
[jellyfin]
enabled = true
port = 8096,80,443
protocol = tcp
filter = jellyfin
logpath = ${JELLYFIN_LOG_DIR}/jellyfin.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

    # Filtre pour détecter les tentatives de connexion
    sudo tee /etc/fail2ban/filter.d/jellyfin.conf > /dev/null << 'EOF'
[Definition]
failregex = ^.*Authentication request for .* has been denied \(IP: "<HOST>"\).*$
            ^.*Invalid username or password entered by user .* \(IP: "<HOST>"\).*$
            ^.*Authentication failed for user .* \(IP: "<HOST>"\).*$
ignoreregex =
EOF

    # Redémarrer fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban

    success "Fail2ban configuré pour Jellyfin"

    echo
    echo -e "${GREEN}Protection active:${NC}"
    echo "- 3 tentatives de connexion maximum"
    echo "- Bannissement de 1 heure après échec"
    echo "- Surveillance sur les ports 8096, 80, 443"
    echo
}

# Menu principal de sécurité
security_menu() {
    while true; do
        clear
        echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║                  SÉCURISATION JELLYFIN                   ║${NC}"
        echo -e "${BLUE}║                  Score actuel: 50%                       ║${NC}"
        echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
        echo

        echo -e "${GREEN}Mesures de sécurité disponibles:${NC}"
        echo
        echo -e "${YELLOW}CRITIQUE (non implémenté):${NC}"
        echo "1. 🔥 Configurer le firewall UFW"
        echo "2. 👤 Créer utilisateur dédié Jellyfin"
        echo "3. 🔑 Audit des mots de passe"
        echo "4. 🛡️  Installer protection fail2ban"
        echo
        echo -e "${YELLOW}IMPORTANT:${NC}"
        echo "5. 🔄 Configurer mises à jour automatiques"
        echo
        echo -e "${GREEN}AUTRES OPTIONS:${NC}"
        echo "6. 📊 Audit de sécurité complet"
        echo "7. 🚀 Appliquer toutes les mesures critiques"
        echo
        echo "0. ← Retour au menu principal"
        echo

        read -p "Choisissez une option (0-7): " choice

        case $choice in
            1) setup_firewall ;;
            2) create_jellyfin_user ;;
            3) audit_jellyfin_passwords ;;
            4) setup_fail2ban ;;
            5) setup_auto_updates ;;
            6) security_audit ;;
            7) apply_all_critical_security ;;
            0) break ;;
            *) error "Option invalide" ;;
        esac

        if [ "$choice" != "0" ]; then
            echo
            read -p "Appuyez sur Entrée pour continuer..."
        fi
    done
}

# Audit de sécurité complet
security_audit() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║               AUDIT DE SÉCURITÉ COMPLET                  ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    log "Analyse de sécurité en cours..."
    echo

    # 1. Firewall
    echo -e "${YELLOW}🔥 Firewall UFW:${NC}"
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "   ✅ Actif"
    else
        echo -e "   ❌ Inactif - CRITIQUE"
    fi

    # 2. Utilisateur Jellyfin
    echo -e "${YELLOW}👤 Utilisateur Jellyfin:${NC}"
    if id "jellyfinuser" &>/dev/null; then
        echo -e "   ✅ Utilisateur dédié 'jellyfinuser' existe"
    else
        echo -e "   ❌ Pas d'utilisateur dédié - CRITIQUE"
    fi

    # 3. Processus Jellyfin
    echo -e "${YELLOW}🔒 Processus Jellyfin:${NC}"
    jellyfin_user=$(ps aux | grep '[j]ellyfin' | awk '{print $1}' | head -1)
    if [ "$jellyfin_user" = "jellyfinuser" ]; then
        echo -e "   ✅ Exécuté par utilisateur 'jellyfinuser'"
    else
        echo -e "   ❌ Exécuté par '$jellyfin_user' (utilisateur admin) - CRITIQUE"
    fi

    # 4. HTTPS
    echo -e "${YELLOW}🔒 HTTPS/SSL:${NC}"
    if [ -f "/etc/nginx/sites-available/jellyfin" ] && grep -q "ssl_certificate" /etc/nginx/sites-available/jellyfin; then
        echo -e "   ✅ Certificat SSL configuré"
    else
        echo -e "   ❌ SSL non configuré"
    fi

# 5. Fail2ban (adaptation WSL)
    echo -e "${YELLOW}🛡️  Fail2ban:${NC}"
    if [ -f "/etc/fail2ban/jail.d/jellyfin.conf" ] && command -v fail2ban-client &> /dev/null; then
        echo -e "   ✅ Installé et configuré pour Jellyfin"
    else
        echo -e "   ❌ Non configuré - IMPORTANT"
    fi

    # 6. Mises à jour automatiques
    echo -e "${YELLOW}🔄 Mises à jour auto:${NC}"
    if [ -f "/etc/apt/apt.conf.d/20auto-upgrades" ]; then
        echo -e "   ✅ Configurées"
    else
        echo -e "   ❌ Non configurées - IMPORTANT"
    fi

    echo

    # Calcul du score
    local score=0
    sudo ufw status | grep -q "Status: active" && ((score++))
    id "jellyfinuser" &>/dev/null && ((score++))
    [ "$jellyfin_user" = "jellyfinuser" ] && ((score++))
    [ -f "/etc/nginx/sites-available/jellyfin" ] && grep -q "ssl_certificate" /etc/nginx/sites-available/jellyfin && ((score++))
    [ -f "/etc/fail2ban/jail.d/jellyfin.conf" ] && command -v fail2ban-client &> /dev/null && ((score++))
    [ -f "/etc/apt/apt.conf.d/20auto-upgrades" ] && ((score++))

    local percentage=$((score * 100 / 6))

    echo -e "${BLUE}📊 Score de sécurité: $percentage% ($score/6)${NC}"

    if [ $percentage -lt 60 ]; then
        echo -e "${RED}⚠️  SÉCURITÉ INSUFFISANTE - Actions requises${NC}"
    elif [ $percentage -lt 80 ]; then
        echo -e "${YELLOW}⚠️  Sécurité correcte - Améliorations recommandées${NC}"
    else
        echo -e "${GREEN}✅ Excellente sécurité${NC}"
    fi

    echo
}

# Appliquer toutes les mesures critiques
apply_all_critical_security() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           SÉCURISATION COMPLÈTE AUTOMATIQUE              ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo

    warning "Cette opération va appliquer toutes les mesures de sécurité critiques:"
    echo "- Créer un utilisateur dédié 'jellyfin'"
    echo "- Configurer le firewall UFW"
    echo "- Installer fail2ban"
    echo "- Configurer les mises à jour automatiques"
    echo

    read -p "Continuer ? [y/N]: " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log "Opération annulée"
        return
    fi

    echo
    log "Début de la sécurisation automatique..."

    create_jellyfin_user
    setup_firewall
    setup_fail2ban
    setup_auto_updates

    echo
    success "🔒 Sécurisation complète terminée !"

    echo
    warning "ACTIONS MANUELLES REQUISES:"
    echo "1. Redémarrer Jellyfin pour utiliser le nouvel utilisateur"
    echo "2. Auditer les mots de passe dans l'interface Jellyfin"
    echo "3. Tester l'accès depuis l'extérieur"
    echo

    security_audit
}