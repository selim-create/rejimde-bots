@echo off
REM ============================================
REM Windows Daily Bot Runner Script
REM ============================================

REM Proje dizinine git
cd /d C:\Projects\rejimde-bots

REM Log klasörünü oluştur (yoksa)
if not exist "logs" mkdir logs

REM Tarih bazlı log dosyası adı oluştur (YYYY-MM-DD)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set year=%datetime:~0,4%
set month=%datetime:~4,2%
set day=%datetime:~6,2%
set logfile=logs\daily-%year%-%month%-%day%.log

REM Başlangıç mesajı
echo ============================================ >> %logfile%
echo Scheduled Bot Runner Started >> %logfile%
echo Date: %year%-%month%-%day% >> %logfile%
echo Time: %datetime:~8,2%:%datetime:~10,2%:%datetime:~12,2% >> %logfile%
echo ============================================ >> %logfile%
echo. >> %logfile%

REM npm run scheduled-run çalıştır ve çıktıyı log dosyasına yönlendir
call npm run scheduled-run >> %logfile% 2>&1

REM Bitiş mesajı
echo. >> %logfile%
echo ============================================ >> %logfile%
echo Scheduled Bot Runner Completed >> %logfile%
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
echo End Time: %datetime:~8,2%:%datetime:~10,2%:%datetime:~12,2% >> %logfile%
echo ============================================ >> %logfile%

REM Eski log dosyalarını temizle (30 günden eski)
forfiles /p logs /m *.log /d -30 /c "cmd /c del @path" 2>nul

exit /b 0
