@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "TARGET_DIR=%PROJECT_DIR%"
set "GRADLE_USER_HOME=C:\.gradle"
cd /d "%TARGET_DIR%"
call npm run android -- --no-packager
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%
