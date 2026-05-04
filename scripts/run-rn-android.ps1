param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("customer", "partner")]
  [string]$App,
  [int]$Port = 8081,
  [int[]]$BackendPorts = @(8082),
  [string]$PreferredAvd = "P",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$script:AdbCmd = "adb"
$script:EmulatorCmd = "emulator"

function Write-Step {
  param([string]$Message)
  Write-Host "[mobile:$App] $Message"
}

function Resolve-AndroidTooling {
  $sdkCandidates = @(
    $env:ANDROID_SDK_ROOT,
    $env:ANDROID_HOME,
    (Join-Path $env:LOCALAPPDATA "Android\Sdk")
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

  foreach ($sdk in $sdkCandidates) {
    $adb = Join-Path $sdk "platform-tools\adb.exe"
    $emu = Join-Path $sdk "emulator\emulator.exe"
    if ((Test-Path $adb) -and (Test-Path $emu)) {
      $script:AdbCmd = $adb
      $script:EmulatorCmd = $emu
      Write-Step "Using Android SDK tools from: $sdk"
      return
    }
  }
}

function Test-LongPathsEnabled {
  try {
    $value = Get-ItemPropertyValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction Stop
    return ($value -eq 1)
  } catch {
    return $false
  }
}

function Invoke-Step {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  $cmd = "$FilePath $($Arguments -join ' ')"
  Write-Step "$cmd (cwd: $WorkingDirectory)"
  if ($DryRun) {
    return 0
  }

  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments 2>&1 | ForEach-Object { $_ | Out-Host }
    $exitCode = $LASTEXITCODE
    if ($null -eq $exitCode) {
      $exitCode = 0
    }
    return [int]$exitCode
  } finally {
    Pop-Location
  }
}

function Test-PortListening {
  param([int]$PortNumber)
  try {
    $conns = Get-NetTCPConnection -LocalPort $PortNumber -State Listen -ErrorAction Stop
    return ($null -ne $conns)
  } catch {
    return $false
  }
}

function Show-BackendPortStatus {
  param([int[]]$Ports)

  foreach ($backendPort in $Ports) {
    if (Test-PortListening -PortNumber $backendPort) {
      Write-Step "Backend port $backendPort is listening on host machine."
    } else {
      Write-Step "Warning: nothing is listening on backend port $backendPort (host)."
    }
  }
}

function Stop-PortProcess {
  param([int]$PortNumber)
  try {
    $connections = Get-NetTCPConnection -LocalPort $PortNumber -State Listen -ErrorAction Stop
    if ($null -eq $connections) { return }
    $pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($pid in $pids) {
      if ($pid -gt 0) {
        Write-Step "Stopping process on port $PortNumber (PID: $pid)"
        if (-not $DryRun) {
          Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
      }
    }
  } catch {
    return
  }
}

function Get-ConnectedDevices {
  if ($DryRun) {
    return @("dry-run-device")
  }

  $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)
  if ($hasNativePref) {
    $previousNativePref = $PSNativeCommandUseErrorActionPreference
    $script:PSNativeCommandUseErrorActionPreference = $false
  }

  try {
    # adb may print daemon startup lines to stderr on first run; treat those as non-fatal.
    & $script:AdbCmd start-server 1>$null 2>$null
    $raw = & $script:AdbCmd devices 2>$null
    if ($LASTEXITCODE -ne 0) {
      return @()
    }
  } catch {
    return @()
  } finally {
    if ($hasNativePref) {
      $script:PSNativeCommandUseErrorActionPreference = $previousNativePref
    }
  }

  $devices = @()
  foreach ($line in $raw) {
    if ($line -match "^\s*$") { continue }
    if ($line -match "^List of devices attached") { continue }
    if ($line -match "\tdevice$") {
      $devices += ($line -split "\t")[0]
    }
  }
  return $devices
}

function Restart-AdbServer {
  if ($DryRun) { return }
  try { & $script:AdbCmd kill-server 1>$null 2>$null } catch {}
  Start-Sleep -Seconds 1
  try { & $script:AdbCmd start-server 1>$null 2>$null } catch {}
}

