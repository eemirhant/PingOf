@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo.
echo  PingOf - Challenge.createdAt migration
echo  =====================================
echo.

if not exist ".env" (
  echo  HATA: .env yok. Once setup-db.bat calistirin.
  pause
  exit /b 1
)

REM Prevent inherited wrong DATABASE_URL from overriding .env
set "DATABASE_URL="

echo  [1/2] Prisma migrate deploy...
call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo  migrate deploy basarisiz. Node script ile kolon ekleniyor...
  echo.
  call node scripts\apply-createdat.js
  if errorlevel 1 (
    echo.
    echo  HATA: Migration uygulanamadi.
    echo  .env icindeki DATABASE_URL sifresini kontrol edin.
    pause
    exit /b 1
  )
)

echo.
echo  [2/2] Prisma client...
call npx prisma generate
if errorlevel 1 (
  echo  UYARI: generate basarisiz olabilir ^(dosya kilidi^). fix-prisma.bat deneyin.
)

echo.
echo  Tamam. Simdi start.bat ile uygulamayi yeniden baslatin.
echo.
pause
