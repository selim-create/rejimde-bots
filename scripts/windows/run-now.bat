@echo off
REM ============================================
REM Manuel Bot Runner Script
REM ============================================

echo.
echo ============================================
echo   Manuel Bot Runner
echo ============================================
echo.

REM Proje dizinine git
cd /d C:\Projects\rejimde-bots

REM Log klasörünü oluştur (yoksa)
if not exist "logs" mkdir logs

REM Tarih bazlı log dosyası adı oluştur
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set year=%datetime:~0,4%
set month=%datetime:~4,2%
set day=%datetime:~6,2%
set hour=%datetime:~8,2%
set minute=%datetime:~10,2%
set second=%datetime:~12,2%
set logfile=logs\manual-%year%-%month%-%day%-%hour%-%minute%-%second%.log

echo [OK] Log dosyası: %logfile%
echo [OK] Başlatılıyor...
echo.

REM npm run scheduled-run çalıştır
call npm run scheduled-run 2>&1 | tee %logfile%

echo.
echo ============================================
echo [TAMAMLANDI] Bot runner tamamlandı
echo ============================================
echo.
echo Log dosyası: %logfile%
echo.

pause
