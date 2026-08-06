param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("customer", "partner")]
  [string]$App,
  [int]$Port = 8081,
  [int[]]$BackendPorts = @(8082, 8083),
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$script:AdbCmd = "adb"
$script:AndroidSdkRoot = $null

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
    if (Test-Path $adb) {
      $script:AdbCmd = $adb
      $script:AndroidSdkRoot = $sdk
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
    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)
    if ($hasNativePref) {
      $previousNativePref = $PSNativeCommandUseErrorActionPreference
      $script:PSNativeCommandUseErrorActionPreference = $false
    }

    try {
      # Allow native tools to write warnings/notes to stderr without PowerShell
      # converting them into terminating errors.
      & $FilePath @Arguments | Out-Host
    } finally {
      if ($hasNativePref) {
        $script:PSNativeCommandUseErrorActionPreference = $previousNativePref
      }
    }

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

function Get-AdbDeviceSnapshot {
  if ($DryRun) {
    return @(@{ serial = "dry-run-device"; state = "device"; isEmulator = $false })
  }

  $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)
  if ($hasNativePref) {
    $previousNativePref = $PSNativeCommandUseErrorActionPreference
    $script:PSNativeCommandUseErrorActionPreference = $false
  }

  try {
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

  $snapshot = @()
  foreach ($line in $raw) {
    if ($line -match "^\s*$") { continue }
    if ($line -match "^List of devices attached") { continue }
    $parts = $line -split "\s+"
    if ($parts.Count -lt 2) { continue }
    $serial = $parts[0]
    $state = $parts[1]
    $snapshot += @{
      serial = $serial
      state = $state
      isEmulator = ($serial -like "emulator-*")
    }
  }
  return $snapshot
}

function Format-AdbSnapshot {
  param([object[]]$Snapshot)

  if ($null -eq $Snapshot -or $Snapshot.Count -eq 0) {
    return "none"
  }

  return (($Snapshot | ForEach-Object { "$($_.serial) [$($_.state)]" }) -join ", ")
}

function Wait-ForPhysicalDevice {
  param(
    [int]$Attempts = 6,
    [int]$DelaySeconds = 2
  )

  for ($i = 1; $i -le $Attempts; $i++) {
    $snapshot = Get-AdbDeviceSnapshot
    $devices = @($snapshot | Where-Object { $_.state -eq "device" } | ForEach-Object { $_.serial })
    $physicalDevices = @($devices | Where-Object { $_ -notlike "emulator-*" })
    if ($physicalDevices.Count -gt 0) {
      return @{
        found = $true
        device = $physicalDevices[0]
        snapshot = $snapshot
      }
    }

    if ($i -lt $Attempts) {
      Start-Sleep -Seconds $DelaySeconds
    }
  }

  return @{
    found = $false
    device = $null
    snapshot = (Get-AdbDeviceSnapshot)
  }
}

function Restart-AdbServer {
  if ($DryRun) { return }
  try { & $script:AdbCmd kill-server 1>$null 2>$null } catch {}
  Start-Sleep -Seconds 1
  try { & $script:AdbCmd start-server 1>$null 2>$null } catch {}
}

function Stop-ConnectedEmulators {
  param([string[]]$EmulatorSerials)

  if ($DryRun) {
    Write-Step "Dry run: would stop connected emulators: $($EmulatorSerials -join ', ')"
    return
  }

  foreach ($serial in $EmulatorSerials) {
    if ([string]::IsNullOrWhiteSpace($serial)) { continue }
    Write-Step "Stopping connected emulator: $serial"
    try {
      & $script:AdbCmd -s $serial emu kill 1>$null 2>$null
    } catch {}
  }
}

function Get-EmulatorCmd {
  if ($DryRun) {
    return "emulator"
  }

  if (-not [string]::IsNullOrWhiteSpace($script:AndroidSdkRoot)) {
    $sdkEmulator = Join-Path $script:AndroidSdkRoot "emulator\emulator.exe"
    if (Test-Path $sdkEmulator) {
      return $sdkEmulator
    }
  }

  $emulatorCmd = Get-Command "emulator" -ErrorAction SilentlyContinue
  if ($emulatorCmd) {
    return $emulatorCmd.Source
  }

  return $null
}

function Get-AvdManagerCmd {
  if ($DryRun) {
    return "avdmanager"
  }

  if (-not [string]::IsNullOrWhiteSpace($script:AndroidSdkRoot)) {
    $sdkAvdManager = Join-Path $script:AndroidSdkRoot "cmdline-tools\latest\bin\avdmanager.bat"
    if (Test-Path $sdkAvdManager) {
      return $sdkAvdManager
    }
  }

  $avdManagerCmd = Get-Command "avdmanager" -ErrorAction SilentlyContinue
  if ($avdManagerCmd) {
    return $avdManagerCmd.Source
  }

  return $null
}

