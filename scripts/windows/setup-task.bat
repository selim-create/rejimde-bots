@echo off
REM ============================================
REM Windows Task Scheduler Auto-Setup Script
REM ============================================

echo.
echo ============================================
echo   Windows Task Scheduler Auto-Setup
echo ============================================
echo.

REM Admin kontrolü
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Bu script yönetici olarak çalıştırılmalıdır!
    echo.
    echo Sağ tıklayıp "Yönetici olarak çalıştır" seçeneğini kullanın.
    echo.
    pause
    exit /b 1
)

echo [OK] Yönetici yetkileri doğrulandı.
echo.

REM Görev adı
set TASK_NAME=RejimdeBotsDaily

REM Eski görevi sil (varsa)
echo Eski görev kontrol ediliyor...
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo Eski görev bulundu, siliniyor...
    schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
    echo [OK] Eski görev silindi.
) else (
    echo Eski görev bulunamadı.
)
echo.

REM Batch dosyasının tam yolu
set SCRIPT_PATH=C:\Projects\rejimde-bots\scripts\windows\run-daily.bat

REM Görev oluştur
echo Yeni görev oluşturuluyor...
echo.
echo Görev Adı: %TASK_NAME%
echo Çalışma Saati: Her gün saat 06:00
echo Script: %SCRIPT_PATH%
echo.

schtasks /create ^
    /tn "%TASK_NAME%" ^
    /tr "%SCRIPT_PATH%" ^
    /sc daily ^
    /st 06:00 ^
    /ru SYSTEM ^
    /rl HIGHEST ^
    /f

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo [BAŞARILI] Görev başarıyla oluşturuldu!
    echo ============================================
    echo.
    echo Görev Detayları:
    echo   - Adı: %TASK_NAME%
    echo   - Sıklık: Her gün
    echo   - Saat: 06:00
    echo   - Kullanıcı: SYSTEM
    echo   - Öncelik: Yüksek
    echo.
    echo Görev durumunu kontrol etmek için:
    echo   scripts\windows\check-status.bat
    echo.
    echo Manuel olarak çalıştırmak için:
    echo   scripts\windows\run-now.bat
    echo.
) else (
    echo.
    echo ============================================
    echo [HATA] Görev oluşturulamadı!
    echo ============================================
    echo.
    echo Lütfen hata mesajını kontrol edin.
    echo.
)

pause
