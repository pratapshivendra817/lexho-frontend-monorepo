@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "TARGET_DIR=%PROJECT_DIR%"
set "SHORT_LINK=%USERPROFILE%\lxcust"

if not exist "%SHORT_LINK%" (
  mklink /J "%SHORT_LINK%" "%PROJECT_DIR%" >nul 2>nul
)
if exist "%SHORT_LINK%\" (
  set "TARGET_DIR=%SHORT_LINK%"
)

set "TARGET_ANDROID_DIR=%TARGET_DIR%android"

cd /d "%TARGET_ANDROID_DIR%"
call gradlew.bat app:assembleDebug --console=plain
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%
