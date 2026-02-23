@echo off
title PromptNota - Servidor Local
echo.
echo  ========================================
echo   PromptNota - Servidor Local
echo   Acesse: http://127.0.0.1:5173/PWANota/
echo  ========================================
echo.
npx -y http-server "%~dp0.." -p 5173 --cors -c-1
pause
