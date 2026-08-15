@echo off
title CardVault TCG - Server di Sincronizzazione Locale
echo ====================================================
echo   AVVIO CARDVAULT TCG (Sincronizzazione File CSV)
echo ====================================================
echo.
echo Avvio del server locale su http://localhost:3000...
echo Il file CSV sara' sincronizzato automaticamente in tempo reale!
echo.
start http://localhost:3000
node server.js
pause
