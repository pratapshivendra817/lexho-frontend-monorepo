param(
  [ValidateSet('customer', 'partner', 'both')]
  [string]$App = 'customer',
  [string]$CustomerAvd = "Lexho_Customer_API33",
  [string]$PartnerAvd = "Lexho_Partner_API33",
  [string]$SystemImage = "system-images;android-33-ext4;google_apis_playstore;x86_64",
  [ValidateSet('auto', 'software', 'host')]
  [string]$Gpu = 'auto',
  [ValidateRange(1, 20)]
  [int]$BootTimeoutMinutes = 4,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "android-device-ready.ps1")
if ($CustomerAvd -eq $PartnerAvd) { throw "Use two different AVD names so both apps have independent sessions." }
$sdkRoot = $env:ANDROID_HOME
if ($env:ANDROID_SDK_ROOT) { $sdkRoot = $env:ANDROID_SDK_ROOT }
if (-not $sdkRoot) { $sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$adb = Join-Path $sdkRoot "platform-tools\adb.exe"
$emulator = Join-Path $sdkRoot "emulator\emulator.exe"
$avdManager = Join-Path $sdkRoot "cmdline-tools\latest\bin\avdmanager.bat"
$repoRoot = Split-Path -Parent $PSScriptRoot
$targets = @(
  @{ App = "customer"; Avd = $CustomerAvd; Port = 5554 },
  @{ App = "partner"; Avd = $PartnerAvd; Port = 5556 }
)

$targets = @($targets | Where-Object { $App -eq 'both' -or $_.App -eq $App })

if (-not $DryRun) {
  foreach ($tool in @($adb, $emulator, $avdManager)) {
    if (-not (Test-Path -LiteralPath $tool)) { throw "Android SDK tool missing: $tool" }
  }
  $avds = @(& $emulator -list-avds)
  if ($LASTEXITCODE -ne 0) { throw "Could not list Android virtual devices." }
  foreach ($target in $targets) {
    if ($target.Avd -notin $avds) {
      Write-Host "Creating AVD $($target.Avd) using installed image $SystemImage"
      "no" | & $avdManager create avd -n $target.Avd -k $SystemImage -d pixel
      if ($LASTEXITCODE -ne 0) { throw "AVD creation failed. Install $SystemImage in Android Studio SDK Manager." }
    }
  }
  & $adb start-server
  if ($LASTEXITCODE -ne 0) { throw "Could not start ADB." }
  $initialDevices = @(& $adb devices)
  if ($initialDevices -match '^emulator-\d+\s+offline') {
    Write-Host "Reconnecting offline ADB transports."
    & $adb reconnect offline
    if ($LASTEXITCODE -ne 0) { throw "ADB reconnect failed. Restart ADB before launching the apps." }
  }
}

foreach ($target in $targets) {
  $serial = "emulator-$($target.Port)"
  $target.Serial = $serial
  Write-Host "[$($target.App)] AVD $($target.Avd), device $serial"
  if ($DryRun) { continue }
  $emulatorProcess = $null
  $logPrefix = Join-Path $env:TEMP "lexho-$($target.App)-emulator"
  $deviceRows = @(& $adb devices)
  if ($deviceRows -match "^$serial\s") {
    $runningAvd = @(& $adb -s $serial emu avd name)
    if ($target.Avd -notin $runningAvd) { throw "Port $($target.Port) is already used by a different AVD. Close it or use the existing device commands." }
  } else {
    # Visible windows are the interactive devices used for booking tests.
    $emulatorProcess = Start-Process -FilePath $emulator -ArgumentList @("-avd", $target.Avd, "-port", $target.Port, "-no-snapshot", "-gpu", $Gpu, "-feature", "-Vulkan", "-cores", "2", "-memory", "1536") -WindowStyle Normal -RedirectStandardOutput "$logPrefix.log" -RedirectStandardError "$logPrefix.err.log" -PassThru
    Write-Host "Emulator logs: $logPrefix.log and $logPrefix.err.log"
  }
  # Boot one device at a time to reduce simultaneous startup memory pressure.
  $deadline = (Get-Date).AddMinutes($BootTimeoutMinutes)
  do {
      if ($emulatorProcess -and $emulatorProcess.HasExited) {
        throw "Emulator $($target.Avd) exited before Android boot (exit code $($emulatorProcess.ExitCode)). Logs: $logPrefix.log and $logPrefix.err.log. Close unused apps to free RAM; try -Gpu software if graphics startup fails."
      }
      # A newly launched emulator is absent/offline briefly; stderr is expected.
      $ErrorActionPreference = "Continue"
      try {
        $boot = & $adb -s $target.Serial shell getprop sys.boot_completed 2>$null
        $bootExitCode = $LASTEXITCODE
      } finally { $ErrorActionPreference = "Stop" }
    if ($bootExitCode -eq 0 -and "$boot".Trim() -eq "1") { break }
    if ((Get-Date) -gt $deadline) { throw "Android boot timed out: $serial. Check the emulator window and logs: $logPrefix.log and $logPrefix.err.log." }
    Write-Host "Waiting for Android boot: $serial"
    Start-Sleep -Seconds 10
  } while ($true)
  Write-Host "[$($target.App)] Android boot complete."
  Wait-AndroidDeviceReady -Adb $adb -Serial $serial -TimeoutSeconds ($BootTimeoutMinutes * 60)
}

foreach ($target in $targets) {
  $launchArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "run-rn-android.ps1"), "-App", $target.App, "-DeviceId", $target.Serial)
  if ($DryRun) { $launchArgs += "-DryRun" }
  & powershell @launchArgs
  if ($LASTEXITCODE -ne 0) { throw "$($target.App) emulator launch failed." }
}
if ($DryRun) { Write-Host "Dry run completed; no devices were launched or apps installed." }
else { Write-Host "$App launch completed. Keep the backend running on port 8082." }
