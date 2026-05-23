@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "TARGET_ANDROID_DIR=%PROJECT_DIR%\android"
set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"

if /I "%RN_USE_SHORTPATH%"=="1" (
  if exist "C:\lxc\android" (
    set "TARGET_ANDROID_DIR=C:\lxc\android"
  )
)
cd /d "%TARGET_ANDROID_DIR%"
call gradlew.bat app:assembleDebug --console=plain
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%
