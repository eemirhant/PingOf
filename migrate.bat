@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo.
echo  PingOf - Veritabani migration
echo  =============================
echo.

if not exist ".env" (
  echo  HATA: .env yok. Once setup-db.bat calistirin.
  pause
  exit /b 1
)

REM Cursor/IDE shell sometimes injects a wrong DATABASE_URL that overrides .env
set "DATABASE_URL="

call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo  HATA: Migration basarisiz.
  echo  .env icindeki DATABASE_URL sifresini kontrol edin.
  pause
  exit /b 1
)

echo.
echo  Migration tamamlandi.
echo.
pause
