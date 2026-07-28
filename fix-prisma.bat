@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo.
echo  PingOf - Prisma Onarimi
echo  =======================
echo.

echo  [1/4] Calisan Node surecleri durduruluyor...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  taskkill /PID %%a /F >nul 2>&1
)
taskkill /IM node.exe /F >nul 2>&1
timeout /t 2 >nul

echo  [2/4] Gecici Prisma dosyalari temizleniyor...
if exist "node_modules\.prisma\client\*.tmp*" (
  del /f /q "node_modules\.prisma\client\*.tmp*" 2>nul
)

echo  [3/4] Prisma client yeniden olusturuluyor...
echo.
echo  Not: Antivirus veya acik dev sunucusu dosyayi kilitleyebilir.
echo  Once stop.bat calistirdiginizden emin olun.
echo.

call npm run db:generate
if errorlevel 1 (
  echo.
  echo  HATA: Prisma generate basarisiz.
  echo.
  echo  Cozum onerileri:
  echo   1. stop.bat calistir, fix-prisma.bat tekrar calistir
  echo   2. Bu dosyaya sag tik ^> Yonetici olarak calistir
  echo   3. Windows Guvenligi gecici kapali iken tekrar dene
  echo   4. Cursor/VS Code kapali iken tekrar dene
  echo.
  pause
  exit /b 1
)

echo  [4/4] Temizlik...
del /f /q "node_modules\.prisma\client\*.tmp*" 2>nul

echo.
echo  Prisma client hazir!
echo  Simdi setup-db.bat veya start.bat calistirabilirsiniz.
echo.
pause
