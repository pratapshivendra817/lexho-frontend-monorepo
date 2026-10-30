@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"
set "TARGET_DIR=%PROJECT_DIR%"
set "SHORT_DRIVE=X:"
set "USED_SUBST=0"

if /I "%RN_USE_SHORTPATH%"=="1" (
  rem Use the same subst-drive strategy as android-build-shortpath.cmd.
  rem Junction paths like C:\lxc can leave Gradle with projects that have no
  rem consumable variants, while the subst drive keeps native autolinking stable.
  subst %SHORT_DRIVE% "%PROJECT_DIR%" >nul 2>&1
  if %ERRORLEVEL% EQU 0 (
    set "USED_SUBST=1"
    set "TARGET_DIR=%SHORT_DRIVE%\"
  ) else (
    if exist "C:\lxc\" (
      set "TARGET_DIR=C:\lxc\"
    )
  )
)

cd /d "%TARGET_DIR%"
adb reverse tcp:5173 tcp:5173
call npm run android -- --no-packager %*
set "EXIT_CODE=%ERRORLEVEL%"

if "%USED_SUBST%"=="1" (
  subst %SHORT_DRIVE% /d >nul 2>&1
)

exit /b %EXIT_CODE%
