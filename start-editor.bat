@echo off
REM Launcher Web Editor Loker Drafter
REM Klik dua kali file ini untuk menjalankan editor.
cd /d "%~dp0"
set PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe
if not exist "%PY%" set PY=python
echo Menjalankan Loker Drafter Web Editor...
echo Buka browser ke: http://localhost:5000
"%PY%" app.py
pause
