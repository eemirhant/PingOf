@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo.
echo  PingOf - Dev sunucu baslatiliyor...
echo  ---------------------------------
echo.

if not exist "package.json" (
  echo  HATA: package.json bulunamadi. Bu dosyayi proje kokunde calistirin.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  node_modules yok. Bagimliliklar yukleniyor...
  call npm install
  if errorlevel 1 (
    echo  HATA: npm install basarisiz.
    pause
    exit /b 1
  )
  echo.
)

if not exist ".env" (
  echo  UYARI: .env dosyasi yok.
  echo  PostgreSQL kurulumu icin setup-db.bat dosyasini calistirin.
  echo.
)

powershell -NoProfile -Command ^
  "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 1 } else { exit 0 }"

if errorlevel 1 (
  echo  Port 3000 zaten kullanimda. Proje calisiyor olabilir.
  echo  Durdurmak icin stop.bat dosyasini calistirin.
  echo.
  pause
  exit /b 1
)

start "PingOf - Dev Server" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo  Dev sunucu yeni pencerede baslatildi.
echo  Adres: http://localhost:3000
echo  Durdurmak icin stop.bat dosyasini calistirin.
echo.
timeout /t 4 >nul
