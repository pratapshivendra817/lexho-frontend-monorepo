param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("customer", "partner", "both")]
  [string]$App,
  [int]$Port = 0,
  [string]$DeviceId,
  [string]$WirelessAddress,
  [int[]]$BackendPorts = @(8082, 8083),
  [int]$WebsitePort = 5173,
  [switch]$CleanNativeCache,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$script:AdbCmd = "adb"
$script:AndroidSdkRoot = $null
. (Join-Path $PSScriptRoot "android-device-ready.ps1")

if ($DeviceId -like "emulator-*") {
  throw "Customer and partner phone commands require a physical Android phone. Connect it with USB debugging enabled and select its adb serial."
}

if ($Port -eq 0) {
  $Port = if ($App -eq "partner") { 8084 } else { 8081 }
}

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
    foreach ($processId in $pids) {
      if ($processId -gt 0) {
        Write-Step "Stopping process on port $PortNumber (PID: $processId)"
        if (-not $DryRun) {
          Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
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

function Connect-WirelessDevice {
  param([string]$Address)

  if ([string]::IsNullOrWhiteSpace($Address)) {
    return
  }

  $endpoint = $Address.Trim()
  if ($endpoint -notmatch ":\d+$") {
    $endpoint = "$endpoint`:5555"
  }

  Write-Step "Connecting to wireless Android device: $endpoint"
  if ($DryRun) {
    return $endpoint
  }

  $output = & $script:AdbCmd connect $endpoint 2>&1
  if ($LASTEXITCODE -ne 0 -or ($output -join " ") -notmatch "connected|already connected") {
    throw "Could not connect to wireless Android device $endpoint. Pair/enable Wireless debugging first and verify the phone IP address. adb output: $($output -join ' ')"
  }

  return $endpoint
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

  Write-Step "Phone commands require a physical device; emulator fallback is disabled."

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
if ($App -eq "both") {
  if ($PSBoundParameters.ContainsKey("Port")) {
    throw "For both apps, ports are fixed: customer 8081 and partner 8084."
  }
  Resolve-AndroidTooling
  Connect-WirelessDevice -Address $WirelessAddress | Out-Null
  if ([string]::IsNullOrWhiteSpace($DeviceId)) {
    $DeviceId = Get-PhysicalDeviceOrThrow
  }
  foreach ($mobileApp in @("customer", "partner")) {
    # Separate processes isolate Gradle and short-path environment settings.
    $quotedScript = $PSCommandPath.Replace("'", "''")
    $quotedDevice = $DeviceId.Replace("'", "''")
    $quotedWirelessAddress = $WirelessAddress.Replace("'", "''")
    $backendArray = "@(" + ($BackendPorts -join ",") + ")"
    $childCommand = "& '$quotedScript' -App $mobileApp -DeviceId '$quotedDevice' -WirelessAddress '$quotedWirelessAddress' -WebsitePort $WebsitePort -BackendPorts $backendArray"
    if ($DryRun) { $childCommand += " -DryRun" }
    & powershell -NoProfile -ExecutionPolicy Bypass -Command $childCommand
    if ($LASTEXITCODE -ne 0) { throw "$mobileApp launch failed." }
  }
  Write-Step "Both apps launched on $DeviceId. Customer Metro: 8081; partner Metro: 8084."
  exit 0
}
$projectDir = Join-Path $repoRoot "apps\$App\legacy-mobile"

if (-not (Test-Path $projectDir)) {
  throw "Project not found: $projectDir"
}

if (-not $DryRun) {
  Resolve-AndroidTooling

  Connect-WirelessDevice -Address $WirelessAddress | Out-Null

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

# Use -CleanNativeCache when switching between real and short project paths.
# Native CMake caches are not portable across the real project path and the
# short junction path. A partially-written fingerprint can make Gradle fail
# with `unrecognized RECORD_NOT_SET` before compilation starts. Remove only
# generated .cxx directories; source files and Gradle caches are untouched.
if (-not $DryRun -and $CleanNativeCache) {
  $nativeCxxDirs = Get-ChildItem -LiteralPath (Join-Path $targetProjectDir "node_modules") -Directory -Filter ".cxx" -Recurse -Force -ErrorAction SilentlyContinue
  foreach ($nativeCxxDir in $nativeCxxDirs) {
    $nativeCacheRoot = [IO.Path]::GetFullPath((Join-Path $targetProjectDir "node_modules")) + [IO.Path]::DirectorySeparatorChar
    $nativeCachePath = [IO.Path]::GetFullPath($nativeCxxDir.FullName)
    if (-not $nativeCachePath.StartsWith($nativeCacheRoot, [StringComparison]::OrdinalIgnoreCase) -or $nativeCxxDir.Name -ne ".cxx") {
      throw "Refusing to remove native cache outside project node_modules: $nativeCachePath"
    }
    Write-Step "Removing stale native cache: $($nativeCxxDir.FullName)"
    Remove-Item -LiteralPath $nativeCxxDir.FullName -Recurse -Force -ErrorAction Stop
  }
}

$targetDevice = if ([string]::IsNullOrWhiteSpace($DeviceId)) { Get-PhysicalDeviceOrThrow } else { $DeviceId }
if (-not $DryRun -and $targetDevice -notin @(Get-ConnectedDevices)) {
  throw "Selected Android device is not ready: $targetDevice"
}
Write-Step "Target device: $targetDevice"
if (-not $DryRun) {
  Wait-AndroidDeviceReady -Adb $script:AdbCmd -Serial $targetDevice
}

if (Test-PortListening -PortNumber $Port) {
  Stop-PortProcess -PortNumber $Port
  Start-Sleep -Seconds 1
}

Write-Step "Starting Metro in a visible PowerShell window on port $Port. Press r there to reload $App."
if (-not $DryRun) {
  # Keep Metro on real path to avoid module identity issues with junction paths.
  # Inherit the new console's input/output so Metro enables keyboard shortcuts.
  $metroCommand = "`$Host.UI.RawUI.WindowTitle = 'Lexho $App Metro - $Port'; npm run start -- --reset-cache --port $Port"
  Start-Process -FilePath "powershell" -WindowStyle Normal -WorkingDirectory $projectDir -ArgumentList @(
    "-NoProfile",
    "-NoExit",
    "-Command",
    $metroCommand
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

if ($App -eq "customer") {
  # The in-app legal website uses localhost:5173 on the Android device.
  # WebsitePort can point it to Vite's fallback port on the development machine.
  $websiteReverseExit = Invoke-Step -FilePath $script:AdbCmd -Arguments @("-s", $targetDevice, "reverse", "tcp:5173", "tcp:$WebsitePort") -WorkingDirectory $targetProjectDir
  if ($websiteReverseExit -ne 0) {
    Write-Step "adb reverse failed for website port $WebsitePort, continuing."
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
$androidExit = Invoke-Step -FilePath "npm" -Arguments @("run", $androidScript, "--", "--no-packager", "--port", "$Port", "--device", $targetDevice) -WorkingDirectory $androidWorkingDirectory
if ($androidExit -ne 0) {
  throw "Android run failed with exit code $androidExit"
}

Write-Step "Android launch command completed."
