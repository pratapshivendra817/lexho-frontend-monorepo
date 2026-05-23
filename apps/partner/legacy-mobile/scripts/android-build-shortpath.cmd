@echo off
setlocal

set "DRIVE_LETTER=Y:"
set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "TARGET_ANDROID_DIR=%PROJECT_DIR%\android"
set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"

subst %DRIVE_LETTER% /D >nul 2>nul
subst %DRIVE_LETTER% "%PROJECT_DIR%" >nul 2>nul
if exist %DRIVE_LETTER%\android (
  set "TARGET_ANDROID_DIR=%DRIVE_LETTER%\android"
)
cd /d "%TARGET_ANDROID_DIR%"
call gradlew.bat app:assembleDebug --console=plain
set "EXIT_CODE=%ERRORLEVEL%"

cd /d "%PROJECT_DIR%"
subst %DRIVE_LETTER% /D >nul 2>nul
exit /b %EXIT_CODE%
