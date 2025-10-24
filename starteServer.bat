@echo off
setlocal
cd /d "%~dp0"

set "PORT=8080"
if exist ".env" (
  for /f "tokens=1,2 delims==" %%A in ('findstr /b /i "PORT=" ".env"') do (
    if /i "%%~A"=="PORT" (
      set "PORT=%%~B"
    )
  )
)

start "Scoreboard Server" cmd /c "npm run serve"

:: Dem Server kurz Zeit zum booten geben bevor Start
timeout /t 5 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/controller.html"

pause