function Wait-ForAnyEmulatorSerial {
  param(
    [int]$MaxAttempts = 60,
    [int]$DelaySeconds = 3
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $devices = Get-ConnectedDevices
    $emulators = @($devices | Where-Object { $_ -like "emulator-*" })
    if ($emulators.Count -gt 0) {
      return $emulators[0]
    }

    if ($attempt % 4 -eq 0) {
      Write-Step "Still waiting for emulator to appear in adb (attempt $attempt/$MaxAttempts), restarting adb server."
      Restart-AdbServer
    } else {
      Write-Step "Waiting for emulator serial in adb (attempt $attempt/$MaxAttempts)..."
    }
    Start-Sleep -Seconds $DelaySeconds
  }

  return $null
}

function Show-AdbDiagnostics {
  if ($DryRun) { return }
  Write-Step "adb diagnostics:"
  try { & $script:AdbCmd version 2>&1 | ForEach-Object { Write-Step "  $_" } } catch {}
  try { & $script:AdbCmd devices -l 2>&1 | ForEach-Object { Write-Step "  $_" } } catch {}
  try {
    $emu = Get-Process -Name "qemu-system-x86_64","emulator64-crash-service","emulator" -ErrorAction SilentlyContinue
    if ($emu) {
      $emu | Select-Object Id, ProcessName, StartTime | ForEach-Object {
        Write-Step ("  emulator process: PID={0} Name={1} Started={2}" -f $_.Id, $_.ProcessName, $_.StartTime)
      }
    } else {
      Write-Step "  no emulator process found."
    }
  } catch {}
}

function Wait-ForEmulatorBootCompleted {
  param(
    [string]$Serial,
    [int]$MaxAttempts = 40,
    [int]$DelaySeconds = 3
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      $boot = (& $script:AdbCmd -s $Serial shell getprop sys.boot_completed 2>$null | Select-Object -First 1).Trim()
      if ($LASTEXITCODE -eq 0 -and $boot -eq "1") {
        return $true
      }
    } catch {}
    Start-Sleep -Seconds $DelaySeconds
  }

  return $false
}

