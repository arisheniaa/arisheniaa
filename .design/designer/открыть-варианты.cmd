@echo off
chcp 65001 >nul
rem Двойной клик — запускает варианты сайта и через несколько секунд
rem открывает их в браузере. Окно не закрывайте, пока смотрите: закрыли
rem окно — сервер остановился.
cd /d "%~dp0"
title Варианты сайта — не закрывайте это окно
if not exist node_modules (
  echo Первый запуск: ставлю зависимости, это займёт минуту...
  call npm install
)
start "" /min cmd /c "timeout /t 7 >nul & start "" http://127.0.0.1:5180/"
call npm run dev
pause
