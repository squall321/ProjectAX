@echo off
chcp 65001 >nul
TITLE CAE Ontology Management System - Launcher
SETLOCAL

echo ==================================================
echo   CAE Ontology Management System - Portable Launcher
echo ==================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 LTS 버전을 설치해주세요.
    pause
    exit /b
)

:: 2. Check PostgreSQL (Optional check)
echo [INFO] PostgreSQL 서버가 실행 중인지 확인하세요 (Port: 5432)
echo.

:: 3. Start Server
echo [INFO] 서버를 시작합니다...
cd /d "%~dp0server"
start /b node src/index.js

:: 4. Wait for server to warm up
echo [INFO] 어플리케이션 준비 중 (5초 대기)...
timeout /t 5 /nobreak >nul

:: 5. Open Browser
echo [INFO] 브라우저를 엽니다...
start http://localhost:4000

echo.
echo ==================================================
echo   시스템이 작동 중입니다. 이 창을 닫으면 종료됩니다.
echo ==================================================
echo.

:: Keep window open
cmd /k