function Get-AvdNames {
  param([string]$EmulatorCmd, [string]$AvdManagerCmd)

  $names = @()

  if (-not [string]::IsNullOrWhiteSpace($EmulatorCmd)) {
    try {
      $emulatorAvds = & $EmulatorCmd -list-avds 2>$null
      if ($LASTEXITCODE -eq 0) {
        $names += @($emulatorAvds | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
      }
    } catch {}
  }

  if ($names.Count -eq 0 -and -not [string]::IsNullOrWhiteSpace($AvdManagerCmd)) {
    try {
      $avdListOutput = & $AvdManagerCmd list avd 2>$null
      if ($LASTEXITCODE -eq 0) {
        $parsed = @(
          $avdListOutput |
            Where-Object { $_ -match "^\s*Name:\s+" } |
            ForEach-Object { ($_ -replace "^\s*Name:\s+", "").Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        )
        $names += $parsed
      }
    } catch {}
  }

  $uniqueNames = @($names | Select-Object -Unique)
  return ,$uniqueNames
}

function Try-CreateDefaultAvd {
  param([string]$AvdManagerCmd)

  if ($DryRun) {
    Write-Step "Dry run: would create default AVD profile."
    return $true
  }

  if ([string]::IsNullOrWhiteSpace($AvdManagerCmd)) {
    Write-Step "avdmanager not found; cannot auto-create AVD."
    return $false
  }

  $defaultAvdName = "Lexho_Auto_API30"
  $defaultImage = "system-images;android-30;google_apis;x86"
  Write-Step "No AVD found for current user. Creating default AVD: $defaultAvdName"

  # Pipe "no" to avoid custom hardware profile prompt.
  & cmd /c "echo no|`"$AvdManagerCmd`" create avd -n $defaultAvdName -k `"$defaultImage`" -d pixel" 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Step "Auto-create AVD failed. Ensure system image exists: $defaultImage"
    return $false
  }

  Write-Step "Created AVD: $defaultAvdName"
  return $true
}

function Try-StartEmulatorAndWait {
  if ($DryRun) {
    Write-Step "Dry run: would start emulator and wait for adb device."
    return "dry-run-device"
  }

  $emulatorCmd = Get-EmulatorCmd
  if ([string]::IsNullOrWhiteSpace($emulatorCmd)) {
    Write-Step "Emulator binary not found. Install Android Emulator from Android SDK Manager."
    return $null
  }

  $avdManagerCmd = Get-AvdManagerCmd
  $avds = Get-AvdNames -EmulatorCmd $emulatorCmd -AvdManagerCmd $avdManagerCmd
  if ($avds.Count -eq 0) {
    $created = Try-CreateDefaultAvd -AvdManagerCmd $avdManagerCmd
    if ($created) {
      Start-Sleep -Seconds 1
      $avds = Get-AvdNames -EmulatorCmd $emulatorCmd -AvdManagerCmd $avdManagerCmd
    }
  }

  if ($avds.Count -eq 0) {
    Write-Step "No Android Virtual Device (AVD) found. Create one in Android Studio Device Manager."
    return $null
  }

  $selectedAvd = if ($avds -is [string]) { $avds } else { $avds[0] }
  Write-Step "Starting emulator AVD: $selectedAvd"
  Start-Process -FilePath $emulatorCmd -ArgumentList @("-avd", $selectedAvd) -WindowStyle Hidden | Out-Null

  # Wait up to 2 minutes for emulator to appear as a ready adb device.
  for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    $snapshot = Get-AdbDeviceSnapshot
    $readyEmulators = @(
      $snapshot |
        Where-Object { $_.state -eq "device" -and $_.serial -like "emulator-*" } |
        ForEach-Object { $_.serial }
    )
    if ($readyEmulators.Count -gt 0) {
      Write-Step "Emulator ready: $($readyEmulators[0])"
      return $readyEmulators[0]
    }
  }

  Write-Step "Emulator launch timed out before adb reported a ready device."
  return $null
}

