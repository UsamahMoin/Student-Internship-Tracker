@echo off
:: Windows launcher — double-click to start StudentTrack
cd /d "%~dp0"
where python >nul 2>&1 && python launch.py || py launch.py
pause
