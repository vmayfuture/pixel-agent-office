@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 没找到 Node.js。请先安装 Node.js 20 或更新版本。
  pause
  exit /b 1
)
set "PIXEL_OFFICE_OPEN_BROWSER=1"
node server.mjs
pause