function Start-EmulatorIfNeeded {
  param([string]$PreferredAvdName)

  $targetAvd = $PreferredAvdName
  if ([string]::IsNullOrWhiteSpace($targetAvd)) {
    $targetAvd = "P"
  }
  if ($DryRun) {
    Write-Step "Dry run: selecting emulator target '$targetAvd'."
    return "dry-run-device"
  }

  function Get-RunningEmulatorSerialByAvdName {
    param([string]$AvdName)
    $devices = Get-ConnectedDevices
    foreach ($device in $devices) {
      if (-not $device.StartsWith("emulator-")) { continue }
      try {
        $name = (& $script:AdbCmd -s $device emu avd name 2>$null | Select-Object -First 1)
        if ($LASTEXITCODE -eq 0 -and $name -eq $AvdName) {
          return $device
        }
      } catch {
        continue
      }
    }
    return $null
  }

  $existingPreferred = Get-RunningEmulatorSerialByAvdName -AvdName $targetAvd
  if ($existingPreferred) {
    Write-Step "Using running emulator '$targetAvd' ($existingPreferred)"
    return $existingPreferred
  }

  $devices = Get-ConnectedDevices
  if ($devices.Count -gt 0) {
    $emulators = @($devices | Where-Object { $_ -like "emulator-*" })
    if ($emulators.Count -gt 0) {
      Write-Step "Preferred AVD '$targetAvd' not running; using emulator $($emulators[0])."
      return $emulators[0]
    }
  }

  $avds = & $script:EmulatorCmd -list-avds 2>$null
  if ($LASTEXITCODE -ne 0 -or $avds.Count -eq 0) {
    throw "No Android device connected and no AVD found. Open emulator or connect USB device."
  }

  $avd = $null
  if ($avds -contains $targetAvd) {
    $avd = $targetAvd
  } else {
    $avd = $avds[0]
    Write-Step "Preferred AVD '$targetAvd' not found. Falling back to '$avd'."
  }

  Write-Step "Starting emulator: $avd"
  $emulatorProcess = $null
  if (-not $DryRun) {
    $emulatorProcess = Start-Process -FilePath $script:EmulatorCmd -ArgumentList @(
      "-avd", $avd,
      "-no-snapshot-load",
      "-netdelay", "none",
      "-netspeed", "full"
    ) -PassThru
    Start-Sleep -Seconds 4
    if ($emulatorProcess -and $emulatorProcess.HasExited) {
      throw "Emulator process exited immediately (exit code: $($emulatorProcess.ExitCode)). Open AVD Manager and start '$avd' once manually."
    }
  }

  if ($DryRun) {
    return "dry-run-device"
  }

  Write-Step "Waiting for emulator registration in adb..."
  $serial = Wait-ForAnyEmulatorSerial
  if (-not $serial) {
    Show-AdbDiagnostics
    throw "Emulator started but no emulator serial detected in adb."
  }

  Write-Step "Emulator detected as $serial. Waiting for boot completion..."
  $booted = Wait-ForEmulatorBootCompleted -Serial $serial
  if (-not $booted) {
    Write-Step "Warning: emulator did not report boot completion in time; continuing anyway."
  }

  $namedSerial = Get-RunningEmulatorSerialByAvdName -AvdName $avd
  if ($namedSerial) {
    return $namedSerial
  }

  $serial = Get-RunningEmulatorSerialByAvdName -AvdName $avd
  if ($serial) {
    return $serial
  }

  $updatedDevices = Get-ConnectedDevices
  $fallbackEmulator = @($updatedDevices | Where-Object { $_ -like "emulator-*" } | Select-Object -First 1)
  if ($fallbackEmulator.Count -gt 0) {
    return $fallbackEmulator[0]
  }

  throw "Emulator started but no emulator serial detected."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectDir = Join-Path $repoRoot "apps\$App\legacy-mobile"

if (-not (Test-Path $projectDir)) {
  throw "Project not found: $projectDir"
}

if (-not $DryRun) {
  Resolve-AndroidTooling

  if (-not (Test-LongPathsEnabled)) {
    Write-Step "Warning: Windows long paths are disabled. Enable 'LongPathsEnabled=1' to avoid 260-char path errors."
  }

  if (-not (Get-Command $script:AdbCmd -ErrorAction SilentlyContinue)) {
    throw "adb not found in PATH. Install Android platform-tools and reopen terminal."
  }

  if (-not (Get-Command $script:EmulatorCmd -ErrorAction SilentlyContinue)) {
    Write-Step "emulator command not found in PATH; will continue if a device is already connected."
  }
}

$shortRoot = if ($App -eq "partner") { "C:\lxp" } else { "C:\lxc" }
$targetProjectDir = $projectDir
if (-not $DryRun) {
  if (-not (Test-Path $shortRoot)) {
    Write-Step "Creating short project link: $shortRoot -> $projectDir"
    & cmd /c "mklink /J `"$shortRoot`" `"$projectDir`"" 1>$null 2>$null
  }
  if (Test-Path $shortRoot) {
    $targetProjectDir = $shortRoot
  }

  $env:GRADLE_USER_HOME = "C:\.gradle"
  Write-Step "Using GRADLE_USER_HOME=$($env:GRADLE_USER_HOME)"
}

Write-Step "Project: $targetProjectDir"
$targetDevice = Start-EmulatorIfNeeded -PreferredAvdName $PreferredAvd
Write-Step "Target device: $targetDevice"

if (Test-PortListening -PortNumber $Port) {
  Stop-PortProcess -PortNumber $Port
  Start-Sleep -Seconds 1
}

Write-Step "Starting Metro in a new terminal with script 'start'."
if (-not $DryRun) {
  Start-Process -FilePath "powershell" -WorkingDirectory $targetProjectDir -ArgumentList @(
    "-NoExit",
    "-Command",
    "npm run start -- --reset-cache"
  ) | Out-Null
}
Start-Sleep -Seconds 3

$reverseExit = Invoke-Step -FilePath $script:AdbCmd -Arguments @("-s", $targetDevice, "reverse", "tcp:$Port", "tcp:$Port") -WorkingDirectory $targetProjectDir
if ($reverseExit -ne 0) {
  Write-Step "adb reverse failed, continuing."
}

Show-BackendPortStatus -Ports $BackendPorts
foreach ($backendPort in $BackendPorts | Select-Object -Unique) {
  if ($backendPort -eq $Port) { continue }
  $backendReverseExit = Invoke-Step -FilePath $script:AdbCmd -Arguments @("-s", $targetDevice, "reverse", "tcp:$backendPort", "tcp:$backendPort") -WorkingDirectory $targetProjectDir
  if ($backendReverseExit -ne 0) {
    Write-Step "adb reverse failed for backend port $backendPort, continuing."
  }
}

$androidExit = Invoke-Step -FilePath "npm" -Arguments @("run", "android:run:shortpath", "--", "--deviceId", $targetDevice) -WorkingDirectory $targetProjectDir
if ($androidExit -ne 0) {
  throw "Android run failed with exit code $androidExit"
}

Write-Step "Android launch command completed."
