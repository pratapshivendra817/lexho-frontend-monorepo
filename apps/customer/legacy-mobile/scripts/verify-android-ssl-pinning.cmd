@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"

if "%SSL_PINNING_CERT_NAME%"=="" (
  set "SSL_PINNING_CERT_NAME=lexho_api"
)

set "CERT_PATH=%PROJECT_DIR%\android\app\src\main\assets\certs\%SSL_PINNING_CERT_NAME%.cer"

if exist "%CERT_PATH%" (
  echo [ssl-pinning] Certificate found: %CERT_PATH%
  exit /b 0
)

echo [ssl-pinning] Certificate missing: %CERT_PATH%
echo [ssl-pinning] Add the production certificate before enabling SSL_PINNING_ENABLED=true.
exit /b 1
