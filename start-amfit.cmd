@echo off
REM Serves AMFIT on http://localhost:8765 and opens it. Keep this window open while using the app.
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found on PATH.
  echo Install Python from https://python.org and re-run this file.
  pause
  exit /b 1
)

echo Starting AMFIT on http://localhost:8765
echo Close this window or press Ctrl+C to stop the server.
echo.
start "" http://127.0.0.1:8765
python serve.py 8765
