@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo ========================================
echo   PingOf — GitHub main'e yukle
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [HATA] Git bulunamadi. Git for Windows kurulu olmali.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [HATA] Bu klasor bir git reposu degil.
  pause
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH (
  echo [HATA] Aktif branch okunamadi.
  pause
  exit /b 1
)

if /I not "!BRANCH!"=="main" (
  echo [UYARI] Aktif branch "main" degil: !BRANCH!
  echo Devam etmek main disina push eder.
  choice /C YN /M "Yine de devam edilsin mi"
  if errorlevel 2 (
    echo Iptal edildi.
    pause
    exit /b 0
  )
)

echo [1/4] Durum kontrol ediliyor...
git status -sb
echo.

echo [2/4] Degisiklikler ekleniyor...
git add -A
if errorlevel 1 (
  echo [HATA] git add basarisiz.
  pause
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 goto do_commit
echo [3/4] Yeni commit yok — sadece push yapilacak.
goto do_push

:do_commit
echo [3/4] Commit olusturuluyor...
git commit -m "chore: update from push-main.bat"
if errorlevel 1 (
  echo [HATA] git commit basarisiz.
  pause
  exit /b 1
)

:do_push
echo.
echo [4/4] origin/!BRANCH! adresine push...
git push -u origin HEAD
if errorlevel 1 (
  echo.
  echo [HATA] Push basarisiz. GitHub girisi / yetki gerekebilir.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Tamam — GitHub guncellendi.
echo   https://github.com/eemirhant/PingOf
echo ========================================
echo.
pause
endlocal
