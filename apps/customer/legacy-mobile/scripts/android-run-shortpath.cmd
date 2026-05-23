@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"
set "TARGET_DIR=%PROJECT_DIR%"

if /I "%RN_USE_SHORTPATH%"=="1" (
  if exist "C:\lxc\" (
    set "TARGET_DIR=C:\lxc\"
  )
)

cd /d "%TARGET_DIR%"
call npm run android -- --no-packager %*
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%
