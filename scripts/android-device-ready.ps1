function Wait-AndroidDeviceReady {
  param(
    [Parameter(Mandatory = $true)][string]$Adb,
    [Parameter(Mandatory = $true)][string]$Serial,
    [int]$TimeoutSeconds = 240
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastStatus = "No response from Android"
  do {
    # ADB transport and boot_completed alone do not guarantee that Android's
    # package manager is running and can install an APK.
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $boot = & $Adb -s $Serial shell getprop sys.boot_completed 2>$null
      $bootExit = $LASTEXITCODE
      $package = & $Adb -s $Serial shell pm path android 2>$null
      $packageExit = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorPreference
    }
    if ($bootExit -eq 0 -and "$boot".Trim() -eq "1" -and
        $packageExit -eq 0 -and @($package | Where-Object { $_ -match '^package:.+' }).Count -gt 0) {
      Write-Host "Android package manager ready: $Serial"
      return
    }
    $lastStatus = "boot='$boot' (exit $bootExit), package='$package' (exit $packageExit)"
    if ((Get-Date) -ge $deadline) { break }
    Write-Host "Waiting for Android boot and package manager: $Serial"
    Start-Sleep -Seconds 5
  } while ($true)
  throw "Android device $Serial did not become ready within $TimeoutSeconds seconds: $lastStatus. For an emulator, use Android Studio Device Manager's Cold Boot Now and retry."
}
