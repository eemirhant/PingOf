@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Yonetici yetkisi gerekir
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Bu islem yonetici yetkisi gerektirir.
  echo  Dosyaya sag tik ^> "Yonetici olarak calistir"
  echo.
  pause
  exit /b 1
)

cd /d "%~dp0"

set "PG_ROOT=C:\Program Files\PostgreSQL\17"
set "PG_BIN=%PG_ROOT%\bin"
set "PG_DATA=%PG_ROOT%\data"
set "PG_SERVICE=postgresql-x64-17"

if not exist "%PG_BIN%\initdb.exe" (
  echo  HATA: PostgreSQL 17 bulunamadi.
  echo  https://www.postgresql.org/download/windows/ adresinden kurun.
  pause
  exit /b 1
)

set "PATH=%PG_BIN%;%PATH%"

echo.
echo  PingOf - PostgreSQL Ilk Kurulum / Yeni Sifre
echo  =============================================
echo.

if exist "%PG_DATA%\PG_VERSION" (
  echo  Mevcut veritabani bulundu. Sifre sifirlama modu...
  goto RESET_PASSWORD
)

echo  PostgreSQL henuz baslatilmamis ^(data klasoru bos^).
echo  Simdi YENI bir postgres sifresi belirleyeceksiniz.
echo  Bu sifreyi bir yere not edin!
echo.
echo  Oneri: en az 8 karakter, ornek: PingOf2026!
echo.
set /p NEW_PASSWORD=Yeni postgres sifresi: 
set /p NEW_PASSWORD2=Sifre tekrar: 

if not "%NEW_PASSWORD%"=="%NEW_PASSWORD2%" (
  echo  HATA: Sifreler eslesmiyor.
  pause
  exit /b 1
)

if "%NEW_PASSWORD%"=="" (
  echo  HATA: Sifre bos olamaz.
  pause
  exit /b 1
)

echo.
echo  Veritabani dosyalari olusturuluyor...
echo  (Turkce Windows locale sorunu icin C locale kullaniliyor)

:: Onceki basarisiz kurulum kalintilarini temizle
if exist "%PG_DATA%\*" (
  for /d %%x in ("%PG_DATA%\*") do rd /s /q "%%x" 2>nul
  del /q "%PG_DATA%\*" 2>nul
)

set LC_ALL=C
set LANG=C
echo %NEW_PASSWORD%> "%TEMP%\pg_pw.txt"
initdb -D "%PG_DATA%" -U postgres -E UTF8 -A scram-sha-256 --locale=C --lc-collate=C --lc-ctype=C --pwfile="%TEMP%\pg_pw.txt"
set INIT_RESULT=%errorlevel%
del "%TEMP%\pg_pw.txt" 2>nul
set LC_ALL=
set LANG=

if not %INIT_RESULT%==0 (
  echo  HATA: initdb basarisiz.
  echo  Manuel denemek icin PowerShell ^(Yonetici^):
  echo  initdb -D "%PG_DATA%" -U postgres -E UTF8 -A scram-sha-256 --locale=C --lc-collate=C --lc-ctype=C -W
  pause
  exit /b 1
)

echo  Windows servisi kaydediliyor...
pg_ctl register -N "%PG_SERVICE%" -D "%PG_DATA%" -S auto 2>nul
sc config %PG_SERVICE% obj= "NT AUTHORITY\NetworkService" >nul 2>&1

echo  Servis baslatiliyor...
net start %PG_SERVICE%
if errorlevel 1 (
  echo  Servis baslatilamadi. services.msc uzerinden "%PG_SERVICE%" servisini manuel baslatin.
)

goto DONE

:RESET_PASSWORD
echo.
echo  Mevcut postgres sifresini sifirlamak icin gecici olarak
echo  sifresiz giris acilacak, sonra yeni sifre atanacak.
echo.
set /p NEW_PASSWORD=Yeni postgres sifresi: 
set /p NEW_PASSWORD2=Sifre tekrar: 

if not "%NEW_PASSWORD%"=="%NEW_PASSWORD2%" (
  echo  HATA: Sifreler eslesmiyor.
  pause
  exit /b 1
)

net stop %PG_SERVICE% >nul 2>&1

:: pg_hba.conf yedekle ve trust moduna al
copy /Y "%PG_DATA%\pg_hba.conf" "%PG_DATA%\pg_hba.conf.bak" >nul

powershell -NoProfile -Command ^
  "$f = '%PG_DATA%\pg_hba.conf';" ^
  "$c = Get-Content $f -Raw;" ^
  "$c = $c -replace 'scram-sha-256','trust' -replace 'md5','trust';" ^
  "Set-Content $f $c -NoNewline"

net start %PG_SERVICE%
timeout /t 2 >nul

set PGPASSWORD=
psql -U postgres -h localhost -c "ALTER USER postgres PASSWORD '%NEW_PASSWORD%';"
if errorlevel 1 (
  echo  HATA: Sifre degistirilemedi.
  copy /Y "%PG_DATA%\pg_hba.conf.bak" "%PG_DATA%\pg_hba.conf" >nul
  net stop %PG_SERVICE% >nul 2>&1
  net start %PG_SERVICE% >nul 2>&1
  pause
  exit /b 1
)

net stop %PG_SERVICE% >nul 2>&1
copy /Y "%PG_DATA%\pg_hba.conf.bak" "%PG_DATA%\pg_hba.conf" >nul
net start %PG_SERVICE% >nul 2>&1

:DONE
echo.
echo  ========================================
echo   PostgreSQL hazir!
echo   Sifreniz: (az once girdiginiz deger)
echo.
echo   Simdi setup-db.bat dosyasini calistirin.
echo  ========================================
echo.
pause
