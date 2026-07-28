@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo.
echo  PingOf - Dev sunucu durduruluyor...
echo  ----------------------------------
echo.

powershell -NoProfile -Command ^
  "$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; " ^
  "if (-not $conns) { Write-Host '  Calisan sunucu bulunamadi (port 3000 bos).'; exit 0 }; " ^
  "$procIds = @($conns | Select-Object -ExpandProperty OwningProcess -Unique); " ^
  "foreach ($procId in $procIds) { " ^
  "  try { Stop-Process -Id $procId -Force -ErrorAction Stop; Write-Host ('  Process {0} sonlandirildi.' -f $procId) } " ^
  "  catch { Write-Host ('  Process {0} sonlandirilamadi.' -f $procId) } " ^
  "}; " ^
  "Write-Host ''; Write-Host '  PingOf durduruldu.'"

echo.
pause
