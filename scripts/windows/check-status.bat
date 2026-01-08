@echo off
setlocal enabledelayedexpansion
REM ============================================
REM System Status Check Script
REM ============================================

echo.
echo ============================================
echo   Rejimde Bots - System Status
echo ============================================
echo.

REM Node.js versiyonu
echo [1] Node.js Versiyonu:
node --version
if %errorlevel% neq 0 (
    echo    [HATA] Node.js bulunamadı!
) else (
    echo    [OK] Node.js kurulu
)
echo.

REM npm versiyonu
echo [2] npm Versiyonu:
call npm --version
if %errorlevel% neq 0 (
    echo    [HATA] npm bulunamadı!
) else (
    echo    [OK] npm kurulu
)
echo.

REM Task Scheduler görevi durumu
echo [3] Task Scheduler Görevi:
schtasks /query /tn "RejimdeBotsDaily" /fo LIST 2>nul
if %errorlevel% neq 0 (
    echo    [UYARI] Görev bulunamadı!
    echo    Görev oluşturmak için: scripts\windows\setup-task.bat
) else (
    echo    [OK] Görev aktif
)
echo.

REM Proje dizini kontrolü
echo [4] Proje Dizini:
if exist "C:\Projects\rejimde-bots" (
    echo    [OK] C:\Projects\rejimde-bots mevcut
) else (
    echo    [UYARI] C:\Projects\rejimde-bots bulunamadı!
)
echo.

REM Log dosyaları
echo [5] Son Log Dosyaları:
if exist "C:\Projects\rejimde-bots\logs" (
    dir /b /o-d "C:\Projects\rejimde-bots\logs\*.log" 2>nul | findstr /r ".*" >nul
    if %errorlevel% equ 0 (
        echo.
        dir /b /o-d "C:\Projects\rejimde-bots\logs\*.log" 2>nul | findstr /n "^" | findstr "^[1-5]:"
        echo.
    ) else (
        echo    [UYARI] Log dosyası bulunamadı
    )
) else (
    echo    [UYARI] logs/ klasörü bulunamadı
)
echo.

REM Veritabanı boyutu
echo [6] Veritabanı Boyutu:
if exist "C:\Projects\rejimde-bots\data\bots.sqlite" (
    for %%A in ("C:\Projects\rejimde-bots\data\bots.sqlite") do (
        set size=%%~zA
        set /a sizeMB=!size! / 1048576
        echo    bots.sqlite: !sizeMB! MB
    )
) else (
    echo    [UYARI] bots.sqlite bulunamadı
)
echo.

REM Son çalışma zamanı (log dosyasından)
echo [7] Son Çalışma Zamanı:
if exist "C:\Projects\rejimde-bots\logs" (
    for /f "delims=" %%i in ('dir /b /o-d "C:\Projects\rejimde-bots\logs\daily-*.log" 2^>nul') do (
        set lastlog=%%i
        goto :found
    )
    :found
    if defined lastlog (
        echo    Son log: !lastlog!
    ) else (
        echo    [UYARI] Log bulunamadı
    )
) else (
    echo    [UYARI] logs/ klasörü bulunamadı
)
echo.

echo ============================================
echo.

pause
