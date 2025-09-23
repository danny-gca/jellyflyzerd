@echo off
title Jellyfin Manager
echo Lancement du Jellyfin Manager...
echo.

REM Lancer le manager Jellyfin dans WSL
wsl.exe -e bash -ic "cd ~/jellyfin && ./jellyfin-manager.sh"

REM Maintenir la fenêtre ouverte si le script se ferme de manière inattendue
if errorlevel 1 (
    echo.
    echo Une erreur s'est produite. Appuyez sur une touche pour fermer...
    pause >nul
)