@echo off
REM Script de demarrage automatique Jellyflyzerd pour Windows (portable)
REM Peut etre place n'importe ou et detecte automatiquement le projet

echo Demarrage de Jellyflyzerd via WSL...

REM Detecter l'utilisateur WSL
for /f "tokens=*" %%a in ('wsl whoami 2^>nul') do set "WSL_USER=%%a"
if not defined WSL_USER (
    echo Erreur: WSL non disponible ou non configure
    pause
    exit /b 1
)

REM Chemins possibles du projet
set "POSSIBLE_PATHS=/home/%WSL_USER%/projects/jellyflyzerd /home/%WSL_USER%/jellyflyzerd /home/%WSL_USER%/Desktop/jellyflyzerd"

REM Chercher le projet
set "PROJECT_FOUND="
for %%p in (%POSSIBLE_PATHS%) do (
    wsl test -f "%%p/scripts/setup/start-on-boot.sh" 2>nul && set "PROJECT_FOUND=%%p" && goto :found
)

echo Erreur: Projet jellyflyzerd non trouve dans les emplacements:
for %%p in (%POSSIBLE_PATHS%) do echo   - %%p
pause
exit /b 1

:found
echo Projet trouve: %PROJECT_FOUND%

REM Demarrer le script
start /B wsl -e bash "%PROJECT_FOUND%/scripts/setup/start-on-boot.sh"

REM Attendre un peu pour laisser le temps au script de demarrer
timeout /t 3 /nobreak >nul

echo Jellyflyzerd demarre en arriere-plan
echo Ce script peut etre ferme maintenant

REM Attendre que l'utilisateur appuie sur une touche
pause