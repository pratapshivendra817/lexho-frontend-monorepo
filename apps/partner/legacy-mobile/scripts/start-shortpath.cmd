@echo off
setlocal

set "DRIVE_LETTER=Y:"
set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "TARGET_DIR=%PROJECT_DIR%"

subst %DRIVE_LETTER% /D >nul 2>nul
subst %DRIVE_LETTER% "%PROJECT_DIR%" >nul 2>nul
if exist %DRIVE_LETTER%\ (
  set "TARGET_DIR=%DRIVE_LETTER%\"
)
cd /d "%TARGET_DIR%"
call npx react-native start %*
set "EXIT_CODE=%ERRORLEVEL%"

cd /d "%PROJECT_DIR%"
subst %DRIVE_LETTER% /D >nul 2>nul
exit /b %EXIT_CODE%
