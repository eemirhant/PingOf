@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo  PingOf - PostgreSQL Kurulumu
echo  =============================
echo.

set "PG_BIN=C:\Program Files\PostgreSQL\17\bin"
if not exist "%PG_BIN%\psql.exe" (
  set "PG_BIN=C:\Program Files\PostgreSQL\16\bin"
)
if not exist "%PG_BIN%\psql.exe" (
  set "PG_BIN=C:\Program Files\PostgreSQL\15\bin"
)
if not exist "%PG_BIN%\psql.exe" (
  echo  HATA: PostgreSQL bulunamadi.
  echo  https://www.postgresql.org/download/windows/ adresinden PostgreSQL 15+ kurun.
  echo  Kurulum sirasinda belirlediginiz postgres sifresini not alin.
  pause
  exit /b 1
)

set "PATH=%PG_BIN%;%PATH%"
echo  PostgreSQL bulundu: %PG_BIN%
echo.

if exist ".env" (
  echo  .env dosyasi zaten var.
  set /p OVERWRITE=".env yeniden olusturulsun mu? (E/H): "
  if /i not "!OVERWRITE!"=="E" (
    goto RUN_MIGRATE
  )
)

echo  PostgreSQL kurulumunda belirlediginiz "postgres" kullanicisinin sifresini girin.
echo  (Yazarken ekranda gorunmez - normaldir, Enter'a basin.)
echo.
set /p PG_PASSWORD=Postgres sifresi: 

if "%PG_PASSWORD%"=="" (
  echo  HATA: Sifre bos olamaz.
  pause
  exit /b 1
)

set "DB_NAME=pingof"
set "DB_USER=postgres"
set "DB_HOST=localhost"
set "DB_PORT=5432"

echo.
echo  Veritabani olusturuluyor: %DB_NAME%
set PGPASSWORD=%PG_PASSWORD%
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '%DB_NAME%'" | findstr /r "1" >nul
if errorlevel 1 (
  psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -c "CREATE DATABASE %DB_NAME%;"
  if errorlevel 1 (
    echo  HATA: Veritabani olusturulamadi. Sifrenizi kontrol edin.
    set PGPASSWORD=
    pause
    exit /b 1
  )
  echo  Veritabani olusturuldu.
) else (
  echo  Veritabani zaten mevcut, devam ediliyor.
)

set PGPASSWORD=

for /f "delims=" %%i in ('powershell -NoProfile -Command "[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])"') do set AUTH_SECRET=%%i

(
  echo DATABASE_URL="postgresql://%DB_USER%:%PG_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%?schema=public"
  echo AUTH_SECRET="%AUTH_SECRET%"
  echo AUTH_URL="http://localhost:3000"
) > .env

echo.
echo  .env dosyasi olusturuldu.
echo.

:RUN_MIGRATE
if not exist "node_modules\" (
  echo  Bagimliliklar yukleniyor...
  call npm install
  if errorlevel 1 exit /b 1
)

echo  Prisma migration calistiriliyor...

:: Node/OneDrive kilitlemesini onlemek icin once durdur
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
timeout /t 1 >nul
del /f /q "node_modules\.prisma\client\*.tmp*" 2>nul

call npm run db:generate
if errorlevel 1 (
  echo.
  echo  UYARI: Prisma generate hatasi ^(dosya kilidi - antivirus veya acik node^).
  echo  stop.bat sonra fix-prisma.bat calistirin.
  echo.
  pause
  exit /b 1
)

call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo  migrate deploy basarisiz. Ilk kurulum icin migrate dev deneniyor...
  call npx prisma migrate dev --name init
  if errorlevel 1 (
    echo  HATA: Migration basarisiz. .env icindeki DATABASE_URL ve PostgreSQL servisini kontrol edin.
    pause
    exit /b 1
  )
)

echo.
echo  ========================================
echo   Kurulum tamamlandi!
echo   Simdi start.bat ile projeyi baslatin.
echo   http://localhost:3000/register
echo  ========================================
echo.
pause