function Get-PhysicalDeviceOrThrow {
  if ($DryRun) {
    return "dry-run-device"
  }

  $firstTry = Wait-ForPhysicalDevice -Attempts 4 -DelaySeconds 1
  if ($firstTry.found) {
    Write-Step "Using connected physical device: $($firstTry.device)"
    return $firstTry.device
  }

  Write-Step "No physical device detected. adb snapshot: $(Format-AdbSnapshot -Snapshot $firstTry.snapshot)"
  Write-Step "Restarting adb server, reconnecting USB devices, and retrying."
  Restart-AdbServer
  try { & $script:AdbCmd reconnect 1>$null 2>$null } catch {}
  Start-Sleep -Seconds 1

  $secondTry = Wait-ForPhysicalDevice -Attempts 8 -DelaySeconds 2
  if ($secondTry.found) {
    Write-Step "Using connected physical device after adb restart: $($secondTry.device)"
    return $secondTry.device
  }

  $snapshot = $secondTry.snapshot
  $devices = @($snapshot | Where-Object { $_.state -eq "device" } | ForEach-Object { $_.serial })

  $allowEmulatorFallback = $false
  if ($env:RN_ALLOW_EMULATOR_FALLBACK -eq "1") {
    $allowEmulatorFallback = $true
  }

  $emulatorDevices = @($devices | Where-Object { $_ -like "emulator-*" })
  if ($emulatorDevices.Count -gt 0) {
    if ($allowEmulatorFallback) {
      Write-Step "Physical device not found. Falling back to connected emulator: $($emulatorDevices[0])"
      return $emulatorDevices[0]
    }
    Write-Step "Physical device not found. Emulator fallback is disabled by default (set RN_ALLOW_EMULATOR_FALLBACK=1 to enable)."
    Stop-ConnectedEmulators -EmulatorSerials $emulatorDevices
  } elseif ($allowEmulatorFallback) {
    Write-Step "No physical device detected. Attempting to start an Android emulator fallback."
    $startedEmulator = Try-StartEmulatorAndWait
    if (-not [string]::IsNullOrWhiteSpace($startedEmulator)) {
      Write-Step "Using emulator fallback device: $startedEmulator"
      return $startedEmulator
    }
  }

  $otherStates = @(
    $snapshot |
      Where-Object { $_.state -ne "device" } |
      ForEach-Object { "$($_.serial) [$($_.state)]" }
  )
  if ($otherStates.Count -gt 0) {
    throw "No ready physical Android device detected. adb found: $($otherStates -join ', '). If state is unauthorized, unlock phone and accept USB debugging prompt, then run: adb devices -l"
  }

  throw "No physical Android device detected in adb. Connect phone with USB debugging enabled and run: adb devices -l"
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
}

$shortRoot = if ($App -eq "partner") { "C:\lxp" } else { "C:\lxc" }
$targetProjectDir = $projectDir
if (-not $DryRun) {
  # Default to short path mode on Windows. Native CMake/Ninja builds can still
  # hit 260-char limits in some toolchains even when LongPathsEnabled=1.
  # Set RN_USE_SHORTPATH=0 to force real project path mode.
  $useShortPath = $true
  if ($env:RN_USE_SHORTPATH -eq "0") {
    $useShortPath = $false
  }
  if ($useShortPath) {
    if (-not (Test-Path $shortRoot)) {
      Write-Step "Creating short project link: $shortRoot -> $projectDir"
      & cmd /c "mklink /J `"$shortRoot`" `"$projectDir`"" 1>$null 2>$null
    }
    if (Test-Path $shortRoot) {
      $targetProjectDir = $shortRoot
      Write-Step "Using short project path: $targetProjectDir"
    } else {
      Write-Step "Warning: short project path link was not available; using real project path."
    }
  } else {
    Write-Step "Using real project path (RN_USE_SHORTPATH=0)."
  }

  $env:GRADLE_USER_HOME = Join-Path $env:USERPROFILE ".gradle"
  # Ensure child scripts keep the same short-path decision.
  $env:RN_USE_SHORTPATH = if ($useShortPath) { "1" } else { "0" }
  Write-Step "Using GRADLE_USER_HOME=$($env:GRADLE_USER_HOME)"
}

Write-Step "Project: $targetProjectDir"
$targetDevice = Get-PhysicalDeviceOrThrow
Write-Step "Target device: $targetDevice"

if (Test-PortListening -PortNumber $Port) {
  Stop-PortProcess -PortNumber $Port
  Start-Sleep -Seconds 1
}

Write-Step "Starting Metro in a new terminal with script 'start'."
if (-not $DryRun) {
  # Keep Metro on real path to avoid module identity issues with junction paths.
  Start-Process -FilePath "powershell" -WorkingDirectory $projectDir -ArgumentList @(
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

$androidScript = "android"
if ($env:RN_FORCE_ANDROID_SHORTPATH -eq "1") {
  $androidScript = "android:run:shortpath"
  Write-Step "Using forced shortpath android runner (RN_FORCE_ANDROID_SHORTPATH=1)."
} elseif ($useShortPath) {
  Write-Step "Using direct android runner from selected short project path."
} else {
  Write-Step "Using direct android runner to avoid nested drive remap conflicts."
}

$androidWorkingDirectory = if ($androidScript -eq "android:run:shortpath") { $projectDir } else { $targetProjectDir }
$androidExit = Invoke-Step -FilePath "npm" -Arguments @("run", $androidScript, "--", "--no-packager", "--device", $targetDevice) -WorkingDirectory $androidWorkingDirectory
if ($androidExit -ne 0) {
  throw "Android run failed with exit code $androidExit"
}

Write-Step "Android launch command completed."
