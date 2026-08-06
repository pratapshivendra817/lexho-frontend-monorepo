@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "TARGET_ANDROID_DIR=%PROJECT_DIR%\android"
set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"
set "SHORT_DRIVE=X:"
set "USED_SUBST=0"

subst %SHORT_DRIVE% "%PROJECT_DIR%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  set "USED_SUBST=1"
  set "TARGET_ANDROID_DIR=%SHORT_DRIVE%\android"
) else (
  if /I "%RN_USE_SHORTPATH%"=="1" (
    if exist "C:\lxp\android" (
      set "TARGET_ANDROID_DIR=C:\lxp\android"
    )
  )
)

cd /d "%TARGET_ANDROID_DIR%" || goto cleanup
call gradlew.bat app:assembleDebug --console=plain
set "EXIT_CODE=%ERRORLEVEL%"

 :cleanup
if "%USED_SUBST%"=="1" (
  subst %SHORT_DRIVE% /d >nul 2>&1
)
exit /b %EXIT_CODE%
