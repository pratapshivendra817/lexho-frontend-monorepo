param(
  [string]$RepoRoot = (Resolve-Path ".").Path,
  [string]$ShortPath = "C:\src\lexho-frontend-monorepo",
  [switch]$SkipRegistry,
  [switch]$SkipJunction,
  [switch]$RunInstall,
  [switch]$RunBuild,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[longpath-migration] $Message"
}

function Invoke-CommandStep {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory = $RepoRoot
  )

  $cmd = "$FilePath $($Arguments -join ' ')"
  Write-Step "$cmd (cwd: $WorkingDirectory)"
  if ($DryRun) { return 0 }

  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments | Out-Host
    $exitCode = $LASTEXITCODE
    if ($null -eq $exitCode) { $exitCode = 0 }
    return [int]$exitCode
  } finally {
    Pop-Location
  }
}

function Test-IsAdmin {
  $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($currentUser)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Enable-RegistryLongPaths {
  if ($SkipRegistry) {
    Write-Step "Skipping registry update as requested."
    return
  }

  if (-not (Test-IsAdmin)) {
    Write-Step "Admin rights required for HKLM registry update."
    Write-Step "Run this script in an elevated PowerShell to set LongPathsEnabled=1."
    return
  }

  if ($DryRun) {
    Write-Step "Would set HKLM LongPathsEnabled=1"
    return
  }

  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -PropertyType DWord -Value 1 -Force | Out-Null
  $enabled = Get-ItemPropertyValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled"
  Write-Step "Registry LongPathsEnabled=$enabled"
}

function Enable-GitLongPaths {
  $globalCode = Invoke-CommandStep -FilePath "git" -Arguments @("config", "--global", "core.longpaths", "true")
  if ($globalCode -ne 0) {
    throw "Unable to set global git core.longpaths=true"
  }

  $localCode = Invoke-CommandStep -FilePath "git" -Arguments @("config", "--local", "core.longpaths", "true")
  if ($localCode -ne 0) {
    throw "Unable to set local git core.longpaths=true"
  }
}

function Ensure-ShortPathJunction {
  if ($SkipJunction) {
    Write-Step "Skipping short-path junction creation as requested."
    return
  }

  $parent = Split-Path -Path $ShortPath -Parent
  if (-not (Test-Path $parent)) {
    Write-Step "Creating parent directory: $parent"
    if (-not $DryRun) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  }

  if (Test-Path $ShortPath) {
    Write-Step "Short path already exists: $ShortPath"
    return
  }

  Write-Step "Creating junction: $ShortPath -> $RepoRoot"
  if (-not $DryRun) {
    New-Item -ItemType Junction -Path $ShortPath -Value $RepoRoot | Out-Null
  }
}

function Invoke-OptionalChecks {
  if ($RunInstall) {
    $installCode = Invoke-CommandStep -FilePath "npm" -Arguments @("ci")
    if ($installCode -ne 0) { throw "npm ci failed." }
  }

  if ($RunBuild) {
    $buildCode = Invoke-CommandStep -FilePath "npm" -Arguments @("run", "build")
    if ($buildCode -ne 0) { throw "npm run build failed." }
  }
}

Write-Step "Repo root: $RepoRoot"
Enable-RegistryLongPaths
Enable-GitLongPaths
Ensure-ShortPathJunction
Invoke-OptionalChecks

Write-Step "Done. If registry was changed now, restart Windows before running heavy native builds."
